/**
 * ⚠️ CONSTANTES PROVISOIRES — en attente de ratification inter-devs
 * (D1-D3, voir Décisions inter-devs / DECISIONS-DEV2.md).
 *
 * Isolées ici volontairement : un accord inter-devs = une ligne à changer,
 * zéro refactor. Consommateurs prévus : GET /producers/:id/score (D1, D2)
 * et POST /payments/payout (D1, D3 — Dev 2).
 */

/** D1 — Seuil BR-003 d'éligibilité au payout. Reco : 70/100 (en discussion avec Dev 2). */
export const SEUIL_ELIGIBILITE_BR003 = 70;

/** D2 — Démarrage à froid : nombre minimal de déclarations avant éligibilité. Reco : 3. */
export const MIN_DECLARATIONS_ELIGIBILITE = 3;

/** D3 — Une alerte `maintenance` bloque-t-elle l'éligibilité ? Reco : NON (seule sur_declaration bloque). */
export const MAINTENANCE_ALERT_BLOQUANTE = false;
