import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { estimateExpectedYield, type YieldReferenceRow } from '@sika/yield-model';

export interface EstimatedYield {
  minM3: number;
  maxM3: number;
  reliability: 'haute' | 'moyenne' | 'basse';
}

/**
 * Adaptateur yield-model — pont vers `packages/scoring-engine/yield-model/`.
 *
 * Lit le référentiel `yield_reference` en base et délègue le calcul à
 * `estimateExpectedYield()`. Aucun coefficient n'est codé en dur ici
 * (règle du module) — tout vient du référentiel.
 */
@Injectable()
export class YieldModelAdapter {
  constructor(private db: DatabaseService) {}

  async estimateExpectedYield(
    substrate: string,
    quantityKg: number,
    climateZone: 'sud' | 'nord',
  ): Promise<EstimatedYield> {
    const { rows } = await this.db.query<YieldReferenceRow>(
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
    const result = estimateExpectedYield(
      substrate,
      quantityKg,
      climateZone,
      ref,
    );

    return {
      minM3: result.minM3,
      maxM3: result.maxM3,
      reliability: result.reliability,
    };
  }
}

/** Violation INV-004 / FRB-006 — mappée directement sur le code de contrat. */
class UnknownSubstrateError extends UnprocessableEntityException {
  constructor() {
    super({ statusCode: 422, error: 'ERR-422-UNKNOWN-SUBSTRATE' });
  }
}
