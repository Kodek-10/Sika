/**
 * Constantes BR-003 — ratifiées (D1-D3).
 *
 * Isolées ici volontairement : un accord inter-devs = une ligne à changer,
 * zéro refactor. Consommateurs : GET /producers/:id/score (D1, D2)
 * et POST /payments/payout (D1, D3 — Dev 2).
 *
 * Voir docs/adr/0004-criteres-eligibilite-versement.md.
 */

/** D1 — Seuil BR-003 d'éligibilité au payout, ratifié à 70/100. */
export const SEUIL_ELIGIBILITE_BR003 = 70;

/** D2 — Démarrage à froid : nombre minimal de déclarations avant éligibilité, ratifié à 3. */
export const MIN_DECLARATIONS_ELIGIBILITE = 3;

/** D3 — Une alerte `maintenance` bloque-t-elle l'éligibilité ? Ratifié : NON (seule sur_declaration bloque). */
export const MAINTENANCE_ALERT_BLOQUANTE = false;
