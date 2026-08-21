# API — registre producteur-consommateur

> Question à laquelle ce document répond : qui produit chaque contrat HTTP, qui le consomme, et dans quel état est-il ?
> Le détail complet (requêtes/réponses) est dans [`specification.md`](./specification.md).

## Registre des contrats

| Endpoint | Producteur | Consommateurs | Statut | Preuve de vérification |
|---|---|---|---|---|
| `POST /auth/login` | Dev 1 | `apps/field-app/`, `apps/dashboard/` | Spécifié | À vérifier une fois implémenté |
| `POST /producers` | Dev 1 | `apps/field-app/` (agent) | Spécifié | — |
| `GET /producers/:id` | Dev 1 | `apps/dashboard/` | Spécifié | — |
| `GET /producers/:id/score` | Dev 1 | `packages/payments/` (Dev 2), `apps/dashboard/` | Spécifié — **contrat critique inter-devs** | À vérifier avant intégration Dev 2 |
| `POST /declarations` | Dev 1 | `apps/field-app/` (Dev 3) | Spécifié — **contrat critique inter-devs** | À vérifier avant intégration Dev 3 |
| `GET /declarations/:producerId` | Dev 1 | `apps/dashboard/` | Spécifié | — |
| `GET /alerts` | Dev 1 | `apps/dashboard/` | Spécifié | — |
| `POST /payments/payout` | Dev 1 | `packages/payments/` (Dev 2) | Spécifié — **contrat critique inter-devs** | À vérifier avant intégration Dev 2 |

## Contrats internes (non-HTTP, entre packages)

| Contrat | Producteur | Consommateur | Statut |
|---|---|---|---|
| `estimateExpectedYield()` (`yield-model/index.ts`) | Dev 3 | `packages/scoring-engine/` (Dev 1) | Spécifié dans `packages/scoring-engine/README.md` — **contrat critique inter-devs**, ne jamais changer la signature sans prévenir |

## Règle de mise à jour

Un contrat marqué "critique inter-devs" ne change jamais sans message préalable à l'autre partie (voir points de synchro dans `developpement/README.md`). Toute modification de endpoint doit mettre à jour cette table, `specification.md`, et le code consommateur dans la **même pull request**.
