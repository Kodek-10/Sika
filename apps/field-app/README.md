# Field App (PWA offline-first) & Calibration scientifique

> Propriétaire : Dev 3
> Consommé par : `apps/backend/`, `packages/scoring-engine/yield-model/`
> Voir aussi : [`packages/scoring-engine/README.md`](../../packages/scoring-engine/README.md) · [`docs/exigences-produit/logiciel.md`](../../docs/exigences-produit/logiciel.md) · [`docs/guide-connecteur/README.md`](../../docs/guide-connecteur/README.md)

## 1. Rôle de ce module

Réalise FR-001 (UI), FR-002, FR-008. Porte la crédibilité terrain (app utilisable sans réseau) et, via `packages/scoring-engine/yield-model/`, la crédibilité scientifique du scoring.

## 2. Écrans / fonctionnalités (`src/`)

| Module | Rôle | Exigences |
|---|---|---|
| `declaration/` | Formulaire quantité/type/durée | FR-001, FRB-003 |
| `meter-reading/` | Capture photo compteur, horodatage, géoloc automatiques | FR-002, INV-002, FRB-001 |
| `offline-sync/` | File d'attente locale + synchronisation | FR-008, FRB-002 |

Le détail du protocole d'extraction/idempotence de la synchronisation hors-ligne est documenté dans [`docs/guide-connecteur/README.md`](../../docs/guide-connecteur/README.md).

## 3. Contrainte non négociable

Le mode hors-ligne doit être **réellement testé** (réseau physiquement coupé), pas supposé fonctionner en théorie — voir FRB-002.

## 4. Modèle de rendement

Vit dans `packages/scoring-engine/yield-model/` (consommé par le scoring). Documentation complète : [`packages/scoring-engine/README.md`](../../packages/scoring-engine/README.md).

## 5. Points de vigilance

- Ne pas chercher une précision scientifique irréaliste — une fourchette large et honnête plutôt qu'un chiffre précis et faux.
- Garder trace des sources par substrat (voir `docs/donnees/dictionnaire-de-donnees.md`, table `yield_reference`).

## 6. Setup local

```bash
npm install
npm run dev
```
