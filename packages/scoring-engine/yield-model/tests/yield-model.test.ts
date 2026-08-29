import { estimateExpectedYield } from '../src/index'

const reference = {
  substrate: 'fientes_volaille',
  min_m3_per_kg: 0.050,
  max_m3_per_kg: 0.090,
  reliability: 'basse' as const,
  source: 'PROVISOIRE',
  climate_coefficient_sud: 1.00,
  climate_coefficient_nord: 1.10,
}

describe('estimateExpectedYield', () => {
  it('calcule la fourchette en zone sud', () => {
    const result = estimateExpectedYield('fientes_volaille', 100, 'sud', reference)
    expect(result.minM3).toBeCloseTo(5)   // 0.050 * 100 * 1.00
    expect(result.maxM3).toBeCloseTo(9)   // 0.090 * 100 * 1.00
    expect(result.reliability).toBe('basse')
  })

  it('applique le coefficient nord', () => {
    const result = estimateExpectedYield('fientes_volaille', 100, 'nord', reference)
    expect(result.minM3).toBeCloseTo(5.5)  // 0.050 * 100 * 1.10
    expect(result.maxM3).toBeCloseTo(9.9)  // 0.090 * 100 * 1.10
  })

  it('retourne la fiabilité du référentiel', () => {
    const result = estimateExpectedYield('fientes_volaille', 50, 'sud', reference)
    expect(result.reliability).toBe('basse')
  })

  it('échelle linéaire avec la quantité', () => {
    const result50 = estimateExpectedYield('fientes_volaille', 50, 'sud', reference)
    const result100 = estimateExpectedYield('fientes_volaille', 100, 'sud', reference)
    expect(result100.minM3).toBe(result50.minM3 * 2)
    expect(result100.maxM3).toBe(result50.maxM3 * 2)
  })
})