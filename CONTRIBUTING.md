# Contribuer à Sika

> Ce document résume comment contribuer au repo. Le détail complet de la routine d'équipe est dans [`docs/developpement/README.md`](./docs/developpement/README.md) — ce fichier n'en est qu'un point d'entrée standard, pour quiconque (jury, mentor, futur contributeur) ouvre le repo pour la première fois.

## 1. Avant de contribuer

- Lire [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) pour comprendre le flux central du produit.
- Lire [`docs/README.md`](./docs/README.md) et suivre le parcours de lecture recommandé (numéroté 0 à 7) avant de toucher au code — la documentation est la source de vérité, pas une formalité a posteriori.
- Vérifier la propriété du module que tu veux modifier dans [`docs/architecture/README.md`](./docs/architecture/README.md). Ne touche pas au dossier de quelqu'un d'autre sans accord explicite.

## 2. Stratégie de branches

```
main    # toujours démontrable, jamais cassé
 └── dev # intégration continue
      └── feat/devN-nom-court-de-la-tache
```

- Jamais de commit direct sur `main` ou `dev`.
- Nommage de branche : `feat/devN-nom-court` (ex: `feat/dev1-scoring-engine`).
- Nommage de commit : `[devN] verbe à l'infinitif + description courte`.

## 3. Avant d'ouvrir une pull request

Une PR n'est acceptée que si :
- [ ] Le `README.md` du module modifié est à jour.
- [ ] Tout endpoint ajouté/modifié/supprimé est reflété dans [`docs/api/specification.md`](./docs/api/specification.md) **et** [`docs/api/README.md`](./docs/api/README.md) (registre producteur-consommateur).
- [ ] Tout champ de donnée modifié est reflété dans [`docs/donnees/dictionnaire-de-donnees.md`](./docs/donnees/dictionnaire-de-donnees.md) et sa migration.
- [ ] Tout invariant (`INV-*`) ou règle métier (`BR-*`) modifié est reflété dans [`docs/architecture/contrat-systeme.md`](./docs/architecture/contrat-systeme.md), [`docs/architecture/exigences-tracabilite.md`](./docs/architecture/exigences-tracabilite.md), et les tests liés.
- [ ] Les cas de test obligatoires listés dans [`docs/test/README.md`](./docs/test/README.md) passent, en particulier tout ce qui touche BR-001/INV-003 (sous-performance ≠ fraude).
- [ ] Si la branche touche au flux central (déclaration, scoring, alertes, paiement), le [`docs/demo/scenario-mvp.md`](./docs/demo/scenario-mvp.md) a été rejoué manuellement.

## 4. Points de synchronisation à respecter

Certains contrats sont marqués "critique inter-devs" dans [`docs/api/README.md`](./docs/api/README.md) — ne jamais les modifier (endpoint, signature de fonction partagée) sans prévenir la ou les personnes concernées au préalable. Voir la liste complète et le rythme recommandé dans [`docs/developpement/README.md`](./docs/developpement/README.md) section 4.

## 5. Décisions structurantes

Toute décision qui change une architecture, un choix technique fondamental, ou un arbitrage produit significatif doit être consignée dans un ADR — voir [`docs/adr/README.md`](./docs/adr/README.md). Ne jamais supprimer un ADR existant, même remplacé.

## 6. Signaler un problème de sécurité

Ne pas ouvrir d'issue publique pour une vulnérabilité — voir [`SECURITY.md`](./SECURITY.md).
