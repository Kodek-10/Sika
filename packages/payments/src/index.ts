/**
 * Point d'entrée du module de paiement Sika (Dev 2).
 * Consommateur : `apps/backend/src/payments/`.
 *
 * Ce package ne décide jamais de l'éligibilité (BR-003) et ne recalcule
 * jamais un score : il consomme la décision de `GET /producers/:id/score`.
 */

export {
  FENETRE_IDEMPOTENCE_MINUTES,
  derivePayoutIdempotencyKey,
  deriveLocalTransactionRef,
} from './idempotency';

export { SimulatedMobileMoneyProvider } from './simulated-provider';
export type { SimulatedProviderOptions } from './simulated-provider';

export { PaymentProviderUnavailableError, toPaymentStatus } from './types';
export type {
  MobileMoneyProvider,
  PaymentStatus,
  PayoutAcknowledgement,
  PayoutRequest,
  ProviderStatus,
} from './types';
