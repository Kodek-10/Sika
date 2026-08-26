# Documentation Sika

Ce dossier transforme le cadrage de `PROJECT_OVERVIEW.md` en contrats de produit et d'ingénierie traçables.

## Documents de travail quotidiens

| Document | Usage |
|---|---|
| [`developpement/README.md`](./developpement/README.md) | Routine des trois développeurs, transferts et statuts des contrats |
| [`api/README.md`](./api/README.md) | Registre producteur-consommateur des contrats HTTP |
| [`donnees/dictionnaire-de-donnees.md`](./donnees/dictionnaire-de-donnees.md) | Noms, types, énumérations, relations et propriété des données |
| [`guide-connecteur/README.md`](./guide-connecteur/README.md) | Extraction, cartographie, idempotence, checkpoint et quarantaine |
| [`architecture/README.md`](./architecture/README.md) | Limites de modules et responsables d'implémentation |
| [`test/README.md`](./test/README.md) | Niveaux de tests, montages et gardes de pull request |
| [`demo/scenario-mvp.md`](./demo/scenario-mvp.md) | Parcours d'intégration commun avant fusion vers `main` |

## Parcours recommandé

| Ordre | Document | Question |
|---|---|---|
| 0 | `PROJECT_OVERVIEW.md` | Quelle est la technique de cadrage initiale ? |
| 1 | [`produit/exigences-produit.md`](./produit/exigences-produit.md) | Que construit-on, pour qui et dans quel périmètre ? |
| 2 | [`exigences-produit/logiciel.md`](./exigences-produit/logiciel.md) | Quel comportement précis doit être testable ? |
| 3 | [`architecture/contrat-systeme.md`](./architecture/contrat-systeme.md) | Qu'est-ce qui ne doit jamais devenir faux ? |
| 4 | [`architecture/exigences-tracabilite.md`](./architecture/exigences-tracabilite.md) | Quel composant possède chaque garantie ? |
| 5 | [`architecture/architecture-systeme.md`](./architecture/architecture-systeme.md) | Comment le système est-il organisé ? |
| 6 | [`api/specification.md`](./api/specification.md) | Quels contrats HTTP relient le frontend et le backend ? |
| 7 | [`design/identite-visuelle.md`](./design/identite-visuelle.md) | Comment l'interface doit-elle se présenter et se comporter ? |

Les index `produit/`, `architecture/`, `api/` et `design/` permettent également une lecture directe par domaine.

Les décisions structurantes sont conservées dans [`adr/`](./adr/).

## Règles de maintenance

- Ne changez pas la signification d'un identifiant `FR-*`, `INV-*`, `BR-*`, `ERR-*` ou `FRB-*` déjà utilisé.
- Ajoutez un nouvel identifiant pour une nouvelle exigence ; marquez explicitement les exigences retirées ou remplacées (ne les supprimez pas silencieusement).
- Une modification d'invariant doit être répercutée dans les documents 3, 4, 5 et dans les tests liés.
- Une modification du contrat API doit mettre à jour `api/specification.md`, l'OpenAPI et les consommateurs, dans la même pull request.
- Une modification du modèle canonique doit mettre à jour le dictionnaire de données, la migration, l'OpenAPI et les fixtures concernées.
- Un contrat partagé doit indiquer son producteur, ses consommateurs, son statut et sa preuve de vérification.
- Une décision structurante doit avoir un ADR. Ne supprimez pas les ADR historiques.
- Les documents décrivent la réalité ou une décision explicite. Les hypothèses sont nommées comme telles et ratifiées avant la mise en œuvre du domaine concerné.

## Statut actuel

| Domaine | État |
|---|---|
| `apps/backend/` | **Implémenté** — auth, producteurs, déclarations, scoring, alertes, paiement. 11 endpoints |
| `packages/scoring-engine/` | **Implémenté** — moteur pur, 4 signaux, 16 tests |
| `packages/payments/` | **Implémenté** — opérateur **simulé**, idempotence, 16 tests |
| `infra/` | **Implémenté** — 5 migrations, compose PostgreSQL + MinIO, seeds |
| `packages/scoring-engine/yield-model/` | **Non livré** (Dev 3) — adaptateur provisoire côté backend, référentiel non calibré |
| `apps/field-app/` | **Non démarré** (Dev 3) — bloque FR-008, FRB-002, FRB-003, FRB-005 |
| `apps/dashboard/` | **Non démarré**, non attribué |
| `packages/shared-types/` | **Non démarré** |

96 tests automatisés, tous verts. Le flux central `Déclaration → Relevé → Score → Alerte` est complet **côté API** ; il n'a pas encore d'interface, et n'a jamais été rejoué contre une base réelle sur la machine ayant produit ce lot (Docker indisponible).

Les mesures de performance (FRB-004) et les détails de production restent à établir avec preuves.
