# Sika

> Infrastructure de confiance pour la filière biogaz — SIREXE Hackathon 2026 (Prix Thématique MMPE)
> Anciennement nommé BioTrust — voir [`docs/adr/0003-renommage-biotrust-vers-sika.md`](./docs/adr/0003-renommage-biotrust-vers-sika.md).

## Démarrer ici

1. [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — cadrage du projet, problème, solution, périmètre MVP.
2. [`docs/README.md`](./docs/README.md) — index complet de la documentation et parcours de lecture recommandé.
3. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — comment contribuer, checklist de pull request.
4. [`SECURITY.md`](./SECURITY.md) — comment signaler une vulnérabilité, données sensibles, principes de sécurité applicative.

## Structure du projet

```
sika/
├── PROJECT_OVERVIEW.md
├── CONTRIBUTING.md
├── SECURITY.md
├── IMPLEMENTATION_PLAN.md      # Plan interne — jamais pushé
├── docs/                      # documentation traçable (voir docs/README.md)
│   ├── produit/
│   ├── exigences-produit/
│   ├── architecture/
│   ├── api/
│   ├── design/
│   ├── donnees/
│   ├── guide-connecteur/
│   ├── developpement/
│   ├── test/
│   ├── demo/
│   ├── decisions/             # décisions inter-devs ratifiées
│   └── adr/
├── apps/
│   ├── backend/               # Dev 1 — NestJS (implémenté ✅)
│   ├── field-app/             # Dev 3 — PWA offline-first (implémenté ✅)
│   └── dashboard/             # non attribué
├── packages/
│   ├── scoring-engine/        # Dev 1 — implémenté ✅
│   ├── scoring-engine/yield-model/  # Dev 3 — à livrer
│   ├── payments/              # Dev 2 — implémenté ✅
│   └── shared-types/          # à démarrer
└── infra/                     # migrations, compose, seeds
```

## État du projet

Le flux central est **complet côté API** (11 endpoints, 32 tests unitaires passent) et le **field-app est implémenté** (PWA offline-first). Le yield-model et le dashboard restent à livrer.

Détail par module : [`docs/README.md`](./docs/README.md) section « Statut actuel ».

## Le flux à ne jamais perdre de vue

```
Déclaration → Relevé compteur → Score en direct → Alerte
```
