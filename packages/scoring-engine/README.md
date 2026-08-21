# Moteur de scoring — `packages/scoring-engine/`

> Propriétaire logique : Dev 1 (orchestration, signaux, seuils) + Dev 3 (`yield-model/`, coefficients)
> C'est le point de couplage technique le plus important du projet — lire [Guide de collaboration](../../docs/COLLABORATION.md) section 4 avant de modifier ce module.

## 1. Les quatre signaux pondérés

| Signal | Ce qu'il mesure | Source de données |
|---|---|---|
| Cohérence intrant/extrant | La déclaration de matière première correspond-elle au volume de biogaz mesuré, compte tenu du modèle de rendement ? | `declarations` + `meter_readings` + `yield-model` |
| Cohérence temporelle | Les déclarations successives d'un même producteur sont-elles cohérentes entre elles dans le temps ? | Historique `declarations` |
| Cohérence avec la capacité déclarée | Le volume déclaré est-il plausible compte tenu de la capacité connue ? | `producers` + `declarations` |
| Qualité de la preuve visuelle | Horodatage cohérent, géolocalisation présente, identifiant du compteur visible ? | module `anti-fraud` du backend |

Un score en dessous d'un seuil déclenche une alerte visible sur le dashboard IMF/MMPE.

## 2. Règle centrale : sous-performance ≠ fraude

- **Sous la fourchette attendue** → flag « maintenance à vérifier ». Le score **n'est pas dégradé**. Raison : il est physiquement plus facile de sous-produire (mauvais entretien, problème de pH) que de sur-produire.
- **Dans la fourchette** → score maintenu.
- **Au-dessus de la fourchette** → sur-déclaration suspecte, score dégradé, priorité d'audit.
- Une alerte maintenance répétée et non résolue peut, elle, faire baisser le score dans un second temps.

## 3. `yield-model/` — modèle de rendement (Dev 3)

Base scientifique du scoring : pour X kg de tel substrat, quel volume de biogaz est "normal" ?

### Contenu maintenu par Dev 3
- **Table de référence par substrat** (fumier bovin, fientes de volaille, lisier porcin, déchets alimentaires, déchets de graisses/IAA, déchets de poisson/marché) : fourchette de rendement (m³/kg brut) + niveau de fiabilité par source.
- **Facteurs de correction** :
  - Climatique (sud vs nord) — **angle mort principal actuel**, aucune source ivoirienne trouvée à ce jour, coefficient provisoire.
  - Dilution / dose de charge.
  - Fraîcheur du substrat (non quantifiée pour l'instant, donnée déclarative qualitative).

### Priorités de calibration
1. Coefficient de zone climatique nord/sud.
2. Rendement des déchets alimentaires/restauration (lié à la cible "restaurants collectifs").
3. Effet de la fraîcheur du substrat.
4. Rendement du digestat associé.

### Mesure croisée manuelle (phase présélection, oct 2026)
Protocole des 5 à 10 premiers sites pilotes : pesée du substrat + suivi du compteur sur 2-3 semaines, pour remplacer les hypothèses de littérature par des données réelles.

## 4. Contrat d'interface Dev 1 ↔ Dev 3

```ts
// packages/scoring-engine/yield-model/index.ts

interface YieldEstimate {
  substrate: string;          // ex: "fientes_volaille"
  minM3PerKg: number;
  maxM3PerKg: number;
  reliability: "haute" | "moyenne" | "basse";
  climateZone: "sud" | "nord";
  climateCoefficient: number; // ex: 1.0 pour sud, 0.80-0.90 pour nord
}

function estimateExpectedYield(
  substrate: string,
  quantityKg: number,
  climateZone: "sud" | "nord"
): { minM3: number; maxM3: number; reliability: string };
```

Règle : **Dev 1 n'appelle jamais directement la table de référence** — toujours via `estimateExpectedYield()`. Dev 3 peut ainsi changer les valeurs sans que Dev 1 touche au moteur de scoring. Si la **signature** doit changer (pas juste les valeurs), c'est annoncé avant, pas découvert dans une PR.

## 5. Seuils de tolérance

| Donnée | Tolérance | Justification |
|---|---|---|
| Écart déclaration vs modèle attendu | ±15% | Marge d'erreur du compteur à bulles (±15-20%) |
| Déclenchement alerte sur-déclaration | > +100% par rapport à la fourchette attendue | Ne détecter que les écarts flagrants, pas le bruit de mesure |

## 6. Ce que le compteur à bulles mesure vraiment

Ce n'est pas un instrument de précision : c'est un **signal de cohérence relative**, marge d'erreur ±15-20%. Il indique si le débit augmente, diminue ou reste stable — objectif : détecter les écarts flagrants, pas mesurer au litre près.

## 7. Tests attendus

- Cas cohérent : déclaration + lecture dans la fourchette → score maintenu.
- Cas sous-performance : lecture sous la fourchette → alerte maintenance, score non dégradé.
- Cas sur-déclaration : lecture > +100% → score dégradé, priorité d'audit.
- Cas cohérence temporelle : rupture brutale vs historique du même producteur → signal détecté.

## 8. Sources et traçabilité

Chaque valeur de `yield-model` doit être traçable à une source. Dev 3 documente les sources et leur niveau de fiabilité directement en commentaire dans le code du module (pas de fichier séparé — la table de référence et sa documentation vivent ensemble ici).
