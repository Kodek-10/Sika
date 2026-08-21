# Scénario MVP — parcours d'intégration commun

> Question à laquelle ce document répond : quel parcours doit fonctionner de bout en bout avant toute fusion vers `main`, et qu'est-ce qu'on montre au jury ?
> Ce scénario est le test d'acceptation final — s'il échoue, on ne fusionne pas vers `main`, quel que soit l'état des tests unitaires.

## 1. Objectif

Démontrer le flux central sur données simulées réalistes : **Déclaration → Relevé compteur → Score en direct → Alerte**, avec une démonstration additionnelle du versement Mobile Money.

## 2. Parcours pas à pas

| Étape | Action | Résultat attendu | Exigence vérifiée |
|---|---|---|---|
| 1 | Un agent crée un producteur avec un compteur assigné | Producteur visible, compteur associé de façon unique | FR-001 (prérequis), INV-001 |
| 2 | Le producteur soumet une déclaration cohérente avec le référentiel (via `apps/field-app/`, y compris hors-ligne puis synchronisée) | Déclaration reçue, score calculé en moins de 5s | FR-001, FR-002, FR-003, FRB-002, FRB-004 |
| 3 | Le score affiché est dans la fourchette normale, aucune alerte | Score visible, pas d'alerte | INV-005 |
| 4 | Le producteur soumet une deuxième déclaration avec une lecture **sous** la fourchette attendue | Alerte `maintenance` générée, **score non dégradé** | BR-001, FRB-007, FRB-005 |
| 5 | Le producteur (ou un autre, pour varier la démo) soumet une déclaration avec une lecture **très supérieure** à la fourchette (+100%+) | Alerte `sur_declaration` générée, score dégradé, priorité d'audit visible | BR-002, FR-004, FR-010 |
| 6 | Un agent/MMPE consulte `GET /alerts` | Les deux alertes précédentes apparaissent, correctement typées | FR-010 |
| 7 | Un agent déclenche un versement pour un producteur éligible (score au-dessus du seuil, sans alerte non résolue) | Versement simulé initié, réponse cohérente | FR-007, BR-003 |
| 8 | (Tentative) déclencher un versement pour un producteur avec alerte non résolue | Refusé | BR-003 |

## 3. Checklist avant présentation au jury

- [ ] Étapes 1 à 8 exécutées sans erreur sur environnement local ou de démo.
- [ ] Distinction visuelle alerte `maintenance` vs `sur_declaration` vérifiée à l'œil (FRB-005).
- [ ] Mode hors-ligne testé réellement (réseau coupé physiquement, pas juste supposé) sur au moins une déclaration.
- [ ] Les seuils utilisés (±15%, +100%) peuvent être expliqués à l'oral avec leur justification (voir `../architecture/contrat-systeme.md`).
- [ ] Le statut réel des partenariats IMF/MMPE (voir `packages/payments/PARTNERSHIPS.md`) est cohérent avec ce qui sera dit à l'oral (BR-004).

## 4. Ce que ce scénario ne couvre pas (assumé pour le hackathon)

- Vérification carbone certifiée.
- Volume réel de producteurs (le scénario fonctionne avec 1 à 2 producteurs de test).
- Résilience à la charge (non pertinent pour une démo).

## 5. Règle de fusion

Ce scénario doit être rejoué manuellement avant toute fusion d'une branche `feat/*` vers `dev`, si la branche touche au flux central (déclarations, scoring, alertes, paiement). Une fusion qui casse ce parcours est bloquante, indépendamment des tests unitaires individuels.
