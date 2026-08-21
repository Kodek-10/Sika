# ADR-0002 — Séparation du moteur de scoring et du modèle de rendement

**Statut** : Actif

## Contexte

Le moteur de scoring (orchestration des 4 signaux, seuils, règles métier BR-001/BR-002) et le modèle de rendement (table de référence par substrat, coefficients climatiques) sont maintenus par deux personnes différentes (Dev 1 et Dev 3), qui itèrent à des rythmes très différents : le moteur de scoring se stabilise vite, le modèle de rendement va continuer à évoluer bien après le hackathon (mesure croisée terrain prévue en octobre 2026).

## Options considérées

1. **Un seul module fusionné**, maintenu conjointement par Dev 1 et Dev 3.
2. **Deux modules séparés avec une interface stable** (`packages/scoring-engine/` et `packages/scoring-engine/yield-model/`), communication uniquement via une fonction contractuelle (`estimateExpectedYield()`).

## Décision

Option 2, avec interface contractuelle documentée dans `packages/scoring-engine/README.md`.

## Justification

Une fusion créerait un couplage fort entre deux rythmes d'itération différents : chaque ajustement de coefficient par Dev 3 obligerait à retoucher/retester le module de Dev 1, ralentissant les deux. L'interface stable permet à Dev 3 de faire évoluer les valeurs (et même d'ajouter des substrats) sans que Dev 1 ait à modifier son code — seule une évolution de la **signature** de l'interface nécessite une synchronisation explicite (voir point de synchro dans `../developpement/README.md`).

## Conséquences

- Dev 1 ne doit jamais accéder directement à `yield_reference` en base ni hardcoder une valeur de coefficient — toujours passer par `estimateExpectedYield()`.
- Toute évolution de signature de cette fonction est un événement à annoncer, pas une modification silencieuse (voir registre `../api/README.md`, section contrats internes).
- Ce découpage a un coût : légère indirection supplémentaire pour toute modification qui toucherait réellement les deux côtés en même temps (cas rare, mais possible si la structure même du scoring change).
