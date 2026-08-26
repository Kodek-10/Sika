/**
 * Point d'entrée du moteur de scoring Sika.
 * Consommateurs : `apps/backend/src/scoring/` (Dev 1).
 * Le sous-dossier `yield-model/` (Dev 3) n'est PAS exposé ici — le backend
 * l'appelle séparément et passe la fourchette résultante au moteur.
 */

export {
  computeConfidenceScore,
  signalCapacite,
  signalIntrantExtrant,
  signalPreuve,
  signalTemporel,
  SEUIL_SUR_DECLARATION,
  TOLERANCE,
} from "./engine";

export type {
  Alert,
  AlertSeverity,
  AlertType,
  DeclarationInput,
  ExpectedYield,
  HistoryPoint,
  ProofQuality,
  ScoreResult,
  Signals,
} from "./types";
