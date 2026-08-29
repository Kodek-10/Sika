# ADR-0004 — Critères d'éligibilité au versement Mobile Money (BR-003)

**Statut** : Actif

## Contexte

La règle BR-003 définit les conditions d'éligibilité d'un producteur à un versement Mobile Money. Trois paramètres doivent être fixés : le seuil de score, le nombre minimum de déclarations, et le comportement face aux alertes `maintenance`. Ces valeurs influencent directement le modèle économique (`BUSINESS-MODEL.md`) et la crédibilité de la démo.

## Options considérées

### D1 — Seuil de score

| Option | Seuil | Conséquence |
|---|---|---|
| **70** ✅ retenu | Large | Un producteur avec un signal dégradé sur deux axes reste éligible |
| 80 | Strict | Une simple sur-déclaration grise devient un bloqueur |

**Pourquoi 70** : le score est une moyenne pondérée de 4 signaux (intrant/extrant 0,4 · temporel 0,2 · capacité 0,2 · preuve 0,2). Un producteur dont la preuve est complète et la production cohérente est à 100. 70 laisse passer un producteur ayant un signal dégradé sur deux, mais bloque celui qui cumule une preuve douteuse et une incohérence. Le coût d'un faux positif (verser à un fraudeur) est plus élevé que celui d'un faux négatif (refuser un producteur honnête) car l'incitation est financée par subvention MMPE.

### D2 — Nombre minimal de déclarations

| Option | Minimum | Conséquence |
|---|---|---|
| **3** ✅ retenu | Garde-fou | Évite qu'une seule déclaration favorable ne rende éligible |
| 1 | Inclusion maximale | Score structurellement flatteur au début (neutre à 100 sans historique) |

**Pourquoi 3** : sans ce garde-fou, une première déclaration favorable suffirait à rendre un producteur éligible, alors que le signal temporel (stabilité des déclarations) est neutre à 100 tant qu'il y a moins de 2 points d'historique. La démo reste faisable en déclarant 3 fois.

### D3 — Alerte maintenance bloquante ?

| Option | Comportement | Conséquence |
|---|---|---|
| **Non** ✅ retenu | Seule `sur_declaration` bloque | Cohérent avec BR-001 (sous-performance ≠ fraude) |
| Oui | Toute alerte bloque | Pénalise un producteur mal équipé, risque de réputation |

**Pourquoi non** : une alerte `maintenance` signale une sous-performance, et sous-produire est physiquement plus facile que sur-produire (mauvais entretien, pH, rétention hydraulique). Bloquer un versement là-dessus reviendrait à sanctionner financièrement un producteur mal équipé, exactement ce que BR-001 interdit.

## Décision

Les trois valeurs sont ratifiées et isolées dans `apps/backend/src/scoring/scoring.constants.ts` :

| Constante | Valeur | ADR |
|---|---|---|
| `SEUIL_ELIGIBILITE_BR003` | 70 | D1 |
| `MIN_DECLARATIONS_ELIGIBILITE` | 3 | D2 |
| `MAINTENANCE_ALERT_BLOQUANTE` | false | D3 |

## Conséquences

- Un accord inter-devs futur se traduira par une ligne à changer dans `scoring.constants.ts`, sans refactor.
- Toute modification de ces valeurs doit être documentée dans un ADR, car elles influencent le modèle économique et le pitch.
- `packages/payments/` consomme la décision d'éligibilité via `GET /producers/:id/score` sans jamais recalculer (architecture-systeme.md §5).