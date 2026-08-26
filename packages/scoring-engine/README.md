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

Poids appliqués dans le score final : intrant/extrant **0.4** · temporel **0.2** · capacité **0.2** · preuve **0.2**.

## 2. Règle centrale : BR-001 — sous-performance ≠ fraude

Sous la fourchette → alerte `maintenance`, score **non dégradé** (INV-003). Au-dessus de +100% de la fourchette → alerte `sur_declaration`, score dégradé (BR-002). Détail complet et justification : [`docs/architecture/contrat-systeme.md`](../../docs/architecture/contrat-systeme.md).

Implémentation (INV-003) : lecture sous la fourchette ⇒ signal intrant/extrant forcé à 100 pour ce cycle — mécaniquement, le score ne peut pas bouger à cause de cet événement seul. La pénalité douce entre +15 % et +100 % s'applique sans alerte (filtrage du bruit de mesure).

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

Découpage d'orchestration retenu côté code : c'est **le backend** qui appelle cette fonction et passe la fourchette `{minM3, maxM3}` résultante au moteur — le moteur n'importe jamais `yield-model/`. Ratification en cours (`DECISIONS-DEV3.md`, D6).

## 5. Seuils de tolérance

| Donnée | Tolérance | Lié à |
|---|---|---|
| Écart déclaration vs modèle attendu | ±15% | Marge du compteur à bulles, ADR-0001 |
| Zone grise sans alerte | +15 % → +100 % : pénalité douce | BR-002 (seuil volontairement large) |
| Déclenchement sur-déclaration | > +100% | BR-002 |

## 6. Utilisation

```ts
import { computeConfidenceScore } from "@sika/scoring-engine";

const resultat = computeConfidenceScore({
  declaration: { substrate: "fientes_volaille", quantityKg: 3.5, durationHours: 24, meterReadingM3: 0.2 },
  expectedYield: { minM3: 0.15, maxM3: 0.25 }, // calculé par le backend via estimateExpectedYield()
  history: [{ quantityKg: 3.4, meterReadingM3: 0.19 }],
  capacityKgPerDay: 30,
  proof: { photoCapturedInApp: true, geoLocationPresent: true, timestampPlausible: true },
});
// => { score, signals: { signal_intrant_extrant, signal_temporel, signal_capacite, signal_preuve }, alerts }
```

Entrées structurellement invalides (fourchette incohérente, lecture négative) ⇒ exception : échec bruyant préféré à un score silencieusement faux.

## 7. Tests obligatoires

Voir [`docs/test/README.md`](../../docs/test/README.md) section 3 — en particulier FRB-007 (non-dégradation par sous-performance), le cas le plus sensible du projet.

État : **16 tests implémentés** (`tests/engine.test.ts`) couvrant FRB-007, BR-002, INV-005 (déterminisme), les seuils et chaque signal.

```bash
npm install && npm test   # suite complète
npm run build             # compilation TypeScript vers dist/
```
