# Paiement, partenariats et modèle économique — `packages/payments/`

> Propriétaire : Dev 2
> Dépend de : `GET /producers/:id/score` — voir [`docs/api/specification.md`](../../docs/api/specification.md)
> Consommé par : `apps/backend/src/payments/`
> Voir aussi : [`PARTNERSHIPS.md`](./PARTNERSHIPS.md) · [`PITCH-OBJECTIONS.md`](./PITCH-OBJECTIONS.md)

## 1. Rôle de ce module

Réalise FR-007. Transforme le score de confiance en versement Mobile Money et en dossier finançable.

Ce package est **pur** : aucun accès base, aucune dépendance NestJS — même découpage que `packages/scoring-engine/`. La persistance et l'orchestration vivent dans `apps/backend/src/payments/`.

```
apps/backend/src/payments/     ← orchestration : BR-003, persistance, HTTP
        │
        ▼
packages/payments/             ← ce module : opérateur, idempotence, statuts
        │
        ▼
   opérateur Mobile Money      ← simulé au MVP
```

## 2. Ce que ce module ne fait jamais

- **Il ne décide pas de l'éligibilité.** BR-003 est arbitré par `GET /producers/:id/score`, qu'il consomme.
- **Il ne recalcule jamais un score.**
- **Il ne relance jamais un versement automatiquement.** Après un échec opérateur, on ignore si l'argent est parti : reprise manuelle uniquement (guide-connecteur §3).

## 3. Intégrer un opérateur réel

Un seul point d'extension : implémenter `MobileMoneyProvider`.

```ts
export interface MobileMoneyProvider {
  readonly name: string;
  sendPayout(request: PayoutRequest): Promise<PayoutAcknowledgement>;
}
```

Puis substituer le provider dans `apps/backend/src/payments/payments.module.ts`. **Rien d'autre dans le backend n'a à changer.**

L'implémentation fournie est `SimulatedMobileMoneyProvider` — ⚠️ **aucun argent ne circule**. Elle est déterministe (même intention ⇒ même référence, dans l'esprit d'INV-005) et permet de jouer les chemins d'échec à la demande :

```bash
SIKA_MM_SIMULATION=disponible    # défaut
SIKA_MM_SIMULATION=refus         # l'opérateur refuse → payment `failed`
SIKA_MM_SIMULATION=indisponible  # → ERR-502, versement en quarantaine
```

## 4. Idempotence — la garantie centrale

Un doublon ici, c'est de l'argent versé deux fois : irrattrapable. Trois filets, du plus fiable au moins fiable :

| Filet | Mécanisme | Fiabilité |
|---|---|---|
| 1 | `idempotencyKey` explicite fournie par l'appelant | La meilleure — à privilégier |
| 2 | Clé dérivée de `producteur + montant + fenêtre horaire` | Limite connue : deux demandes encadrant une frontière de fenêtre produisent deux clés |
| 3 | Index unique `payments_idempotency_key_uniq` en base | Dernier recours, tranche les courses |

La ligne `payments` est **réservée avant** l'appel à l'opérateur : si le processus meurt pendant l'appel, la trace existe déjà et la clé bloque toute reprise automatique.

## 5. Checkpoint et quarantaine (guide-connecteur §3)

- `status` ne passe à `completed` **qu'après confirmation explicite** de l'opérateur. Un `pending` reste `initiated` — jamais de `completed` optimiste. Une contrainte en base interdit un `completed` sans `completed_at`.
- Un échec conserve sa raison dans `failure_detail` pour permettre une relance **manuelle**.

## 6. Modèle économique

Le modèle chiffré vit dans [`BUSINESS-MODEL.md`](./BUSINESS-MODEL.md), **généré**
par `npm run business-model`. Aucun chiffre n'y est écrit à la main : chaque
hypothèse porte son statut et sa source, toute l'arithmétique est dérivée.

| Phase | Source de revenu | Statut réel |
|---|---|---|
| Phase 1 | Subvention / contrat pilote MMPE | **Priorité** — seule voie qui couvre les coûts |
| Phase 1 | Commission sur crédit (IMF) | Aucune IMF contactée. Ne couvre pas le coût du suivi (§7 du modèle) — argument de traction, pas ligne de recette |
| Phase 2+ | Frais de vérification carbone | Non activée, volontairement hors des chiffres |

Trois inconnues portent tout le modèle : le coût réel d'une visite terrain, la
part de producteurs franchissant le seuil D1, et qui supporte la commission
Mobile Money. Voir `BUSINESS-MODEL.md` §10.

## 7. Points de vigilance

- BR-004 : ne jamais présenter un partenariat comme signé sans preuve écrite — voir `PARTNERSHIPS.md`. À ce jour, **aucun partenariat n'est signé**.
- L'intégration Mobile Money est **simulée**. La conformité BCEAO/UEMOA n'a été vérifiée qu'en grandes lignes, pas validée juridiquement (SECURITY.md §5).
- Ne jamais loguer en clair une référence de transaction ni un numéro de téléphone.
- Rester synchronisé avec Dev 1 sur ce que le score peut réellement garantir — les seuils D1-D3 ne sont pas ratifiés (`docs/decisions/DECISIONS-DEV2.md`). **D1 n'est pas qu'un réglage technique : il détermine la part de producteurs éligibles, donc la recette.** Il ne devrait pas être arbitré sans Dev 2.
- **Aucun opérateur Mobile Money n'est identifié.** Trois questions bloquantes à lui poser par écrit — dont « qui supporte la commission » — sont listées dans `PARTNERSHIPS.md` §2.
- Les chiffres de `BUSINESS-MODEL.md` sont **dérivés d'hypothèses, pas mesurés**. Ne jamais les citer sans leur statut.

## 8. Setup local

```bash
npm install
npm test               # 16 tests
npm run build          # compilation TypeScript vers dist/
npm run business-model # régénère BUSINESS-MODEL.md depuis les hypothèses
```
