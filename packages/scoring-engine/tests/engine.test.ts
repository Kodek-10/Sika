/**
 * Tests du moteur de scoring — cas obligatoires de docs/test/README.md §3.
 * FRB-007 est le cas le plus sensible du projet : à ne JAMAIS retirer.
 */

import {
  computeConfidenceScore,
  signalCapacite,
  signalPreuve,
  signalTemporel,
} from "../src/engine";

// Jeu d'entrée de référence — fourchette arbitraire mais cohérente.
const BASE = {
  declaration: {
    substrate: "fientes_volaille",
    quantityKg: 3.5,
    durationHours: 24,
    meterReadingM3: 0.2, // au milieu de la fourchette
  },
  expectedYield: { minM3: 0.15, maxM3: 0.25 },
  history: [
    { quantityKg: 3.4, meterReadingM3: 0.19 },
    { quantityKg: 3.6, meterReadingM3: 0.21 },
  ],
  capacityKgPerDay: 30,
  proof: { photoCapturedInApp: true, geoLocationPresent: true, timestampPlausible: true },
};

describe("FRB-007 / BR-001 / INV-003 — sous-performance ≠ fraude", () => {
  it("une lecture sous la fourchette déclenche une alerte maintenance", () => {
    const resultat = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.05 }, // très sous la fourchette
    });

    expect(resultat.alerts).toHaveLength(1);
    expect(resultat.alerts[0]).toMatchObject({ type: "maintenance" });
    expect(resultat.alerts[0]?.detail).toContain("score non affecté");
  });

  it("la même lecture sous la fourchette NE FAIT PAS BAISSER le score", () => {
    const baseline = computeConfidenceScore(BASE); // lecture dans la fourchette
    const sousPerformance = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.05 },
    });

    // INV-003 : le score ne peut pas être dégradé par cet événement seul.
    expect(sousPerformance.score).toBe(baseline.score);
    expect(sousPerformance.signals.signal_intrant_extrant).toBe(100);
  });

  it("aucune alerte sur_declaration pour une sous-performance", () => {
    const resultat = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.01 },
    });
    expect(resultat.alerts.some((a) => a.type === "sur_declaration")).toBe(false);
  });
});

describe("BR-002 — seuil de sur-déclaration suspecte", () => {
  it("au-delà de +100 % de la borne haute : alerte sur_declaration + score dégradé", () => {
    const baseline = computeConfidenceScore(BASE);
    const resultat = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.55 }, // max*2 = 0,50 → +120 %
    });

    expect(resultat.alerts.some((a) => a.type === "sur_declaration")).toBe(true);
    expect(resultat.score).toBeLessThan(baseline.score);
    expect(resultat.signals.signal_intrant_extrant).toBeLessThanOrEqual(40);
  });

  it("entre la tolérance (+15 %) et +100 % : pénalité sans alerte (seuil volontairement large)", () => {
    const resultat = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.4 }, // exces = +60 %
    });

    expect(resultat.alerts).toHaveLength(0); // bruit de mesure filtré
    expect(resultat.signals.signal_intrant_extrant).toBeGreaterThan(40);
    expect(resultat.signals.signal_intrant_extrant).toBeLessThan(100);
  });

  it("dans la tolérance ±15 % : aucun signal, aucun alerte", () => {
    const resultat = computeConfidenceScore({
      ...BASE,
      declaration: { ...BASE.declaration, meterReadingM3: 0.28 }, // max*1.15 = 0,2875
    });

    expect(resultat.alerts).toHaveLength(0);
    expect(resultat.signals.signal_intrant_extrant).toBe(100);
  });
});

describe("INV-005 — déterminisme du score", () => {
  it("deux appels identiques produisent exactement la même sortie", () => {
    const a = computeConfidenceScore(BASE);
    const b = computeConfidenceScore(BASE);
    expect(a).toEqual(b);
  });
});

describe("Entrées invalides — échec bruyant, jamais un score faux silencieux", () => {
  it("rejette une fourchette de rendement incohérente", () => {
    expect(() =>
      computeConfidenceScore({
        ...BASE,
        expectedYield: { minM3: 0.3, maxM3: 0.2 },
      }),
    ).toThrow(/invalide/);
  });

  it("rejette une lecture de compteur négative", () => {
    expect(() =>
      computeConfidenceScore({
        ...BASE,
        declaration: { ...BASE.declaration, meterReadingM3: -1 },
      }),
    ).toThrow(/invalide/);
  });
});

describe("Signal temporel — stabilité des déclarations successives", () => {
  it("historique vide ou court ⇒ neutre à 100", () => {
    expect(signalTemporel([])).toBe(100);
    expect(signalTemporel([3.5])).toBe(100);
  });

  it("des déclarations stables gardent le maximum, volatiles pénalisent", () => {
    const stable = signalTemporel([3.4, 3.5, 3.6]);
    const volatile = signalTemporel([1.0, 6.0, 2.0]);
    expect(stable).toBe(100);
    expect(volatile).toBeLessThan(stable);
  });
});

describe("Signal capacité — plausibilité vs capacité déclarée", () => {
  it("capacité inconnue (0) ⇒ neutre", () => {
    expect(signalCapacite(BASE.declaration, 0)).toBe(100);
  });

  it("déclarer bien au-delà de sa capacité pénalise, en-dessous jamais", () => {
    const surcharge = signalCapacite(
      { ...BASE.declaration, quantityKg: 90, durationHours: 24 }, // 90 kg/j pour 30 kg/j
      30,
    );
    const modeste = signalCapacite(
      { ...BASE.declaration, quantityKg: 10, durationHours: 24 },
      30,
    );
    expect(surcharge).toBeLessThan(100);
    expect(modeste).toBe(100); // cohérent avec l'esprit BR-001
  });
});

describe("Signal preuve — qualité horodatage/géoloc/photo (FRB-001)", () => {
  it("preuve complète ⇒ 100", () => {
    expect(signalPreuve({ photoCapturedInApp: true, geoLocationPresent: true, timestampPlausible: true })).toBe(100);
  });

  it("photo non capturée in-app = pénalité la plus forte", () => {
    const sansPhoto = signalPreuve({ photoCapturedInApp: false, geoLocationPresent: true, timestampPlausible: true });
    const sansGeo = signalPreuve({ photoCapturedInApp: true, geoLocationPresent: false, timestampPlausible: true });
    expect(sansPhoto).toBe(60);
    expect(sansGeo).toBe(70);
    expect(sansPhoto).toBeLessThan(sansGeo);
  });

  it("tout manquant ⇒ 0", () => {
    expect(signalPreuve({ photoCapturedInApp: false, geoLocationPresent: false, timestampPlausible: false })).toBe(0);
  });
});
