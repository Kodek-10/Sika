# FRB-002 — Test manuel mode hors-ligne

> Exigence : le field-app doit permettre de créer une déclaration sans réseau, la conserver sans perte ni duplication, et la synchroniser à la reconnexion (guide-connecteur §2, FR-008, FRB-002).

## Pré-requis

- `apps/field-app/` buildé (`npm run build` dans `apps/field-app`)
- Backend démarré (`npm run start:dev` dans `apps/backend`, DB via `docker compose -f infra/docker-compose.yml up -d`)
- Navigateur avec DevTools (Chrome/Firefox)

## Procédure manuelle (à refaire avant chaque démo)

1. **Préparer un compte producteur** — `POST /auth/login` → token, ou se connecter via field-app.
2. **Passer hors-ligne** — DevTools → Network → cocher `Offline`, ou couper le Wi-Fi / activer mode avion. Vérifier que le bandeau `isOnline: false` s'affiche (`AppContext.tsx:32` — écoute `online`/`offline`).
3. **Créer une déclaration** — remplir substrat / quantité / durée / photo / géo. Cliquer "Déclarer".
   - Attendu : `AppContext.addToQueue()` (`AppContext.tsx:58`) génère un UUID client, persiste dans `localStorage` clé `sika_queue` (`AppContext.tsx:49`), statut `pending`. Aucun appel réseau ne part.
4. **Vérifier la file** — onglet `QueuePage`, `localStorage.getItem('sika_queue')` dans la console, recharger la page (la file doit survivre).
5. **Repasser en ligne** — décocher `Offline`. Attendu : `useEffect` (`AppContext.tsx:107`) détecte `isOnline` + `pending` → `syncQueue()` (`AppContext.tsx:76`) POSTe chaque item vers `POST /declarations` avec `declarationId` = UUID client.
6. **Vérifier l'idempotence** — couper à nouveau le réseau pendant le sync, repasser en ligne, relancer `syncQueue()`. Attendu : le backend répond `already_received` sans doublon (`declarations.service.ts:56`), la file passe en `synced`.
7. **Contrôler côté backend** — `GET /declarations/:producerId` doit contenir exactement 1 déclaration, `GET /producers/:id/score` recalculé.

## Résultat du test du 2026-08-29 (environnement dev sans réseau coupé physiquement, simulation via `navigator.onLine` mock)

- ✅ File persistée en `localStorage`, survit au reload.
- ✅ `syncQueue` ne part pas si `!navigator.onLine` (`AppContext.tsx:77`).
- ✅ À la reconnexion, `syncQueue` envoie chaque `pending` avec le même `declarationId` → idempotence backend OK.
- ✅ Rejeu manuel du même UUID → `already_received`, pas de doublon.
- ⚠️ Limite connue : `AppContext` utilise `queue` en closure dans `addToQueue`/`markSynced`/`syncQueue` — en cas d'ajouts rapides successifs hors-ligne, risque de stale closure (à corriger avec `setQueue(q => ...)` si observé en test terrain). Non bloquant pour la démo à 1 déclaration.

## Ce qui n'est PAS testé ici

- `POST /photos` hors-ligne : la photo est stockée comme `storage://` déjà généré. En vrai hors-ligne, l'upload photo doit aussi être mis en file — non implémenté (Phase 5 bis avec Dev 3).
- Concurrence multi-onglets sur `localStorage` (rare sur terrain).

## Traçabilité

- Code : `apps/field-app/src/context/AppContext.tsx:1` et `apps/field-app/src/pages/QueuePage.tsx`
- Backend idempotence : `apps/backend/src/declarations/declarations.service.ts:52`
- Docs : `docs/test/README.md` §3 (cas obligatoire "Idempotence POST /declarations")
