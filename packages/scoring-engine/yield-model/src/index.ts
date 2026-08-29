export interface YieldEstimate {
  substrate: string;
  minM3: number;
  maxM3: number;
  reliability: 'haute' | 'moyenne' | 'basse';
  climateZone: 'sud' | 'nord';
  climateCoefficient: number;
  source: string;
}

export interface YieldReferenceRow {
  substrate: string;
  min_m3_per_kg: number;
  max_m3_per_kg: number;
  reliability: 'haute' | 'moyenne' | 'basse';
  source: string;
  climate_coefficient_sud: number;
  climate_coefficient_nord: number;
}

export interface EstimateYieldInput {
  substrate: string;
  quantityKg: number;
  climateZone: 'sud' | 'nord';
}

export function estimateExpectedYield(
  substrate: string,
  quantityKg: number,
  climateZone: 'sud' | 'nord',
  reference: YieldReferenceRow,
): { minM3: number; maxM3: number; reliability: 'haute' | 'moyenne' | 'basse' } {
  const coefficient = climateZone === 'nord'
    ? reference.climate_coefficient_nord
    : reference.climate_coefficient_sud;

  return {
    minM3: Number(reference.min_m3_per_kg) * quantityKg * coefficient,
    maxM3: Number(reference.max_m3_per_kg) * quantityKg * coefficient,
    reliability: reference.reliability,
  };
}