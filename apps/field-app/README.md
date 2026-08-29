# Field App (PWA offline-first) — `apps/field-app/`

> Propriétaire : Dev 3
> Dépend de : `apps/backend/` (API), `packages/shared-types/` (types)
> Voir aussi : [`docs/exigences-produit/logiciel.md`](../../docs/exigences-produit/logiciel.md) · [`docs/guide-connecteur/README.md`](../../docs/guide-connecteur/README.md)

## 1. Rôle de ce module

Réalise FR-001 (UI), FR-002, FR-008. Porte la crédibilité terrain (app utilisable sans réseau).

**Implémenté** ✅ — PWA React + Vite, offline-first avec IndexedDB.

## 2. Écrans / fonctionnalités (`src/`)

| Module | Rôle | Exigences |
|---|---|---|
| `DeclarationPage` | Formulaire quantité/type/durée + capture | FR-001, FRB-003 |
| `ScorePage` | Jauge score + éligibilité | FR-005 |
| `HistoryPage` | Historique déclarations | FR-005 |
| `QueuePage` | File d'attente locale + statut sync | FR-008, FRB-002 |
| `AppContext` | Offline sync, localStorage queue | FR-008, FRB-002 |
| `api.ts` | Client HTTP vers `apps/backend/` | FR-001 à FR-010 |

## 3. Stack

- **React 19 + TypeScript** via Vite
- **PWA** : service worker + manifest.json
- **Offline** : localStorage pour la file d'attente, IndexedDB ready
- **Proxy** : `/api` → `http://localhost:3000`

## 4. Setup local

```bash
npm install
npm run dev       # port 3001, proxy vers backend :3000
npm run build
```

## 5. À faire

- [ ] Remplacer la navigation par ID producteur par l'authentification (`POST /auth/login`)
- [ ] Intégrer `packages/shared-types/` pour les types partagés
- [ ] Tester le mode hors-ligne réel (réseau coupé physiquement) — FRB-002
- [ ] Vérification photo : lien avec `POST /photos` (D9) une fois implémenté côté backend
- [ ] Ajouter le store IndexedDB pour persistance plus fiable que localStorage
- [ ] Améliorer le design conformément à `docs/design/identite-visuelle.md`