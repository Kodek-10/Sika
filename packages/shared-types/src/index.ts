// Types partagés entre apps/backend, apps/field-app et packages/*
// Règle : ajout libre, jamais de modification d'un type existant sans accord des 3 devs
// Voir docs/architecture/README.md et packages/shared-types/README.md
//
// Source de vérité pour les formes canoniques :
//   - dictionnaire-de-donnees.md (schéma DB)
//   - packages/scoring-engine/src/types.ts (moteur pur)
//   - packages/payments/src/types.ts (paiements)
//   - docs/api/specification.md (contrat HTTP)

// ──────────────────────────────────────────────────────────────
// Scores & alertes — miroir de packages/scoring-engine/src/types.ts
// Ne duplique pas la logique, seulement les formes.
// ──────────────────────────────────────────────────────────────

/** Types d'alerte — exclusifs (BR-001, BR-002). */
export type AlertType = 'maintenance' | 'sur_declaration';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  detail: string;
}

/** Déclaration soumise (FR-001) + relevé associé (FR-002), 1-1. */
export interface DeclarationInput {
  substrate: string;
  quantityKg: number;
  durationHours: number;
  meterReadingM3: number;
}

/** Fourchette de rendement attendu — calculée par yield-model. */
export interface ExpectedYield {
  minM3: number;
  maxM3: number;
}

export interface HistoryPoint {
  quantityKg: number;
  meterReadingM3: number;
}

export interface ProofQuality {
  photoCapturedInApp: boolean;
  geoLocationPresent: boolean;
  timestampPlausible: boolean;
}

export interface Signals {
  signal_intrant_extrant: number;
  signal_temporel: number;
  signal_capacite: number;
  signal_preuve: number;
}

export interface ScoreResult {
  score: number;
  signals: Signals;
  alerts: Alert[];
}

// ──────────────────────────────────────────────────────────────
// Rendement — miroir de packages/scoring-engine/yield-model
// ──────────────────────────────────────────────────────────────

export type ClimateZone = 'sud' | 'nord';

export interface YieldReferenceRow {
  substrate: string;
  min_m3_per_kg: number;
  max_m3_per_kg: number;
  reliability: 'haute' | 'moyenne' | 'basse';
  source: string;
  climate_coefficient_sud: number;
  climate_coefficient_nord: number;
}

// ──────────────────────────────────────────────────────────────
// Paiements — miroir de packages/payments/src/types.ts
// ──────────────────────────────────────────────────────────────

export type PaymentStatus = 'initiated' | 'completed' | 'failed';
export type ProviderStatus = 'success' | 'pending' | 'failed';

export interface PayoutRequest {
  producerId: string;
  phoneNumber: string;
  amountFcfa: number;
  idempotencyKey: string;
}

export interface PayoutAcknowledgement {
  providerStatus: ProviderStatus;
  transactionRef: string;
  failureDetail?: string;
}

export interface MobileMoneyProvider {
  readonly name: string;
  sendPayout(request: PayoutRequest): Promise<PayoutAcknowledgement>;
}

// ──────────────────────────────────────────────────────────────
// API / Domaine — formes échangées sur le réseau
// (specification.md + dictionnaire-de-donnees.md)
// ──────────────────────────────────────────────────────────────

export type ActivityType =
  | 'elevage_volaille'
  | 'elevage_bovin'
  | 'elevage_porcin'
  | 'restaurant_collectif';

export type UserRole = 'producteur' | 'agent' | 'imf' | 'mmpe';

export interface Producer {
  id: string;
  name: string;
  phoneNumber: string;
  activityType: ActivityType;
  capacityDeclared: number;
  zone: string;
  climateZone: ClimateZone;
  meterSerialNumber: string;
  createdAt: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface CreateDeclarationPayload {
  declarationId: string;
  producerId: string;
  substrate: string;
  quantityKg: number;
  durationHours: number;
  meterReadingM3: number;
  meterPhotoUrl: string;
  capturedAt: string;
  geoLocation: GeoLocation;
}

export interface CreateDeclarationResult {
  declarationId: string;
  status: 'received' | 'already_received';
  scoreUpdated: boolean;
  alertTriggered: boolean;
}

export interface PhotoUploadResult {
  photoUrl: string; // storage://photos/<uuid>.ext
}
