import { Injectable, NotFoundException } from '@nestjs/common';
import {
  computeConfidenceScore,
  type Alert,
  type DeclarationInput,
  type HistoryPoint,
  type ProofQuality,
  type ScoreResult,
} from '@sika/scoring-engine';
import type { QueryResult, QueryResultRow } from 'pg';
import { DatabaseService } from '../db/database.service';
import {
  MAINTENANCE_ALERT_BLOQUANTE,
  MIN_DECLARATIONS_ELIGIBILITE,
  SEUIL_ELIGIBILITE_BR003,
} from './scoring.constants';
import { YieldModelAdapter } from './yield-model.adapter';

interface ProducerRow {
  capacity_declared: string;
  climate_zone: 'sud' | 'nord';
}

interface HistoryRow {
  quantity_kg: string;
  value_m3: string;
}

/** Signature de la fonction de requête fournie par `DatabaseService.withTransaction`. */
export type TxQuery = <R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) => Promise<QueryResult<R>>;

/** Fenêtre d'historique alimentant le signal temporel — bornée pour la démo. */
const TAILLE_HISTORIQUE_MAX = 20;

/** Plafond de sécurité de la liste d'alertes (pas de pagination au MVP). */
const ALERTES_MAX = 200;

interface AlertRow {
  id: string;
  producer_id: string;
  type: Alert['type'];
  severity: Alert['severity'];
  detail: string;
  detected_at: Date;
  resolved: boolean;
}

/** Valeurs acceptées par `GET /alerts?resolved=` — défaut : les actives seules. */
export type AlertResolvedFilter = 'false' | 'true' | 'all';

/** Forme de réponse conforme à docs/api/specification.md §GET /alerts. */
export interface AlertView {
  alertId: string;
  producerId: string;
  type: Alert['type'];
  severity: Alert['severity'];
  detectedAt: Date;
  detail: string;
  resolved: boolean;
}

/** Nombre de points d'historique renvoyés par `GET /producers/:id/score`. */
const HISTORIQUE_SCORE_MAX = 30;

/** Variation en dessous de laquelle la tendance est considérée comme stable. */
const SEUIL_TENDANCE = 3;

export type ScoreTrend = 'hausse' | 'stable' | 'baisse';

/**
 * Contrat de `GET /producers/:id/score` — **critique inter-devs**.
 * Consommé par `packages/payments/` (Dev 2) et `apps/dashboard/`.
 * Toute évolution de cette forme doit être annoncée (docs/api/README.md).
 */
