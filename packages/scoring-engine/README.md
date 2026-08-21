# Moteur de scoring — `packages/scoring-engine/`

> Propriétaire logique : Dev 1 (orchestration) + Dev 3 (`yield-model/`)
> Décision structurante : [`docs/adr/0002-separation-scoring-yield-model.md`](../../docs/adr/0002-separation-scoring-yield-model.md)
> Contrat système complet : [`docs/architecture/contrat-systeme.md`](../../docs/architecture/contrat-systeme.md)

## 1. Les quatre signaux (FR-003)

| Signal | Mesure | Source |
|---|---|---|
| Cohérence intrant/extrant | Déclaration vs modèle de rendement | `declarations` + `meter_readings` + `yield-model` |
| Cohérence temporelle | Stabilité des déclarations successives | Historique `declarations` |
| Cohérence avec la capacité | Plausibilité vs capacité déclarée | `producers` + `declarations` |
| Qualité de la preuve | Validité horodatage/géoloc/photo | module `anti-fraud` |

## 2. Règle centrale : BR-001 — sous-performance ≠ fraude

Sous la fourchette → alerte `maintenance`, score **non dégradé** (INV-003). Au-dessus de +100% de la fourchette → alerte `sur_declaration`, score dégradé (BR-002). Détail complet et justification : [`docs/architecture/contrat-systeme.md`](../../docs/architecture/contrat-systeme.md).

## 3. `yield-model/` — modèle de rendement (Dev 3)

Table de référence par substrat + coefficients climatiques. Schéma exact : [`docs/donnees/dictionnaire-de-donnees.md`](../../docs/donnees/dictionnaire-de-donnees.md), table `yield_reference`. Angle mort actuel : coefficient climatique nord provisoire, sans source ivoirienne directe.

## 4. Contrat d'interface Dev 1 ↔ Dev 3

```ts
// packages/scoring-engine/yield-model/index.ts

interface YieldEstimate {
  substrate: string;
  minM3PerKg: number;
  maxM3PerKg: number;
  reliability: "haute" | "moyenne" | "basse";
  climateZone: "sud" | "nord";
  climateCoefficient: number;
}

function estimateExpectedYield(
  substrate: string,
  quantityKg: number,
  climateZone: "sud" | "nord"
): { minM3: number; maxM3: number; reliability: string };
```

Statut : proposé, non ratifié — voir [`docs/developpement/README.md`](../../docs/developpement/README.md) section 7. Dev 1 n'appelle jamais directement `yield_reference` — toujours via cette fonction (voir INV-004, ADR-0002).

## 5. Seuils de tolérance

| Donnée | Tolérance | Lié à |
|---|---|---|
| Écart déclaration vs modèle attendu | ±15% | Marge du compteur à bulles, ADR-0001 |
| Déclenchement sur-déclaration | > +100% | BR-002 |

## 6. Tests obligatoires

Voir [`docs/test/README.md`](../../docs/test/README.md) section 3 — en particulier FRB-007 (non-dégradation par sous-performance), le cas le plus sensible du projet.
