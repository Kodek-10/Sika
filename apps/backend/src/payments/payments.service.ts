import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentProviderUnavailableError,
  derivePayoutIdempotencyKey,
  toPaymentStatus,
  type MobileMoneyProvider,
  type PaymentStatus,
} from '@sika/payments';
import { DatabaseService } from '../db/database.service';
import { ScoringService } from '../scoring/scoring.service';
import { CreatePayoutDto } from './dto/create-payout.dto';

/** Jeton d'injection de l'opérateur — permet de substituer le simulateur en test/démo. */
export const MOBILE_MONEY_PROVIDER = Symbol('MOBILE_MONEY_PROVIDER');

export interface PayoutResult {
  status: PaymentStatus;
  transactionRef: string | null;
  /** `true` quand la requête a été reconnue comme un rejeu, sans nouveau versement. */
  alreadyProcessed: boolean;
}

interface PaymentRow {
  id: string;
  status: PaymentStatus;
  transaction_ref: string | null;
}

interface ProducerContactRow {
  phone_number: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private db: DatabaseService,
    private scoring: ScoringService,
    @Inject(MOBILE_MONEY_PROVIDER) private provider: MobileMoneyProvider,
  ) {}

  /**
   * FR-007 — déclenche un versement d'incitation.
   *
   * Séquence, dans cet ordre précis :
   *   1. idempotence  — un rejeu ne verse jamais deux fois
   *   2. BR-003       — éligibilité LUE depuis le scoring, jamais recalculée
   *   3. réservation  — la ligne `payments` est posée AVANT l'appel opérateur
   *   4. appel        — l'opérateur est sollicité une seule fois
   *   5. checkpoint   — `completed` seulement sur confirmation explicite
   *
   * L'étape 3 est ce qui rend l'ensemble sûr : si le processus meurt pendant
   * l'appel opérateur, la trace existe déjà et la clé d'idempotence bloque
   * toute seconde tentative automatique. Un versement dont on ignore l'issue
   * doit être repris à la main (guide-connecteur §3, quarantaine).
   */
  async payout(dto: CreatePayoutDto, initiatedBy: string): Promise<PayoutResult> {
    const idempotencyKey =
      dto.idempotencyKey ??
      derivePayoutIdempotencyKey(dto.producerId, dto.amountFcfa, new Date());

    const dejaTraite = await this.findByIdempotencyKey(idempotencyKey);
    if (dejaTraite) {
      return {
        status: dejaTraite.status,
        transactionRef: dejaTraite.transaction_ref,
        alreadyProcessed: true,
      };
    }

    const contact = await this.loadContact(dto.producerId);
    await this.verifierEligibilite(dto.producerId);

    // Réservation : la ligne existe avant tout appel externe.
    const paymentId = await this.reserver(dto, idempotencyKey, initiatedBy);
    if (paymentId === null) {
      // Course : une requête concurrente a posé la même clé entre-temps.
      const concurrent = await this.findByIdempotencyKey(idempotencyKey);
      if (concurrent) {
        return {
          status: concurrent.status,
          transactionRef: concurrent.transaction_ref,
          alreadyProcessed: true,
        };
      }
      throw new ConflictException({
        message: 'Versement déjà en cours pour cette intention',
        error: 'ERR-409-PAYOUT-IN-PROGRESS',
      });
    }

    try {
      const ack = await this.provider.sendPayout({
        producerId: dto.producerId,
        phoneNumber: contact.phone_number,
        amountFcfa: dto.amountFcfa,
        idempotencyKey,
      });

      const status = toPaymentStatus(ack.providerStatus);
      await this.db.query(
        `UPDATE payments
            SET status = $2,
                transaction_ref = $3,
                failure_detail = $4,
                completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
          WHERE id = $1`,
        [paymentId, status, ack.transactionRef, ack.failureDetail ?? null],
      );

      return { status, transactionRef: ack.transactionRef, alreadyProcessed: false };
    } catch (error) {
      if (error instanceof PaymentProviderUnavailableError) {
        // Quarantaine : on conserve la raison, sans jamais relancer tout seul —
        // on ne sait pas si l'argent est parti.
        await this.db.query(
          `UPDATE payments SET status = 'failed', failure_detail = $2 WHERE id = $1`,
          [paymentId, `Opérateur indisponible (${error.providerName})`],
        );
        throw new BadGatewayException({
          statusCode: 502,
          error: 'ERR-502-PAYMENT-PROVIDER-UNAVAILABLE',
        });
      }
      await this.db.query(
        `UPDATE payments SET status = 'failed', failure_detail = $2 WHERE id = $1`,
        [paymentId, 'Erreur inattendue lors de l’appel opérateur'],
      );
      throw error;
    }
  }

  /** FR-005 — historique des versements d'un producteur (vue IMF/MMPE). */
  async findByProducer(producerId: string) {
    const { rows } = await this.db.query<{
      id: string;
      amount_fcfa: string;
      status: PaymentStatus;
      transaction_ref: string | null;
      failure_detail: string | null;
      created_at: Date;
      completed_at: Date | null;
    }>(
      `SELECT id, amount_fcfa, status, transaction_ref, failure_detail,
              created_at, completed_at
         FROM payments
        WHERE producer_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [producerId],
    );
    return rows.map((r) => ({
      paymentId: r.id,
      amountFcfa: Number(r.amount_fcfa),
      status: r.status,
      transactionRef: r.transaction_ref,
      failureDetail: r.failure_detail,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    }));
  }

  /**
   * BR-003 — l'éligibilité est LUE depuis le scoring, jamais recalculée ici
   * (docs/architecture/architecture-systeme.md §5). Le message de refus
   * reprend le motif exact pour que l'agent puisse l'expliquer au producteur.
   */
  private async verifierEligibilite(producerId: string): Promise<void> {
    const vue = await this.scoring.getProducerScore(producerId);
    if (vue.eligibleForPayout) return;

    throw new ConflictException({
      statusCode: 409,
      error: 'ERR-409-PRODUCER-NOT-ELIGIBLE',
      message: this.motifDeRefus(vue),
    });
  }

  private motifDeRefus(vue: Awaited<ReturnType<ScoringService['getProducerScore']>>): string {
    if (vue.currentScore === null) {
      return 'Aucun score calculé : le producteur doit d’abord déclarer sa production';
    }
    if (vue.eligibility.blockingAlerts.length > 0) {
      return `Alerte non résolue à vérifier avant versement : ${vue.eligibility.blockingAlerts.join(', ')}`;
    }
    if (vue.eligibility.declarationCount < vue.eligibility.minDeclarations) {
      return `Historique insuffisant : ${vue.eligibility.declarationCount} déclaration(s) sur ${vue.eligibility.minDeclarations} requises`;
    }
    return `Score ${vue.currentScore} en dessous du seuil d’éligibilité (${vue.eligibility.threshold})`;
  }

  private async findByIdempotencyKey(key: string): Promise<PaymentRow | null> {
    const { rows } = await this.db.query<PaymentRow>(
      'SELECT id, status, transaction_ref FROM payments WHERE idempotency_key = $1',
      [key],
    );
    return rows[0] ?? null;
  }

  private async loadContact(producerId: string): Promise<ProducerContactRow> {
    const { rows } = await this.db.query<ProducerContactRow>(
      'SELECT phone_number FROM producers WHERE id = $1',
      [producerId],
    );
    if (rows.length === 0) {
      throw new NotFoundException({
        message: 'Producteur inexistant',
        error: 'ERR-404-PRODUCER-NOT-FOUND',
      });
    }
    return rows[0];
  }

  /** Renvoie l'id du paiement réservé, ou `null` si la clé est déjà prise. */
  private async reserver(
    dto: CreatePayoutDto,
    idempotencyKey: string,
    initiatedBy: string,
  ): Promise<string | null> {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO payments
         (producer_id, amount_fcfa, status, idempotency_key, initiated_by)
       VALUES ($1, $2, 'initiated', $3, $4)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [dto.producerId, dto.amountFcfa, idempotencyKey, initiatedBy],
    );
    return rows[0]?.id ?? null;
  }
}
