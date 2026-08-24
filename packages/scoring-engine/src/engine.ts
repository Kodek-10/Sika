/**
 * Moteur de scoring de cohérence Sika (FR-003).
 *
 * Garanties implémentées ici :
 * - INV-005 : déterminisme total — mêmes entrées ⇒ même sortie, aucun aléatoire,
 *   aucun accès réseau/base (tout arrive en paramètres).
 * - BR-001 / INV-003 : une lecture SOUS la fourchette déclenche une alerte
 *   `maintenance` mais ne dégrade JAMAIS le score au même cycle (il est
 *   physiquement plus facile de sous-produire que de sur-produire).
 * - BR-002 : une lecture au-dessus de +100 % de la borne haute déclenche une
 *   alerte `sur_declaration` et dégrade le score. Le seuil volontairement
 *   large (+100 %) filtre le bruit de mesure du compteur à bulles (±15-20 %).
 */

import type {
  Alert,
  DeclarationInput,
  ExpectedYield,
  HistoryPoint,
  ProofQuality,
  ScoreResult,
  Signals,
} from "./types";

/** Tolérance de mesure du compteur à bulles — ADR-0001. */
export const TOLERANCE = 0.15;

/** Seuil BR-002 : lecture > (+100 %) de la borne haute ⇒ sur-déclaration suspecte. */
export const SEUIL_SUR_DECLARATION = 1.0; // fraction au-dessus de maxM3

/** Poids des quatre signaux dans le score final (somme = 1). */
const POIDS = {
  intrant_extrant: 0.4,
  temporel: 0.2,
  capacite: 0.2,
  preuve: 0.2,
} as const;

function clamp(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur));
}

/**
 * Signal 1 — cohérence intrant/extrant : la lecture du compteur tombe-t-elle
 * dans la fourchette attendue (tolérance ±15 % incluse) ?
 */
export function signalIntrantExtrant(
  lecture: number,
  attendu: ExpectedYield,
  alerts: Alert[],
): number {
  const borneBasse = attendu.minM3 * (1 - TOLERANCE);
  const borneHaute = attendu.maxM3 * (1 + TOLERANCE);

  // BR-001 : sous-performance ≠ fraude. Alerte oui, sanction non (INV-003).
  // Le signal reste à 100 pour ne pas dégrader le score au même cycle.
  if (lecture < borneBasse) {
    alerts.push({
      type: "maintenance",
      severity: "medium",
      detail: `Lecture ${lecture.toFixed(3)} m³ sous la fourchette attendue (${borneBasse.toFixed(3)} – ${borneHaute.toFixed(3)} m³) — entretien probable, score non affecté.`,
    });
    return 100;
  }

  if (lecture <= borneHaute) {
    return 100;
  }

  // Au-dessus de la tolérance : pénalité progressive avec l'excès.
  const exces = (lecture - attendu.maxM3) / attendu.maxM3;
  if (exces <= SEUIL_SUR_DECLARATION) {
    // Zone grise entre +15 % et +100 % : suspicion douce, PAS d'alerte —
    // le seuil large de BR-002 ne doit détecter que les écarts flagrants.
    return Math.round(100 - 60 * ((exces - TOLERANCE) / (SEUIL_SUR_DECLARATION - TOLERANCE)));
  }

  // BR-002 : dépassement flagrant (> +100 %).
  alerts.push({
    type: "sur_declaration",
    severity: "high",
    detail: `Lecture ${lecture.toFixed(3)} m³ soit +${Math.round(exces * 100)} % au-dessus de la borne haute attendue (${attendu.maxM3.toFixed(3)} m³) — priorité d'audit.`,
  });
  return Math.round(Math.max(0, 40 - 40 * clamp(exces - SEUIL_SUR_DECLARATION, 0, 1)));
}

/**
 * Signal 2 — cohérence temporelle : stabilité des quantités déclarées
 * dans le temps (déclaration courante incluse). Historique vide ou court ⇒
 * neutre (100) : on ne juge pas sans données.
 */
