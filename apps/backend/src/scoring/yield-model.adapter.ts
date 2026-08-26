import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';

export interface EstimatedYield {
  minM3: number;
  maxM3: number;
  reliability: 'haute' | 'moyenne' | 'basse';
}

/**
 * Adaptateur yield-model — ⚠️ PROVISOIRE (D6, DECISIONS-DEV3.md).
 *
 * Implémente la signature proposée `estimateExpectedYield(substrate, quantityKg,
 * climateZone)` en lisant le référentiel `yield_reference` en base. Aucun
 * coefficient n'est hardcodé ici (règle du module) — tout vient du référentiel.
 *
 * Quand Dev 3 livre `packages/scoring-engine/yield-model/`, CE FICHIER SEUL est
 * remplacé par un pont vers son implémentation : le reste du backend ne connaît
 * que cette interface.
 */
@Injectable()
export class YieldModelAdapter {
  constructor(private db: DatabaseService) {}

  async estimateExpectedYield(
    substrate: string,
    quantityKg: number,
    climateZone: 'sud' | 'nord',
  ): Promise<EstimatedYield> {
    const { rows } = await this.db.query<{
      min_m3_per_kg: string;
      max_m3_per_kg: string;
      reliability: EstimatedYield['reliability'];
      climate_coefficient_sud: string;
      climate_coefficient_nord: string;
    }>(
      `SELECT min_m3_per_kg, max_m3_per_kg, reliability,
              climate_coefficient_sud, climate_coefficient_nord
         FROM yield_reference
        WHERE substrate = $1`,
      [substrate],
    );

    if (rows.length === 0) {
      throw new UnknownSubstrateError();
    }

    const ref = rows[0];
    const coefficient =
      climateZone === 'nord'
        ? Number(ref.climate_coefficient_nord)
        : Number(ref.climate_coefficient_sud);

    return {
      minM3: Number(ref.min_m3_per_kg) * quantityKg * coefficient,
      maxM3: Number(ref.max_m3_per_kg) * quantityKg * coefficient,
      reliability: ref.reliability,
    };
  }
}

/** Violation INV-004 / FRB-006 — mappée directement sur le code de contrat. */
class UnknownSubstrateError extends UnprocessableEntityException {
  constructor() {
    super({ statusCode: 422, error: 'ERR-422-UNKNOWN-SUBSTRATE' });
  }
}
