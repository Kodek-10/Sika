/**
 * Contrats d'entrée/sortie du moteur de scoring Sika.
 *
 * Principe fort (ADR-0002, INV-005) : le moteur est PUR et DÉTERMINISTE.
 * Il n'accède jamais à la base de données ni au réseau — toutes les données
 * arrivent en paramètres depuis `apps/backend/`, y compris la fourchette de
 * rendement attendu déjà calculée par `yield-model/` (Dev 3).
 */

/** Types d'alerte — exclusifs (BR-001, BR-002). Jamais d'autre valeur. */
export type AlertType = "maintenance" | "sur_declaration";

export type AlertSeverity = "low" | "medium" | "high";

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  /** Détail lisible destiné à l'agent / IMF / MMPE (FR-010). */
  detail: string;
}

/** Déclaration soumise (FR-001) + relevé associé (FR-002), 1-1. */
export interface DeclarationInput {
  substrate: string;
  quantityKg: number;
  durationHours: number;
  /** Lecture du compteur à bulles en m³ sur la durée déclarée. */
  meterReadingM3: number;
}

/**
 * Fourchette de rendement ATTENDU pour cette déclaration précise —
 * déjà calculée par le backend via `estimateExpectedYield()`
 * (quantité × rendement/kg × coefficient climatique). Le moteur ne
 * connaît pas les coefficients, seulement la fourchette résultante.
 */
export interface ExpectedYield {
  minM3: number;
  maxM3: number;
}

/** Historique des déclarations précédentes du producteur (plus récent en dernier). */
export interface HistoryPoint {
  quantityKg: number;
  meterReadingM3: number;
}

/** Qualité de la preuve fournie par le module anti-fraude du backend. */
export interface ProofQuality {
  photoCapturedInApp: boolean; // FRB-001 — jamais importée
  geoLocationPresent: boolean; // INV-002
  timestampPlausible: boolean; // INV-002 — pas dans le futur, pas trop ancienne
}

/** Décomposition des quatre signaux (FR-003), chacun sur 0-100. */
export interface Signals {
  signal_intrant_extrant: number;
  signal_temporel: number;
  signal_capacite: number;
  signal_preuve: number;
}

export interface ScoreResult {
  /** Score de confiance final, entier 0-100. */
  score: number;
  signals: Signals;
  alerts: Alert[];
}
