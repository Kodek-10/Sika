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
  ⚠️ **Écart connu** : les e2e actuels tournent sur la base de dev locale (`test/helpers.ts`), avec des données uniques par exécution (suffixe horodaté) pour rester idempotents. C'est un compromis assumé au stade hackathon, pas la cible — à corriger avant toute exécution en CI.
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
| Idempotence `POST /payments/payout` | Guide connecteur, section 3 | Un doublon = de l'argent versé deux fois, irrattrapable |
| Alerte `maintenance` ne bloque pas l'éligibilité | BR-003 (D3), BR-001 | Bloquer un versement sur une sous-performance revient à sanctionner un producteur mal équipé |
| Conformité SQL ↔ schéma des migrations | — | Un mock ne peut pas détecter une colonne inexistante : il reproduit l'erreur du code. C'est exactement ce qui a laissé passer le bug `meter_reading_m3` |

## 4. Gardes de pull request

Une PR n'est pas mergeable dans `dev` si :
- Un test de la liste "obligatoire" (section 3) échoue.
- Un endpoint a été modifié sans mise à jour de `../api/specification.md` et `../api/README.md`.
- Un champ de donnée a été modifié sans mise à jour de `../donnees/dictionnaire-de-donnees.md`.
- Le `README.md` du module modifié n'a pas été mis à jour en conséquence.

## 5. Statut actuel

**96 tests automatisés** au total, tous verts.

| Suite | Emplacement | Tests | Couvre |
|---|---|---|---|
| Moteur de scoring | `packages/scoring-engine/tests/` | 16 | FRB-007, BR-001, BR-002, INV-003, INV-005 |
| Paiement (package pur) | `packages/payments/tests/` | 16 | Idempotence, cartographie des statuts, chemins d'échec |
| Backend — scoring & éligibilité | `apps/backend/tests/scoring.service.spec.ts` | 24 | BR-003, FR-010, tendance, `resolveAlert` |
| Backend — déclarations | `apps/backend/tests/declarations.service.spec.ts` | 12 | FR-001, FR-002, idempotence, FRB-008 |
| Backend — anti-fraude | `apps/backend/tests/anti-fraud.service.spec.ts` | 12 | INV-002, FRB-001 (partiel — voir D11) |
| Backend — paiement | `apps/backend/tests/payments.service.spec.ts` | 16 | FR-007, BR-003, checkpoint, quarantaine |
| Conformité SQL ↔ schéma | `apps/backend/tests/sql-schema.spec.ts` | 3 | Garde-fou anti-« mock menteur » |
| E2E HTTP | `apps/backend/test/` | 13 | FRB-008 (partiel), auth, producteurs, alertes |

```bash
cd packages/scoring-engine && npm test
cd packages/payments      && npm test
cd apps/backend           && npm test      # unitaires
cd apps/backend           && npm run test:e2e   # nécessite docker + migrations + seeds
```

**Ce qui n'est PAS couvert**, et doit être dit comme tel :
- FRB-002 (file d'attente hors-ligne) : **test manuel documenté** `FRB-002-offline-test.md` (field-app existe, `AppContext` + `localStorage`, idempotence vérifiée) — pas d'automatisation.
- FRB-003 (validation du formulaire) : côté UI, partiellement (bornes `CreateDeclarationDto`, mais pas de tests UI).
- FRB-005 (distinction visuelle des alertes) : aucune interface (dashboard manquant).
- FRB-001 : couvert **partiellement** — `POST /photos` basique livré, HMAC/EXIF en attente D11.
- Le scénario de démo bout-en-bout n'a jamais été exécuté contre une vraie base sur cette machine (Docker absent de l'environnement de développement utilisé pour ce lot).
