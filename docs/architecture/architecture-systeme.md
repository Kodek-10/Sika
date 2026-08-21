# Architecture système

> Question à laquelle ce document répond : comment le système est-il organisé ?

## 1. Vue d'ensemble

```
┌─────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│  apps/field-app   │──HTTP──▶│    apps/backend        │◀──HTTP──│  apps/dashboard    │
│  (PWA offline)    │        │    (NestJS API)         │        │  (Next.js)         │
└─────────────────┘        └──────────┬───────────┘        └──────────────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
         packages/scoring-engine  PostgreSQL      packages/payments
         (+ yield-model/)          (infra/)        (Mobile Money)
```

## 2. Découpage par module et responsabilité

| Module | Responsabilité | Ne fait PAS |
|---|---|---|
| `apps/field-app/` | Collecte de déclaration, capture photo, file d'attente hors-ligne | Ne calcule jamais de score localement — toujours envoyé au backend |
| `apps/backend/` | API HTTP, auth, orchestration du scoring, anti-fraude, persistance | Ne contient pas la logique de calibration scientifique (déléguée à `yield-model/`) |
| `packages/scoring-engine/` | Calcul du score à partir des 4 signaux, application de BR-001/BR-002 | N'accède jamais directement à la base de données — reçoit ses données en paramètres depuis `apps/backend/` |
| `packages/scoring-engine/yield-model/` | Référentiel de rendement, coefficients climatiques | Ne connaît rien du calcul de score final — expose uniquement une estimation de rendement attendu |
| `packages/payments/` | Intégration Mobile Money, déclenchement de versement | Ne décide jamais de l'éligibilité elle-même — consomme `GET /producers/:id/score` |
| `apps/dashboard/` | Visualisation score/alertes pour IMF/MMPE | Aucune logique métier — pur affichage des données de l'API |

## 3. Pourquoi séparer `scoring-engine` de `yield-model`

Décision structurante (voir `adr/0002-separation-scoring-yield-model.md`) : le moteur de scoring (Dev 1) et le modèle de rendement (Dev 3) évoluent à des rythmes différents et sont maintenus par des personnes différentes. Les isoler derrière une interface stable (voir `api/specification.md` section interne, et le contrat détaillé dans le code `yield-model/index.ts`) permet à chacun d'itérer sans bloquer l'autre.

## 4. Flux de données du parcours central

1. `apps/field-app/` envoie `POST /declarations` (FR-001, FR-002).
2. `apps/backend/src/declarations/` valide et persiste, vérifie INV-004 (substrat connu).
3. `apps/backend/src/scoring/` appelle `packages/scoring-engine/` avec la déclaration + historique + estimation de `yield-model/`.
4. Le moteur retourne un score et, le cas échéant, un type d'alerte (BR-001 ou BR-002).
5. `apps/backend/` persiste le score et l'alerte, expose `GET /producers/:id/score` et `GET /alerts`.
6. `packages/payments/` (déclenché par un agent ou MMPE) consulte le score pour statuer sur BR-003 avant tout versement.

## 5. Limites de modules — ce qui ne doit jamais être contourné

- `apps/field-app/` ne parle jamais directement à `packages/scoring-engine/` — toujours via l'API du backend.
- `packages/payments/` ne recalcule jamais un score — il consomme uniquement le résultat exposé par l'API.
- Aucun module ne modifie `yield_reference` directement en base sans passer par le processus de mise à jour documenté dans `packages/scoring-engine/yield-model/` (traçabilité des sources, voir INV-004).

## 6. Voir aussi

- Contrat détaillé des invariants : [`contrat-systeme.md`](./contrat-systeme.md)
- Qui possède quoi, au jour le jour : [`README.md`](./README.md)
- Décisions figées : [`../adr/`](../adr/)
