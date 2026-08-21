# Sika — Cadrage du projet

> Infrastructure de confiance pour la filière biogaz — SIREXE Hackathon 2026 (Prix Thématique MMPE)
> Anciennement nommé BioTrust.

## 1. Problème

Un producteur de biogaz en Côte d'Ivoire (éleveur, restaurant collectif, coopérative agricole) ne peut aujourd'hui prouver sa production réelle à une institution financière. Sans preuve fiable, pas de crédit, pas de paiement à la performance, pas de vérification carbone. L'IoT électronique complet est trop coûteux pour être déployé à l'échelle visée.

## 2. Solution

Sika combine trois éléments pour produire une preuve de production exploitable sans capteur électronique :
1. Une **déclaration structurée** faite par le producteur ou un agent terrain.
2. Un **relevé mécanique low-cost** (compteur à bulles) photographié in-app.
3. Un **moteur de scoring de cohérence** qui croise ces deux sources avec un modèle de rendement scientifique pour détecter les incohérences.

## 3. Le flux central

```
Déclaration → Relevé compteur → Score en direct → Alerte
```

Toute décision de cadrage se juge à l'aune de ce flux. Un composant isolé, même sophistiqué, qui ne s'y connecte pas n'a pas de valeur pour la démo de sélection SIREXE (1-8 septembre 2026).

## 4. Périmètre du MVP hackathon

**Dans le périmètre** : le flux central bout en bout (même sur données simulées réalistes), un moteur de scoring fonctionnel avec les 4 signaux, une démonstration simulée du versement Mobile Money, un pitch business chiffré.

**Hors périmètre explicite pour la sélection** : intégration Mobile Money en production, dashboard IMF complet, mesure croisée terrain réelle (prévue en phase de présélection, oct. 2026), calibration scientifique définitive du modèle de rendement.

## 5. Équipe et propriété

| Rôle | Domaine | Documents de référence |
|---|---|---|
| Dev 1 | Backend, moteur de scoring, sécurité | `apps/backend/`, `packages/scoring-engine/` (hors `yield-model/`) |
| Dev 2 | Paiement, partenariats, modèle économique | `packages/payments/` |
| Dev 3 | Calibration scientifique, flux déclaratif terrain | `apps/field-app/`, `packages/scoring-engine/yield-model/` |

L'équipe n'a pas encore tranché si elle recrute un 4e profil (design/UX ou connaissance sectorielle agricole/microfinance) ou reste à 3 avec de l'advisory ponctuel.

## 6. Comment lire la suite de la documentation

Ce document donne le cadrage initial. Toute la documentation détaillée (exigences, architecture, API, tests) vit dans `docs/` et suit un parcours de lecture recommandé — voir [`docs/README.md`](./docs/README.md).
