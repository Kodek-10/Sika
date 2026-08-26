import { deriveLocalTransactionRef } from './idempotency';
import {
  PaymentProviderUnavailableError,
  type MobileMoneyProvider,
  type PayoutAcknowledgement,
  type PayoutRequest,
} from './types';

/**
 * Opérateur Mobile Money SIMULÉ — pour la démo de sélection SIREXE.
 *
 * ⚠️ Aucun argent ne circule. L'intégration réelle avec un opérateur est
 * explicitement hors périmètre du MVP hackathon (PROJECT_OVERVIEW.md §4) et
 * la conformité BCEAO/UEMOA n'a été vérifiée qu'en grandes lignes
 * (SECURITY.md §5). Ce point doit être dit au jury, pas contourné (BR-004).
 *
 * Deux exigences de conception :
 *  1. DÉTERMINISME — même intention ⇒ même référence de transaction, comme
 *     le moteur de scoring (INV-005). Une démo qui produit un résultat
 *     différent à chaque exécution n'est pas démontrable.
 *  2. Le chemin d'ÉCHEC doit être jouable à la demande : le scénario MVP
 *     prévoit de montrer le comportement en cas d'opérateur indisponible.
 */

export interface SimulatedProviderOptions {
  /**
   * Force le comportement du prochain appel. `disponible` par défaut.
   * `indisponible` lève une PaymentProviderUnavailableError (→ 502),
   * `refus` renvoie un acquittement en échec (→ payment `failed`).
   */
  comportement?: 'disponible' | 'indisponible' | 'refus';
  /** Simule une confirmation différée de l'opérateur (statut `pending`). */
  confirmationDifferee?: boolean;
}

export class SimulatedMobileMoneyProvider implements MobileMoneyProvider {
  readonly name = 'simulateur-sika';

  constructor(private readonly options: SimulatedProviderOptions = {}) {}

  async sendPayout(request: PayoutRequest): Promise<PayoutAcknowledgement> {
    const comportement = this.options.comportement ?? 'disponible';

    if (comportement === 'indisponible') {
      throw new PaymentProviderUnavailableError(this.name);
    }

    if (comportement === 'refus') {
      return {
        providerStatus: 'failed',
        transactionRef: deriveLocalTransactionRef(request.idempotencyKey),
        failureDetail: 'Versement refusé par l’opérateur (simulation)',
      };
    }

    return {
      providerStatus: this.options.confirmationDifferee ? 'pending' : 'success',
      transactionRef: deriveLocalTransactionRef(request.idempotencyKey),
    };
  }
}
