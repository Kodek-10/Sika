# Guide de collaboration — comment on travaille ensemble

> Objectif : que personne ne se marche sur les pieds, que chacun sache exactement quoi faire, dans quel ordre, et quoi faire **après** avoir terminé un morceau avant de passer à la suite.

## 1. Qui possède quoi

| Zone du repo | Propriétaire | Peut être modifié par d'autres ? |
|---|---|---|
| `apps/backend/` | Dev 1 | Non, sauf accord explicite |
| `packages/scoring-engine/` (hors `yield-model/`) | Dev 1 | Non |
| `packages/scoring-engine/yield-model/` | Dev 3 | Dev 1 en lecture, jamais en écriture directe |
| `apps/field-app/` | Dev 3 | Non |
| `packages/payments/` | Dev 2 | Non |
| `apps/dashboard/` | Non attribué — à faire en dernier si le temps le permet, ou en commun | — |
| `packages/shared-types/` | Commun | Oui, mais seulement en ajout, jamais en modification d'un type existant sans prévenir les deux autres |
| `infra/`, `README.md`, `docs/` | Commun | Oui |

**Règle simple** : tu ne touches pas au dossier de quelqu'un d'autre sans lui dire avant. Si tu as besoin d'un changement dans son module, tu lui demandes ou tu ouvres une issue — tu ne le fais pas toi-même dans son code.

## 2. Stratégie de branches

```
main                    # toujours démontrable, jamais cassé
 └── dev                # intégration continue de l'équipe
      ├── feat/dev1-...  # branches de Dev 1
      ├── feat/dev2-...  # branches de Dev 2
      └── feat/dev3-...  # branches de Dev 3
```

- On ne travaille **jamais** directement sur `main` ou `dev`.
- Une branche = une tâche du tableau de répartition (ex: `feat/dev1-scoring-engine`, `feat/dev3-offline-sync`).
- Convention de nommage : `feat/devN-nom-court-de-la-tache`.
- Convention de commit : `[devN] verbe à l'infinitif + description courte` (ex: `[dev1] ajouter endpoint POST /declarations`).

## 3. Cycle de vie d'une tâche — à suivre à chaque fois

### Avant de commencer une tâche
1. Vérifier dans le tableau de répartition que la tâche t'est bien assignée et qu'elle n'a pas de dépendance bloquante non résolue (ex: Dev 1 ne commence pas l'intégration du `yield-model` avant que Dev 3 ait publié une première version, même incomplète).
2. Créer la branche depuis `dev` à jour (`git pull origin dev` avant de brancher).
3. Si la tâche touche une interface partagée (voir section 4), envoyer un message rapide à la personne concernée : "je démarre X, je te taggue quand c'est prêt à intégrer".

### Pendant la tâche
4. Committer souvent, avec des messages clairs — pas un seul gros commit à la fin.
5. Si tu dévies du plan initial, le signaler tout de suite à l'équipe plutôt qu'à la fin.

### Après avoir terminé une tâche — checklist obligatoire avant de passer à la suivante
6. **Mettre à jour le `README.md` de ton propre dossier** (`apps/backend/`, `apps/field-app/`, ou `packages/payments/`) — dans la même branche, pas dans une tâche séparée.
7. **Mettre à jour `apps/backend/docs/API.md`** si tu as ajouté, changé ou supprimé un endpoint (Dev 1 le fait directement ; Dev 2/Dev 3 le signalent à Dev 1 s'ils ont besoin d'un nouvel endpoint).
8. Vérifier que le code tourne bien en local de bout en bout sur le morceau du flux modifié (pas juste "ça compile").
9. Ouvrir une Pull Request vers `dev` avec une description courte : quoi, pourquoi, comment tester.
10. Taguer la personne concernée par le point de synchro si applicable (voir section 4).
11. **Ne pas commencer la tâche suivante avant que la PR précédente soit mergée dans `dev`**, sauf si les deux tâches sont totalement indépendantes.
12. Une fois mergé, supprimer la branche.

### Définition de "terminé" (Definition of Done)
Une tâche n'est **pas terminée** si :
- Le code n'est pas documenté dans le `README.md` du dossier concerné.
- Un autre dev ne peut pas comprendre comment appeler/utiliser ce que tu as fait sans te demander à l'oral.
- Ça marche "chez toi" mais personne d'autre n'a testé.

## 4. Points de synchronisation obligatoires

### Synchro Dev 1 ↔ Dev 3 — le modèle de rendement (`yield-model`)
Point de couplage le plus important du projet. Dev 1 construit le moteur de scoring en supposant que `packages/scoring-engine/yield-model/` expose une interface stable (voir `packages/scoring-engine/README.md`). Dev 3 doit publier une première version de cette interface **avant** que Dev 1 code l'intégration finale, même avec des valeurs provisoires.

Rythme recommandé : point rapide tous les 2-3 jours.

### Synchro Dev 1 ↔ Dev 2 — déclenchement du paiement
Le score calculé par Dev 1 doit déclencher une action côté paiement. Dev 2 a besoin de savoir quel endpoint consulter et le format de réponse — voir `apps/backend/docs/API.md`, endpoint `GET /producers/:id/score`.

### Synchro Dev 2 ↔ Dev 3 — cohérence du discours
Dev 2 prépare le pitch et les réponses aux objections du jury. Dev 3 doit lui communiquer l'état réel de la calibration (quels coefficients sont solides, lesquels sont provisoires) pour que Dev 2 ne promette pas plus que ce que le modèle peut garantir.

## 5. Rythme de communication

- **Point rapide quotidien** (5-10 min) : chacun dit ce qu'il a fait hier, ce qu'il fait aujourd'hui, s'il est bloqué.
- **Blocage = message immédiat**, pas d'attente du point quotidien.
- **Décision qui touche plusieurs modules** (ex: changer un type dans `shared-types`) : jamais décidée seul.

## 6. Setup local

```bash
git clone <repo>
cd sika
docker compose -f infra/docker-compose.yml up -d   # PostgreSQL + stockage objet
cd apps/backend && npm install && npm run start:dev
cd apps/field-app && npm install && npm run dev
```
