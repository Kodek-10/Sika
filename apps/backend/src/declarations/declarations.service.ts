import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DeclarationInput } from '@sika/scoring-engine';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import type { AuthenticatedUser } from '../auth/guards';
import { DatabaseService } from '../db/database.service';
import { ScoringService } from '../scoring/scoring.service';
import { CreateDeclarationDto } from './dto/create-declaration.dto';

/** Plafond de l'historique renvoyé par `GET /declarations/:producerId` (pas de pagination au MVP). */
const HISTORIQUE_MAX = 100;

export interface CreateDeclarationResult {
  declarationId: string;
  status: 'received' | 'already_received';
  scoreUpdated: boolean;
  alertTriggered: boolean;
}

interface DeclarationHistoryRow {
  id: string;
  substrate: string;
  quantity_kg: string;
  duration_hours: string;
  declared_at: Date;
  value_m3: string;
  captured_at: Date;
}

@Injectable()
export class DeclarationsService {
  constructor(
    private db: DatabaseService,
    private scoring: ScoringService,
    private antiFraud: AntiFraudService,
  ) {}

  /**
   * FR-001 + FR-002 : reçoit une déclaration et son relevé, calcule le score
   * (FR-003) et les alertes (FR-004) en une seule opération atomique.
   *
   * Séquence volontaire :
   *   1. idempotence   — un rejeu réseau ne crée jamais de doublon
   *   2. autorisation  — un producteur ne déclare que pour lui-même
   *   3. anti-fraude   — qualité de preuve évaluée côté serveur (INV-002)
   *   4. calcul        — lectures + moteur pur, aucune écriture (INV-005)
   *   5. UNE écriture  — déclaration + relevé + score + alertes, ou rien
   */
  async create(
    dto: CreateDeclarationDto,
    appelant: AuthenticatedUser,
  ): Promise<CreateDeclarationResult> {
    const dejaRecue = await this.findExisting(dto.declarationId);
    if (dejaRecue) {
      return dejaRecue;
    }

    this.verifierAutorisation(dto.producerId, appelant);

    const declaration: DeclarationInput = {
      substrate: dto.substrate,
      quantityKg: dto.quantityKg,
      durationHours: dto.durationHours,
      meterReadingM3: dto.meterReadingM3,
    };

    const capturedAt = new Date(dto.capturedAt);
    const proof = this.antiFraud.evaluateProof({
      photoUrl: dto.meterPhotoUrl,
      capturedAt,
      geoLat: dto.geoLocation.lat,
      geoLng: dto.geoLocation.lng,
    });

    // Lève ERR-404 (producteur inconnu) ou ERR-422 (substrat inconnu, INV-004)
    // AVANT toute écriture : rien n'est persisté si la déclaration est invalide.
    const result = await this.scoring.computeForDeclaration(
      dto.producerId,
      declaration,
      proof,
    );

    try {
      await this.db.withTransaction(async (query) => {
        await query(
          `INSERT INTO declarations (id, producer_id, substrate, quantity_kg, duration_hours)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            dto.declarationId,
            dto.producerId,
            dto.substrate,
            dto.quantityKg,
            dto.durationHours,
          ],
        );
        await query(
          `INSERT INTO meter_readings
             (declaration_id, value_m3, photo_url, captured_at, geo_lat, geo_lng)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            dto.declarationId,
            dto.meterReadingM3,
            dto.meterPhotoUrl,
            capturedAt,
            dto.geoLocation.lat,
            dto.geoLocation.lng,
          ],
        );
        await this.scoring.persistWithin(query, dto.producerId, result);
      });
    } catch (error) {
      // Course entre deux synchronisations du même élément de file : l'autre
      // requête a gagné. L'idempotence prime — on renvoie son résultat.
      if (isUniqueViolation(error)) {
        const concurrente = await this.findExisting(dto.declarationId);
        if (concurrente) return concurrente;
      }
      if (isForeignKeyViolation(error, 'substrate')) {
        throw new UnknownSubstrateError();
      }
      throw error;
    }

    return {
      declarationId: dto.declarationId,
      status: 'received',
      scoreUpdated: true,
      alertTriggered: result.alerts.length > 0,
    };
  }

  /** FR-005 — historique déclaratif d'un producteur, plus récent d'abord. */
  async findByProducer(producerId: string, appelant: AuthenticatedUser) {
    this.verifierAutorisation(producerId, appelant);
    const { rows } = await this.db.query<DeclarationHistoryRow>(
      `SELECT d.id, d.substrate, d.quantity_kg, d.duration_hours, d.declared_at,
              mr.value_m3, mr.captured_at
         FROM declarations d
         JOIN meter_readings mr ON mr.declaration_id = d.id
        WHERE d.producer_id = $1
        ORDER BY d.declared_at DESC
        LIMIT $2`,
      [producerId, HISTORIQUE_MAX],
    );
    return rows.map((r) => ({
      declarationId: r.id,
      substrate: r.substrate,
      quantityKg: Number(r.quantity_kg),
      durationHours: Number(r.duration_hours),
      declaredAt: r.declared_at,
      meterReadingM3: Number(r.value_m3),
      capturedAt: r.captured_at,
    }));
  }

  /**
   * Idempotence (guide-connecteur §2) : le même identifiant client renvoyé
   * après une coupure réseau ne crée pas de doublon et obtient une réponse
   * équivalente à la première.
   */
  private async findExisting(
    declarationId: string,
  ): Promise<CreateDeclarationResult | null> {
    const { rows } = await this.db.query<{ id: string; alertes: string }>(
      `SELECT d.id,
              (SELECT count(*) FROM alerts a
                WHERE a.producer_id = d.producer_id
                  AND a.detected_at >= d.declared_at) AS alertes
         FROM declarations d
        WHERE d.id = $1`,
      [declarationId],
    );
    if (rows.length === 0) return null;
    return {
      declarationId: rows[0].id,
      status: 'already_received',
      scoreUpdated: false,
      alertTriggered: Number(rows[0].alertes) > 0,
    };
  }

  /**
   * FR-006 / FRB-008 : un `producteur` ne déclare et ne consulte que pour
   * lui-même. Vérifié côté serveur à partir du JWT, jamais d'après un champ
   * du corps de requête (SECURITY.md §4).
   */
  private verifierAutorisation(producerId: string, appelant: AuthenticatedUser): void {
    if (appelant.role !== 'producteur') return; // agent / imf / mmpe : filtrés par @Roles
    if (appelant.producerId !== producerId) {
      throw new ForbiddenException({
        message: 'Un producteur ne peut agir que sur ses propres déclarations',
        error: 'ERR-403-ROLE-FORBIDDEN',
      });
    }
  }
}

/** Violation INV-004 / FRB-006 — substrat absent du référentiel. */
class UnknownSubstrateError extends UnprocessableEntityException {
  constructor() {
    super({ statusCode: 422, error: 'ERR-422-UNKNOWN-SUBSTRATE' });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505';
}

function isForeignKeyViolation(error: unknown, colonne: string): boolean {
  const e = error as { code?: string; constraint?: string };
  return e?.code === '23503' && (e.constraint ?? '').includes(colonne);
}
