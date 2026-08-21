# Paiement, partenariats et modèle économique — `packages/payments/`

> Propriétaire : Dev 2
> Dépend de : `GET /producers/:id/score` — voir [`docs/api/specification.md`](../../docs/api/specification.md)
> Voir aussi : [`PARTNERSHIPS.md`](./PARTNERSHIPS.md) · [`PITCH-OBJECTIONS.md`](./PITCH-OBJECTIONS.md)

## 1. Rôle de ce module

Réalise FR-007. Transforme le score de confiance en versement Mobile Money et en dossier finançable.

## 2. Intégration Mobile Money

- Connecter l'API d'un opérateur local, version simplifiée acceptable pour la démo (voir `docs/demo/scenario-mvp.md`).
- **Ne recalcule jamais le score** — consomme uniquement `GET /producers/:id/score` (contrat critique inter-devs, voir `docs/api/README.md`).
- Éligibilité régie par BR-003 (score ≥ seuil ET aucune alerte non résolue) — voir `docs/architecture/contrat-systeme.md`.
- Vérifier les grandes lignes du cadre BCEAO/UEMOA applicables à Mobile Money.

## 3. Modèle économique

| Phase | Source de revenu | Statut |
|---|---|---|
| Phase 1 | Subvention / contrat pilote MMPE | Priorité |
| Phase 1 (en construction) | Commission sur crédit (IMF) | Premiers contacts en cours |
| Phase 2+ | Frais de vérification carbone | Non activée |

## 4. Points de vigilance

- BR-004 : ne jamais présenter un partenariat comme signé sans preuve écrite — voir `PARTNERSHIPS.md`.
- Rester synchronisé avec Dev 1 sur ce que le score peut réellement garantir (voir point de synchro dans `docs/developpement/README.md`).

## 5. Setup local

```bash
npm install
npm run dev
```