export function signalTemporel(historiqueAvecCourante: number[]): number {
  if (historiqueAvecCourante.length < 2) {
    return 100;
  }
  const moyenne =
    historiqueAvecCourante.reduce((s, q) => s + q, 0) / historiqueAvecCourante.length;
  if (moyenne === 0) {
    return 100;
  }
  const variance =
    historiqueAvecCourante.reduce((s, q) => s + (q - moyenne) ** 2, 0) /
    historiqueAvecCourante.length;
  const cv = Math.sqrt(variance) / moyenne; // coefficient de variation

  // cv ≤ 0,30 : stable → 100 ; décroissance linéaire jusqu'à 40 à cv ≥ 1,5.
  return Math.round(clamp(100 - (cv - 0.3) * 50, 40, 100));
}

/**
 * Signal 3 — cohérence avec la capacité : la production déclarée est-elle
 * plausible pour l'installation ? Sur-déclaration par rapport à la capacité
 * pénalisée ; sous-production non pénalisée (cohérent avec BR-001).
 */
export function signalCapacite(declaration: DeclarationInput, capaciteKgParJour: number): number {
  if (capaciteKgParJour <= 0) {
    return 100; // capacité inconnue → neutre, jamais divisé par zéro
  }
  const kgParJour = (declaration.quantityKg / declaration.durationHours) * 24;
  const ratio = kgParJour / capaciteKgParJour;

  if (ratio <= 1.2) {
    return 100; // marge de 20 % autour de la capacité nominale
  }
  // Décroissance linéaire de 100 (ratio 1,2) à 0 (ratio 3).
  return Math.round(clamp(100 - (ratio - 1.2) * (100 / 1.8), 0, 100));
}

/**
 * Signal 4 — qualité de la preuve (module anti-fraude côté backend).
 * Photo importée = cœur du dispositif anti-fraude → pénalité forte (FRB-001).
 */
export function signalPreuve(preuve: ProofQuality): number {
  let valeur = 100;
  if (!preuve.photoCapturedInApp) valeur -= 40;
  if (!preuve.geoLocationPresent) valeur -= 30;
  if (!preuve.timestampPlausible) valeur -= 30;
  return Math.round(clamp(valeur, 0, 100));
}

/**
 * Calcule le score de confiance (0-100) et les alertes éventuelles.
 * Fonction pure — INV-005.
 *
 * @throws si les entrées sont structurellement invalides (fourchette incohérente,
 * lecture négative) : c'est un bug de l'appelant, on échoue bruyamment plutôt
 * que de produire un score silencieusement faux.
 */
export function computeConfidenceScore(input: {
  declaration: DeclarationInput;
  expectedYield: ExpectedYield;
  history?: HistoryPoint[];
  capacityKgPerDay?: number;
  proof: ProofQuality;
}): ScoreResult {
  const { declaration, expectedYield, proof } = input;

  if (
    !Number.isFinite(expectedYield.minM3) ||
    !Number.isFinite(expectedYield.maxM3) ||
    expectedYield.minM3 <= 0 ||
    expectedYield.maxM3 < expectedYield.minM3
  ) {
    throw new Error(
      `Fourchette de rendement invalide : [${expectedYield.minM3}, ${expectedYield.maxM3}]`,
    );
  }
  if (!Number.isFinite(declaration.meterReadingM3) || declaration.meterReadingM3 < 0) {
    throw new Error(`Lecture compteur invalide : ${declaration.meterReadingM3}`);
  }

  const alerts: Alert[] = [];

  const intrantExtrant = signalIntrantExtrant(declaration.meterReadingM3, expectedYield, alerts);

  const quantites = [
    ...(input.history ?? []).map((h) => h.quantityKg),
    declaration.quantityKg,
  ];
  const temporel = signalTemporel(quantites);

  const capacite = signalCapacite(declaration, input.capacityKgPerDay ?? 0);

  const preuve = signalPreuve(proof);

  const signals: Signals = {
    signal_intrant_extrant: intrantExtrant,
    signal_temporel: temporel,
    signal_capacite: capacite,
    signal_preuve: preuve,
  };

  const score = Math.round(
    POIDS.intrant_extrant * intrantExtrant +
      POIDS.temporel * temporel +
      POIDS.capacite * capacite +
      POIDS.preuve * preuve,
  );

  return { score: clamp(score, 0, 100), signals, alerts };
}
