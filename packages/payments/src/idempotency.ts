import { createHash } from 'crypto';

/**
 * Idempotence des versements (guide-connecteur §3).
 *
 * Règle : « un `producer_id` + `amount_fcfa` + fenêtre temporelle donnée ne
 * doit pas déclencher deux versements distincts si la requête est renvoyée
 * par erreur (double clic, retry automatique) ».
 *
 * Un versement est l'opération la moins réversible du système : sur une erreur
 * d'argent, on préfère refuser un versement légitime (rattrapable à la main)
 * que d'en émettre deux (irrattrapable).
 */

/** Durée par défaut pendant laquelle deux intentions identiques sont confondues. */
export const FENETRE_IDEMPOTENCE_MINUTES = 60;

/**
 * Dérive une clé d'idempotence déterministe pour une intention de versement.
 *
 * ⚠️ Limite connue et assumée du découpage par fenêtre : deux requêtes qui
 * encadrent une frontière de fenêtre produisent deux clés différentes et
 * passeraient donc toutes les deux. C'est pourquoi cette clé n'est que le
 * SECOND filet : le premier est la clé d'idempotence explicite fournie par
 * l'appelant (`Idempotency-Key`), et le troisième est la contrainte d'unicité
 * en base. Voir `apps/backend/src/payments/`.
 *
 * @param at instant de la demande — injecté plutôt que lu de l'horloge, pour
 *           que la dérivation reste testable et déterministe.
 */
export function derivePayoutIdempotencyKey(
  producerId: string,
  amountFcfa: number,
  at: Date,
  fenetreMinutes: number = FENETRE_IDEMPOTENCE_MINUTES,
): string {
  const fenetreMs = fenetreMinutes * 60 * 1000;
  const indexFenetre = Math.floor(at.getTime() / fenetreMs);
  const empreinte = createHash('sha256')
    .update(`${producerId}|${amountFcfa}|${indexFenetre}`)
    .digest('hex');
  // Préfixe lisible : une clé qui traîne dans un log reste identifiable
  // comme telle sans révéler producteur ni montant.
  return `payout_${empreinte.slice(0, 32)}`;
}

/**
 * Génère une référence de transaction locale lisible, dérivée de la clé
 * d'idempotence — donc stable pour une même intention.
 */
export function deriveLocalTransactionRef(idempotencyKey: string): string {
  const empreinte = createHash('sha256').update(idempotencyKey).digest('hex');
  return `MM-${empreinte.slice(0, 12).toUpperCase()}`;
}
