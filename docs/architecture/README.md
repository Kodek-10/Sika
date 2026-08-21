# Architecture — index

> Question à laquelle ce document répond : qui possède quoi, au jour le jour ?

## Limites de modules et responsables d'implémentation

| Module | Responsable | Peut être modifié par d'autres ? | Doc détaillée |
|---|---|---|---|
| `apps/backend/` | Dev 1 | Non, sauf accord explicite | [`../../apps/backend/README.md`](../../apps/backend/README.md) |
| `packages/scoring-engine/` (hors `yield-model/`) | Dev 1 | Non | [`../../packages/scoring-engine/README.md`](../../packages/scoring-engine/README.md) |
| `packages/scoring-engine/yield-model/` | Dev 3 | Dev 1 en lecture seule | idem |
| `apps/field-app/` | Dev 3 | Non | [`../../apps/field-app/README.md`](../../apps/field-app/README.md) |
| `packages/payments/` | Dev 2 | Non | [`../../packages/payments/README.md`](../../packages/payments/README.md) |
| `apps/dashboard/` | Non attribué | Ouvert, à coordonner | [`../../apps/dashboard/README.md`](../../apps/dashboard/README.md) |
| `packages/shared-types/` | Commun | Ajout libre, jamais de modification d'un type existant sans accord des 3 | [`../../packages/shared-types/README.md`](../../packages/shared-types/README.md) |
| `infra/` | Commun | Oui | [`../../infra/README.md`](../../infra/README.md) |

## Documents de ce dossier

| Document | Contenu |
|---|---|
| [`contrat-systeme.md`](./contrat-systeme.md) | Invariants (`INV-*`) et règles métier (`BR-*`) — ce qui ne doit jamais devenir faux |
| [`exigences-tracabilite.md`](./exigences-tracabilite.md) | Quel composant possède chaque garantie |
| [`architecture-systeme.md`](./architecture-systeme.md) | Organisation générale du système, flux de données |

## Règle de propriété

Tu ne modifies pas le dossier de quelqu'un d'autre sans accord explicite. Un besoin de changement croisé passe par une demande à la personne concernée, documentée dans le point quotidien (voir [`../developpement/README.md`](../developpement/README.md)), pas par une modification directe.
