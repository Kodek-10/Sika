import { Injectable, NotFoundException } from '@nestjs/common';
import {
  computeConfidenceScore,
  type Alert,
  type DeclarationInput,
  type HistoryPoint,
  type ProofQuality,
  type ScoreResult,
} from '@sika/scoring-engine';
import { DatabaseService } from '../db/database.service';
import { YieldModelAdapter } from './yield-model.adapter';

interface ProducerRow {
  capacity_declared: string;
  climate_zone: 'sud' | 'nord';
}

interface HistoryRow {
  quantity_kg: string;
  meter_reading_m3: string;
}

/** Fenêtre d'historique alimentant le signal temporel — bornée pour la démo. */
const TAILLE_HISTORIQUE_MAX = 20;

/** Plafond de sécurité de la liste d'alertes (pas de pagination au MVP). */
const ALERTES_MAX = 200;

interface AlertRow {
  producer_id: string;
  type: Alert['type'];
  severity: Alert['severity'];
  detail: string;
  detected_at: Date;
}

/** Forme de réponse conforme à docs/api/specification.md §GET /alerts. */
export interface AlertView {
  producerId: string;
  type: Alert['type'];
  severity: Alert['severity'];
  detectedAt: Date;
  detail: string;
}

@Injectable()
export class ScoringService {
  constructor(
    private db: DatabaseService,
    private yieldModel: YieldModelAdapter,
  ) {}

  /**
   * Orchestration du score d'une déclaration (FR-003) :
   *   historique DB + fourchette yield-model → moteur PUR (INV-005)
   *   → persistance atomique scores + alerts.
   *
   * Appelé par `POST /declarations` (à venir) après validation de chaque
   * nouvelle déclaration. La preuve (`proof`) sera fournie par le module
   * anti-fraude (FRB-001) une fois D7/D9 actés ; en attendant l'appelant
   * passe les flags connus.
   */
  async scoreDeclaration(
    producerId: string,
    declaration: DeclarationInput,
    proof: ProofQuality,
  ): Promise<ScoreResult> {
    const producer = await this.loadProducer(producerId);
    const expectedYield = await this.yieldModel.estimateExpectedYield(
      declaration.substrate,
      declaration.quantityKg,
      producer.climate_zone,
    );
    const history = await this.loadHistory(producerId);

    const result = computeConfidenceScore({
      declaration,
      expectedYield: { minM3: expectedYield.minM3, maxM3: expectedYield.maxM3 },
      history,
      capacityKgPerDay: Number(producer.capacity_declared),
      proof,
    });

    await this.persist(producerId, result);
    return result;
  }

  /**
   * Liste des alertes, plus récentes d'abord (FR-004, FR-010).
   * Contrat exact de docs/api/specification.md §GET /alerts — pas de filtre
   * tant que le dashboard n'a pas exprimé le besoin (règle : contrat figé).
   */
  async listAlerts(): Promise<AlertView[]> {
    const { rows } = await this.db.query<AlertRow>(
      `SELECT producer_id, type, severity, detail, detected_at
         FROM alerts
        ORDER BY detected_at DESC
        LIMIT $1`,
      [ALERTES_MAX],
    );
    return rows.map((r) => ({
      producerId: r.producer_id,
      type: r.type,
      severity: r.severity,
      detectedAt: r.detected_at,
      detail: r.detail,
    }));
  }

  private async loadProducer(id: string): Promise<ProducerRow> {
    const { rows } = await this.db.query<ProducerRow>(
      'SELECT capacity_declared, climate_zone FROM producers WHERE id = $1',
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException({
        message: 'Producteur inexistant',
        error: 'ERR-404-PRODUCER-NOT-FOUND',
      });
    }
    return rows[0];
  }

  /** Déclarations précédentes du producteur, plus récent en dernier (contrat HistoryPoint). */
  private async loadHistory(producerId: string): Promise<HistoryPoint[]> {
    const { rows } = await this.db.query<HistoryRow>(
      `SELECT d.quantity_kg, mr.meter_reading_m3
         FROM declarations d
         JOIN meter_readings mr ON mr.declaration_id = d.id
        WHERE d.producer_id = $1
        ORDER BY d.declared_at DESC
        LIMIT $2`,
      [producerId, TAILLE_HISTORIQUE_MAX],
    );
    return rows
      .map((r) => ({
        quantityKg: Number(r.quantity_kg),
        meterReadingM3: Number(r.meter_reading_m3),
      }))
      .reverse();
  }

  /** Scores + alertes dans une seule transaction : jamais un score sans ses alertes. */
  private async persist(producerId: string, result: ScoreResult): Promise<void> {
    await this.db.withTransaction(async (query) => {
      await query(
        `INSERT INTO scores
           (producer_id, value,
            signal_intrant_extrant, signal_temporel, signal_capacite, signal_preuve)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          producerId,
          result.score,
          result.signals.signal_intrant_extrant,
          result.signals.signal_temporel,
          result.signals.signal_capacite,
          result.signals.signal_preuve,
        ],
      );

      for (const alert of result.alerts) {
        await query(
          'INSERT INTO alerts (producer_id, type, severity, detail) VALUES ($1, $2, $3, $4)',
          [producerId, alert.type, alert.severity, alert.detail],
        );
      }
    });
  }
}
