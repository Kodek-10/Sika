# Paiement, partenariats et modèle économique — `packages/payments/`

> Propriétaire : Dev 2
> Dépend de : `GET /producers/:id/score` exposé par le backend (voir [`apps/backend/docs/API.md`](../../apps/backend/docs/API.md))
> Voir aussi : [`PARTNERSHIPS.md`](./PARTNERSHIPS.md) · [`PITCH-OBJECTIONS.md`](./PITCH-OBJECTIONS.md) · [Guide de collaboration](../../docs/COLLABORATION.md)

## 1. Rôle de ce module

Transformer le prototype technique en dossier finançable. Un score de confiance n'a de valeur que s'il débouche sur quelque chose de concret : un crédit, un paiement, un partenariat.

## 2. Intégration Mobile Money (`src/`)

- Connecter l'API d'un opérateur local pour permettre la redistribution d'incitations aux producteurs les mieux notés.
- Une version simplifiée suffit pour la démo.
- **Point de synchro avec Dev 1** : le déclenchement du paiement lit le score via `GET /producers/:id/score` — ne pas dupliquer la logique de scoring ici, seulement consommer son résultat.
- Vérifier les grandes lignes du cadre réglementaire BCEAO/UEMOA applicables à l'intégration Mobile Money.

## 3. Modèle économique

| Phase | Source de revenu | Statut |
|---|---|---|
| Phase 1 | Subvention / contrat pilote MMPE | Priorité — finance le déploiement initial |
| Phase 1 (en construction) | Commission sur crédit (IMF) | Premiers contacts durant le hackathon |
| Phase 2+ | Frais de vérification ciblée (carbone) | Non activée, nécessite un historique suffisant |

Avoir une réponse chiffrée, même approximative, sur le volume de crédit potentiel débloqué en phase pilote (ordre de grandeur du dossier : 10 à 25 millions FCFA cumulés sur 50-60 producteurs).

## 4. Livrable attendu pour la démo

Une démonstration (même simulée) du versement Mobile Money à un producteur bien noté, et un pitch business clair sur la priorisation des revenus en phase 1.

## 5. Points de vigilance

- Rester synchronisé avec Dev 1 sur ce que le score peut réellement garantir, pour ne pas sur-promettre aux partenaires potentiels.
- Ne pas présenter de chiffre d'impact comme une donnée validée — ce sont des hypothèses de travail à assumer comme telles.

## 6. Setup local

```bash
npm install
npm run dev   # ou la commande de test/démo du module
```
