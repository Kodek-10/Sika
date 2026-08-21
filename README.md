# Sika

> Infrastructure de confiance pour la filière biogaz — SIREXE Hackathon 2026 (Prix Thématique MMPE)

## Le projet en une phrase

Sika transforme la production de biogaz en preuve vérifiable et exploitable comme actif financier, en combinant une déclaration structurée, un capteur mécanique ultra-low-cost (compteur de bulles) et un moteur de scoring de cohérence — sans IoT électronique coûteux.

## Le flux à ne jamais perdre de vue

```
Déclaration → Relevé compteur → Score en direct → Alerte
```

C'est le livrable de la sélection SIREXE (1-8 septembre 2026). Un composant isolé mais brillant vaut moins qu'un flux complet et crédible, même sur données simulées.

## Structure du projet

```
sika/
├── docs/
│   └── COLLABORATION.md         # comment on travaille ensemble
├── apps/
│   ├── backend/                 # Dev 1 — voir apps/backend/README.md
│   │   └── docs/
│   │       ├── API.md
│   │       └── DATABASE.md
│   ├── field-app/                # Dev 3 — voir apps/field-app/README.md
│   └── dashboard/                # vue producteur + IMF/MMPE (non attribué)
├── packages/
│   ├── scoring-engine/           # Dev 1 (+ yield-model/ = Dev 3) — voir README.md
│   ├── payments/                 # Dev 2 — voir README.md
│   └── shared-types/
└── infra/                        # docker-compose, migrations
```

## Où trouver quoi

| Tu cherches... | Va voir |
|---|---|
| Comment on s'organise en équipe (branches, cycle de tâche, points de synchro) | [`docs/COLLABORATION.md`](./docs/COLLABORATION.md) |
| Le backend, le moteur de scoring, la sécurité | [`apps/backend/README.md`](./apps/backend/README.md) |
| La liste des endpoints API | [`apps/backend/docs/API.md`](./apps/backend/docs/API.md) |
| Le schéma de base de données | [`apps/backend/docs/DATABASE.md`](./apps/backend/docs/DATABASE.md) |
| L'app terrain (PWA offline) et la calibration scientifique | [`apps/field-app/README.md`](./apps/field-app/README.md) |
| Le moteur de scoring en détail (4 signaux, contrat d'interface) | [`packages/scoring-engine/README.md`](./packages/scoring-engine/README.md) |
| Mobile Money, partenariats, pitch | [`packages/payments/README.md`](./packages/payments/README.md) |

## Règle d'or

Chaque doc doit rester **vraie en permanence**. Si tu changes un comportement (endpoint, seuil, règle métier), tu mets à jour la doc du dossier concerné **dans la même PR** que le code — jamais "plus tard".
