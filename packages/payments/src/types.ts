/**
 * Contrats du module de paiement Sika (FR-007).
 *
 * Principe fort (docs/architecture/architecture-systeme.md §5) : ce module
 * **ne décide jamais de l'éligibilité** et **ne recalcule jamais un score**.
 * Il reçoit une intention de versement déjà autorisée par BR-003 et se charge
 * uniquement de la faire aboutir chez l'opérateur, proprement et une seule fois.
 *
 * Comme `packages/scoring-engine/`, ce package est PUR : aucun accès base,
 * aucune dépendance NestJS. La persistance est l'affaire de `apps/backend/`.
 */

/** Statut canonique côté Sika — voir `payments.status` au dictionnaire de données. */
export type PaymentStatus = 'initiated' | 'completed' | 'failed';

/**
 * Statut brut renvoyé par l'opérateur. Le vocabulaire varie d'un fournisseur
 * à l'autre : chaque adaptateur normalise vers ces trois valeurs avant de
 * sortir du module (guide-connecteur §3, « cartographie »).
 */
export type ProviderStatus = 'success' | 'pending' | 'failed';

export interface PayoutRequest {
  producerId: string;
  /** Destinataire du versement — au format international (+225...). */
  phoneNumber: string;
  amountFcfa: number;
  /**
   * Clé d'idempotence transmise à l'opérateur quand son API le permet.
   * C'est elle qui garantit qu'un double clic ou un retry automatique ne
   * déclenche pas deux versements distincts.
   */
  idempotencyKey: string;
}

export interface PayoutAcknowledgement {
  providerStatus: ProviderStatus;
  /** Référence de transaction de l'opérateur — reportée dans `payments.transaction_ref`. */
  transactionRef: string;
  /** Renseigné uniquement si `providerStatus === 'failed'`. */
  failureDetail?: string;
}

/**
 * Adaptateur d'opérateur Mobile Money.
 *
 * Un opérateur réel (Orange Money, MTN MoMo, Wave…) s'intègre en implémentant
 * cette interface — le reste du système n'a pas à changer.
 */
export interface MobileMoneyProvider {
  /** Nom de l'opérateur, journalisé pour la traçabilité (jamais le numéro). */
  readonly name: string;
  sendPayout(request: PayoutRequest): Promise<PayoutAcknowledgement>;
}

/**
 * L'opérateur est injoignable ou a répondu de façon inexploitable.
 *
 * Distinct d'un versement refusé : ici on ne SAIT PAS si l'argent est parti.
 * D'où la règle de quarantaine (guide-connecteur §3) : jamais de relance
 * automatique silencieuse sur un paiement — reprise manuelle uniquement.
 */
export class PaymentProviderUnavailableError extends Error {
  readonly code = 'ERR-502-PAYMENT-PROVIDER-UNAVAILABLE';

  constructor(
    readonly providerName: string,
    readonly cause?: unknown,
  ) {
    super(`Opérateur Mobile Money « ${providerName} » indisponible`);
    this.name = 'PaymentProviderUnavailableError';
  }
}

/**
 * Cartographie opérateur → statut canonique (guide-connecteur §3).
 *
 * `pending` reste `initiated` côté Sika : le statut ne passe à `completed`
 * qu'après confirmation EXPLICITE de l'opérateur, jamais de façon optimiste
 * dès l'envoi de la requête (règle du « checkpoint »).
 */
export function toPaymentStatus(providerStatus: ProviderStatus): PaymentStatus {
  switch (providerStatus) {
    case 'success':
      return 'completed';
    case 'pending':
      return 'initiated';
    case 'failed':
      return 'failed';
  }
}
