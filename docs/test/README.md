# Tests

> Question à laquelle ce document répond : quels tests garantissent quoi, et qu'est-ce qui bloque une pull request ?

## 1. Niveaux de tests

| Niveau | Portée | Exemple | Outil (proposé) |
|---|---|---|---|
| Unitaire | Une fonction/module isolé | `packages/scoring-engine/` : cas cohérent, sur-déclaration, sous-performance (FRB-007) | Jest |
| Intégration | Plusieurs modules via API réelle | `POST /declarations` → recalcul de score → `GET /producers/:id/score` | Jest + Supertest, DB de test |
| Manuel documenté | Comportement non automatisable facilement | FRB-002 (couper le réseau réellement sur `apps/field-app/`) | Checklist manuelle, résultat consigné |
| Bout-en-bout démo | Le flux central complet | Voir `../demo/scenario-mvp.md` | Exécution manuelle avant chaque démo |

## 2. Montages (fixtures)

- Base de données de test isolée, réinitialisée entre chaque suite (jamais la base de dev partagée).
- Jeu de données simulées réalistes pour `yield_reference` (au moins 3 substrats avec sources documentées) — propriété de Dev 3, à ne pas modifier sans le prévenir.
- Comptes de test par rôle (`producteur`, `agent`, `imf`, `mmpe`) pour couvrir la matrice de permissions (FRB-008).

## 3. Cas de test obligatoires (ne jamais retirer)

| Test | Vérifie | Pourquoi il est non négociable |
|---|---|---|
| Sous-performance ne dégrade pas le score | FRB-007, BR-001, INV-003 | Règle métier la plus sensible du projet — une régression ici pénalise injustement des producteurs honnêtes |
| Substrat inconnu rejeté | FRB-006, INV-004 | Évite un score silencieusement faux |
| Photo importée (non capturée in-app) refusée | FRB-001, INV-002 | Cœur du dispositif anti-fraude |
| Rôle insuffisant refusé sur chaque endpoint protégé | FRB-008 | Fuite de données sensibles sinon (scores producteurs, alertes) |
| Idempotence `POST /declarations` sur re-synchronisation | Guide connecteur, section 2 | Évite les doublons de déclaration après coupure réseau terrain |

## 4. Gardes de pull request

Une PR n'est pas mergeable dans `dev` si :
- Un test de la liste "obligatoire" (section 3) échoue.
- Un endpoint a été modifié sans mise à jour de `../api/specification.md` et `../api/README.md`.
- Un champ de donnée a été modifié sans mise à jour de `../donnees/dictionnaire-de-donnees.md`.
- Le `README.md` du module modifié n'a pas été mis à jour en conséquence.

## 5. Statut actuel

Aucun test n'est encore implémenté (code non initialisé — voir `../README.md` section Statut actuel). Cette section sera mise à jour avec la couverture réelle au fur et à mesure.