export interface ProducerScoreView {
  producerId: string;
  currentScore: number | null;
  trend: ScoreTrend;
  eligibleForPayout: boolean;
  lastAlert: AlertView | null;
  history: { date: string; score: number }[];
  /**
   * Détail de l'arbitrage BR-003 — additif au contrat spec. Permet à Dev 2
   * d'expliquer un refus de versement plutôt que d'afficher un booléen muet,
   * et au jury de comprendre la règle en direct pendant la démo.
   */
  eligibility: {
    threshold: number;
    declarationCount: number;
    minDeclarations: number;
    blockingAlerts: Alert['type'][];
  };
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
    const result = await this.computeForDeclaration(producerId, declaration, proof);
    await this.db.withTransaction((query) => this.persistWithin(query, producerId, result));
    return result;
  }

  /**
   * Phase de CALCUL seule : lectures + moteur pur, aucune écriture.
   *
   * Séparée de la persistance pour que `POST /declarations` puisse poser
   * déclaration + relevé + score + alertes dans UNE SEULE transaction. Sinon
   * un échec de scoring après insertion laisserait une déclaration orpheline,
   * jamais scorée — et l'idempotence la rendrait définitivement invisible.
   */
  async computeForDeclaration(
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
    // L'historique exclut naturellement la déclaration courante : elle n'est
    // pas encore insérée. Le moteur la rajoute lui-même au signal temporel.
    const history = await this.loadHistory(producerId);

    return computeConfidenceScore({
      declaration,
      expectedYield: { minM3: expectedYield.minM3, maxM3: expectedYield.maxM3 },
      history,
      capacityKgPerDay: Number(producer.capacity_declared),
      proof,
    });
  }

  /**
   * Liste des alertes, plus récentes d'abord (FR-004, FR-010).
   *
   * FR-010 parle des alertes ACTIVES : le défaut est donc `resolved = false`.
   * `?resolved=true` permet à l'IMF/MMPE de consulter l'historique traité,
   * `?resolved=all` de tout voir. Le défaut restrictif évite qu'une alerte
   * déjà traitée continue de polluer une priorisation d'audit.
   */
  async listAlerts(resolved: AlertResolvedFilter = 'false'): Promise<AlertView[]> {
    // Paramétré, jamais concaténé (SECURITY.md §4) : `null` = pas de filtre.
    const filtre = resolved === 'all' ? null : resolved === 'true';
    const { rows } = await this.db.query<AlertRow>(
      `SELECT id, producer_id, type, severity, detail, detected_at, resolved
         FROM alerts
        WHERE ($2::boolean IS NULL OR resolved = $2)
        ORDER BY detected_at DESC
        LIMIT $1`,
      [ALERTES_MAX, filtre],
    );
    return rows.map((r) => ({
      alertId: r.id,
      producerId: r.producer_id,
      type: r.type,
      severity: r.severity,
      detectedAt: r.detected_at,
      detail: r.detail,
      resolved: r.resolved,
    }));
  }

  /**
   * Marque une alerte comme traitée (prérequis BR-003 : l'éligibilité au
   * versement exige « aucune alerte non résolue » — sans ce point d'entrée,
   * la règle serait mécaniquement inapplicable).
   *
   * Idempotent : résoudre deux fois renvoie le même résultat, jamais une erreur.
   */
  async resolveAlert(alertId: string): Promise<AlertView> {
    const { rows } = await this.db.query<AlertRow>(
      `UPDATE alerts
          SET resolved = true
        WHERE id = $1
        RETURNING id, producer_id, type, severity, detail, detected_at, resolved`,
      [alertId],
    );
    if (rows.length === 0) {
      throw new NotFoundException({
        message: 'Alerte inexistante',
        error: 'ERR-404-ALERT-NOT-FOUND',
      });
    }
    const r = rows[0];
    return {
      alertId: r.id,
      producerId: r.producer_id,
      type: r.type,
      severity: r.severity,
      detectedAt: r.detected_at,
      detail: r.detail,
      resolved: r.resolved,
    };
  }

  /**
   * Alertes non résolues d'un producteur — consommé par l'éligibilité BR-003
   * (`GET /producers/:id/score`). Renvoie les types présents, pas le détail :
   * l'appelant a seulement besoin de savoir CE QUI bloque.
   */
  async unresolvedAlertTypes(producerId: string): Promise<Alert['type'][]> {
    const { rows } = await this.db.query<{ type: Alert['type'] }>(
      `SELECT DISTINCT type FROM alerts WHERE producer_id = $1 AND resolved = false`,
      [producerId],
    );
    return rows.map((r) => r.type);
  }

  /**
   * FR-005 + prérequis FR-007 : score courant, tendance et éligibilité BR-003.
   *
   * C'est le SEUL endroit où l'éligibilité au versement est décidée —
   * `packages/payments/` la consomme, ne la recalcule jamais
   * (docs/architecture/architecture-systeme.md §5).
   */
  async getProducerScore(producerId: string): Promise<ProducerScoreView> {
    await this.loadProducer(producerId); // 404 si inconnu

    const { rows: scores } = await this.db.query<{ value: string; computed_at: Date }>(
      `SELECT value, computed_at FROM scores
        WHERE producer_id = $1
        ORDER BY computed_at DESC
        LIMIT $2`,
      [producerId, HISTORIQUE_SCORE_MAX],
    );

    const { rows: comptage } = await this.db.query<{ total: string }>(
      'SELECT count(*) AS total FROM declarations WHERE producer_id = $1',
      [producerId],
    );
    const declarationCount = Number(comptage[0]?.total ?? 0);

    const alertesActives = await this.unresolvedAlertTypes(producerId);
    const lastAlert = await this.lastAlert(producerId);

    const currentScore = scores.length > 0 ? Number(scores[0].value) : null;
    const previousScore = scores.length > 1 ? Number(scores[1].value) : null;

    // Bloquantes : `sur_declaration` toujours ; `maintenance` seulement si D3
    // le décide — par défaut NON, cohérent avec BR-001 (sous-performance ≠ fraude).
    const blockingAlerts = alertesActives.filter(
      (type) => type === 'sur_declaration' || MAINTENANCE_ALERT_BLOQUANTE,
    );

    return {
      producerId,
      currentScore,
      trend: this.tendance(currentScore, previousScore),
      eligibleForPayout:
        currentScore !== null &&
        currentScore >= SEUIL_ELIGIBILITE_BR003 &&
        declarationCount >= MIN_DECLARATIONS_ELIGIBILITE &&
        blockingAlerts.length === 0,
      lastAlert,
      history: scores
        .map((r) => ({
          date: r.computed_at.toISOString().slice(0, 10),
          score: Number(r.value),
        }))
        .reverse(),
      eligibility: {
        threshold: SEUIL_ELIGIBILITE_BR003,
        declarationCount,
        minDeclarations: MIN_DECLARATIONS_ELIGIBILITE,
        blockingAlerts,
      },
    };
  }

  private tendance(courant: number | null, precedent: number | null): ScoreTrend {
    if (courant === null || precedent === null) return 'stable';
    const delta = courant - precedent;
    if (delta > SEUIL_TENDANCE) return 'hausse';
    if (delta < -SEUIL_TENDANCE) return 'baisse';
    return 'stable';
  }

  private async lastAlert(producerId: string): Promise<AlertView | null> {
    const { rows } = await this.db.query<AlertRow>(
      `SELECT id, producer_id, type, severity, detail, detected_at, resolved
         FROM alerts WHERE producer_id = $1
        ORDER BY detected_at DESC LIMIT 1`,
      [producerId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      alertId: r.id,
      producerId: r.producer_id,
      type: r.type,
      severity: r.severity,
      detectedAt: r.detected_at,
      detail: r.detail,
      resolved: r.resolved,
    };
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
      `SELECT d.quantity_kg, mr.value_m3
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
        meterReadingM3: Number(r.value_m3),
      }))
      .reverse();
  }

  /**
   * Écrit score + alertes DANS la transaction fournie par l'appelant.
   * Jamais un score sans ses alertes, jamais une déclaration sans son score.
   */
  async persistWithin(
    query: TxQuery,
    producerId: string,
    result: ScoreResult,
  ): Promise<void> {
    {
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
    }
  }
}
