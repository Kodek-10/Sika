# Développement — routine quotidienne

> Question à laquelle ce document répond : comment les trois développeurs se coordonnent-ils au jour le jour ?

## 1. Qui possède quoi

Voir [`../architecture/README.md`](../architecture/README.md) pour la table complète de propriété des modules.

## 2. Stratégie de branches

```
main                    # toujours démontrable, jamais cassé
 └── dev                # intégration continue de l'équipe
      ├── feat/dev1-...
      ├── feat/dev2-...
      └── feat/dev3-...
```

- Jamais de travail direct sur `main` ou `dev`.
- Une branche = une exigence ou tâche assignée, idéalement rattachée à un `FR-xxx` ou `FRB-xxx`.
- Nommage : `feat/devN-nom-court` (ex: `feat/dev1-scoring-engine`).
- Commit : `[devN] verbe à l'infinitif + description` (ex: `[dev1] ajouter endpoint POST /declarations`).

## 3. Cycle de vie d'une tâche

### Avant de commencer
1. Vérifier la dépendance : la tâche a-t-elle besoin d'un contrat "critique inter-devs" (voir `../api/README.md`) qui n'est pas encore stabilisé ? Si oui, attendre ou coder contre une version provisoire explicitement annoncée.
2. Créer la branche depuis `dev` à jour.
3. Si la tâche touche un contrat partagé, prévenir la personne concernée.

### Pendant
4. Committer souvent, messages clairs.
5. Signaler tout écart au plan initial immédiatement, pas à la fin.

### Après avoir terminé — checklist obligatoire avant la tâche suivante
6. Mettre à jour le `README.md` du module concerné.
7. Si un endpoint a changé : mettre à jour `../api/specification.md` **et** `../api/README.md` (registre) dans la même PR.
8. Si un invariant ou une règle métier a changé : mettre à jour `../architecture/contrat-systeme.md`, `../architecture/exigences-tracabilite.md`, et les tests liés (voir `../test/README.md`).
9. Si le modèle de données a changé : mettre à jour `../donnees/dictionnaire-de-donnees.md` et la migration correspondante.
10. Vérifier que le morceau de flux modifié tourne réellement en local de bout en bout.
11. Ouvrir une PR vers `dev`, description courte (quoi/pourquoi/comment tester), taguer la personne concernée par un point de synchro.
12. Ne pas enchaîner sur la tâche suivante avant merge, sauf tâches réellement indépendantes.
13. Supprimer la branche après merge.

### Définition de "terminé"
Pas terminé si : la doc du module n'est pas à jour, un autre dev ne peut pas comprendre comment utiliser ce qui a été fait sans demander à l'oral, ou si "ça marche chez moi" n'a pas été vérifié par quelqu'un d'autre pour les contrats critiques.

## 4. Points de synchronisation obligatoires

| Synchro | Sujet | Rythme |
|---|---|---|
| Dev 1 ↔ Dev 3 | `yield-model` (`estimateExpectedYield()`) — voir `packages/scoring-engine/README.md` | Tous les 2-3 jours |
| Dev 1 ↔ Dev 2 | `GET /producers/:id/score` — seuil d'éligibilité (BR-003) | À la stabilisation du contrat, puis sur demande |
| Dev 2 ↔ Dev 3 | Cohérence du discours pitch vs état réel de la calibration | Avant chaque répétition de pitch |

## 5. Rythme de communication

- Point rapide quotidien (5-10 min) : hier / aujourd'hui / bloqué par qui.
- Blocage > 30 min sur une dépendance : message immédiat, pas d'attente du point quotidien.
- Décision touchant plusieurs modules (ex. `packages/shared-types/`) : jamais seul.

## 6. Setup local

```bash
git clone <repo>
cd sika

# 1. Infra
docker compose -f infra/docker-compose.yml up -d
infra/migrations/apply.sh        # applique les migrations non encore appliquées
infra/seeds/demo-users.sh        # comptes de démo pour les 4 rôles

# 2. Packages (dépendances locales du backend, à construire d'abord)
cd packages/scoring-engine && npm install && npm run build && cd ../..
cd packages/payments      && npm install && npm run build && cd ../..

# 3. Backend
cd apps/backend && npm install && cp .env.example .env && npm run start:dev
# vérification : GET http://localhost:3000/api/health -> {"status":"ok"}
```

`apps/field-app/` n'existe pas encore (Dev 3).

## 7. Statut des contrats en cours

| Contrat | Statut | Dernière synchro |
|---|---|---|
| `estimateExpectedYield()` | Signature **respectée** par l'adaptateur provisoire du backend (D6). Module Dev 3 **non livré** | — |
| `GET /producers/:id/score` | **Implémenté et testé.** Forme enrichie d'un objet `eligibility` — à valider avec Dev 2 | — |
| `POST /declarations` | **Implémenté et testé.** Ajout d'un champ `declarationId` (UUID client) portant l'idempotence — **à valider avec Dev 3** avant de coder la file d'attente | — |
| `POST /payments/payout` | **Implémenté**, opérateur simulé. Seuils D1-D3 non ratifiés | — |
| `MobileMoneyProvider` | **Implémenté** — point d'extension unique pour un opérateur réel | — |

⚠️ « Implémenté » = testé et conforme à la spec. Aucun de ces contrats n'a encore été appelé par un consommateur réel (`apps/field-app/`, `apps/dashboard/` n'existent pas).

À mettre à jour à chaque point de synchro réel.
