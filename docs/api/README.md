# API — registre producteur-consommateur

> Question à laquelle ce document répond : qui produit chaque contrat HTTP, qui le consomme, et dans quel état est-il ?
> Le détail complet (requêtes/réponses) est dans [`specification.md`](./specification.md).

## Registre des contrats

| Endpoint | Producteur | Consommateurs | Statut | Preuve de vérification |
|---|---|---|---|---|
| `GET /health` | Dev 1 | supervision | Implémenté | e2e |
| `POST /auth/login` | Dev 1 | `apps/field-app/`, `apps/dashboard/` | Implémenté — vérifié en local (4 rôles, 401 générique) | PR auth-login : login OK/PIN erroné/inconnu testés par curl + e2e |
| `POST /producers` | Dev 1 | `apps/field-app/` (agent) | Implémenté — vérifié en local (`agent` seul, 409 compteur/téléphone) | PR producteurs : création avec/sans PIN, doublons 409, matrice rôles |
| `GET /producers/:id` | Dev 1 | `apps/dashboard/` | Implémenté — vérifié en local (`agent`/`imf`/`mmpe`, 404 inconnu) | PR producteurs : lecture + 404 |
| `GET /producers/:id/score` | Dev 1 | `packages/payments/` (Dev 2), `apps/dashboard/` | Implémenté — **contrat critique inter-devs** | 13 unitaires : seuil, démarrage à froid, alertes bloquantes, tendance |
| `POST /declarations` | Dev 1 | `apps/field-app/` (Dev 3) | Implémenté — **contrat critique inter-devs** | 12 unitaires : idempotence, autorisation, atomicité. **Non encore vérifié contre `apps/field-app/`** |
| `GET /declarations/:producerId` | Dev 1 | `apps/dashboard/` | Implémenté | unitaires mapping + cloisonnement producteur |
| `GET /alerts` | Dev 1 | `apps/dashboard/` | Implémenté — filtre `?resolved=` | unitaires mapping camelCase, tri, filtre paramétré |
| `PATCH /alerts/:id/resolve` | Dev 1 | `apps/dashboard/` | Implémenté | unitaires : idempotence, 404 |
| `POST /payments/payout` | Dev 1 + Dev 2 | `apps/dashboard/`, `apps/field-app/` | Implémenté — **contrat critique inter-devs**, opérateur **simulé** | 16 unitaires : idempotence, BR-003, checkpoint, quarantaine |
| `GET /payments/:producerId` | Dev 2 | `apps/dashboard/` | Implémenté | unitaires cloisonnement producteur |

> « Implémenté » signifie : couvert par des tests automatisés et conforme à `specification.md`. Cela ne signifie **pas** vérifié contre un consommateur réel — la colonne « preuve » le précise quand c'est le cas. Aucun endpoint n'a encore été appelé par `apps/field-app/` ou `apps/dashboard/`, qui n'existent pas.

## Contrats internes (non-HTTP, entre packages)

| Contrat | Producteur | Consommateur | Statut |
|---|---|---|---|
| `estimateExpectedYield()` (`yield-model/index.ts`) | Dev 3 | `packages/scoring-engine/` (Dev 1) | **Non livré par Dev 3.** Implémentation provisoire dans `apps/backend/src/scoring/yield-model.adapter.ts` (D6), lisant `yield_reference` en base. Signature respectée — **contrat critique inter-devs** |
| `computeConfidenceScore()` (`@sika/scoring-engine`) | Dev 1 | `apps/backend/src/scoring/` | Implémenté, 16 tests |
| `MobileMoneyProvider` (`@sika/payments`) | Dev 2 | `apps/backend/src/payments/` | Implémenté. Un opérateur réel s'intègre en implémentant cette seule interface |

## Règle de mise à jour

Un contrat marqué "critique inter-devs" ne change jamais sans message préalable à l'autre partie (voir points de synchro dans `developpement/README.md`). Toute modification de endpoint doit mettre à jour cette table, `specification.md`, et le code consommateur dans la **même pull request**.
