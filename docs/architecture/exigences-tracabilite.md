# Exigences de traçabilité

> Question à laquelle ce document répond : quel composant possède chaque garantie ?
> Ce document est la source de vérité pour "qui doit corriger quoi" si un `FR-xxx`, `INV-xxx` ou `BR-xxx` est violé.

## Matrice de traçabilité

| Identifiant | Description courte | Composant propriétaire | Dev responsable | Vérifié par |
|---|---|---|---|---|
| FR-001 | Déclaration structurée | `apps/backend/src/declarations/`, `apps/field-app/` | Dev 1 (API), Dev 3 (UI) | FRB-003 |
| FR-002 | Capture lecture compteur | `apps/field-app/`, `apps/backend/src/anti-fraud/` | Dev 3 (capture), Dev 1 (vérif) | FRB-001, INV-002 |
| FR-003 | Calcul du score | `packages/scoring-engine/` | Dev 1 | FRB-004, INV-005 |
| FR-004 | Génération d'alerte | `packages/scoring-engine/`, `apps/backend/src/scoring/` | Dev 1 | BR-001, BR-002, FRB-005 |
| FR-005 | Consultation score/historique | `apps/backend/src/scoring/`, `apps/dashboard/` | Dev 1 (API), non attribué (UI) | — |
| FR-006 | Rôles et permissions | `apps/backend/src/auth/` | Dev 1 | FRB-008 |
| FR-007 | Versement Mobile Money | `packages/payments/`, `apps/backend/src/payments/` | Dev 2 | BR-003 — 16 tests |
| FR-008 | Fonctionnement hors-ligne | `apps/field-app/` | Dev 3 | FRB-002 |
| FR-009 | Référentiel de rendement | `packages/scoring-engine/yield-model/` | Dev 3 | INV-004, FRB-006 |
| FR-010 | Priorisation d'audits | `apps/backend/src/scoring/`, `apps/dashboard/` | Dev 1 (API), non attribué (UI) | — |
| INV-001 | Unicité compteur/producteur | `apps/backend/src/producers/` | Dev 1 | ERR-409-METER-ALREADY-ASSIGNED |
| INV-002 | Origine métadonnées capture | `apps/field-app/`, `apps/backend/src/anti-fraud/` | Dev 3, Dev 1 | FRB-001 |
| INV-003 | Non-dégradation sous-performance | `packages/scoring-engine/` | Dev 1 | FRB-007 |
| INV-004 | Intégrité référentielle substrat | `apps/backend/src/declarations/`, `yield_reference` | Dev 1, Dev 3 | FRB-006 |
| INV-005 | Déterminisme du score | `packages/scoring-engine/` | Dev 1 | — |
| BR-001 | Sous-performance ≠ fraude | `packages/scoring-engine/` | Dev 1 | FRB-007 |
| BR-002 | Seuil sur-déclaration | `packages/scoring-engine/` | Dev 1 | — |
| BR-003 | Éligibilité Mobile Money | `apps/backend/src/scoring/` (décision), `apps/backend/src/payments/` (application) | Dev 1, Dev 2 | `payments.service.spec.ts`, `scoring.service.spec.ts` |
| BR-004 | Aucun partenariat non prouvé présenté comme signé | Communication (Dev 2), pas de composant technique | Dev 2 | Revue avant chaque pitch |

## Garanties sans composant propriétaire livré

| Identifiant | Manque | Conséquence aujourd'hui |
|---|---|---|
| FR-008, FRB-002 | `apps/field-app/` (Dev 3) | Le mode hors-ligne n'existe pas. L'idempotence côté serveur qui doit l'absorber est en place et testée |
| FR-009 | `yield-model/` (Dev 3) | Référentiel provisoire non calibré, 3 substrats sur 6, coefficient nord sans source |
| FR-005, FR-010 (UI) | `apps/dashboard/` | Les données sont exposées par l'API, rien ne les affiche |
| FRB-001 (complet) | Chaîne d'upload | Voir D11 dans `../decisions/DECISIONS-DEV3.md` |

## Comment utiliser cette matrice

- Un test qui échoue sur `FRB-007` → le responsable est Dev 1, le composant `packages/scoring-engine/`.
- Une nouvelle exigence `FR-011` doit immédiatement obtenir une ligne ici, même si le composant propriétaire n'est pas encore construit — mettre "à définir" plutôt que d'omettre la ligne.
- Si un composant change de propriétaire (ex. Dev 2 reprend une partie de `apps/dashboard/`), mettre à jour cette table dans la même PR que le transfert (voir `developpement/README.md`).
