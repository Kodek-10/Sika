# Exigences logicielles (comportement testable)

> Question à laquelle ce document répond : quel comportement précis doit être testable ?
> Identifiants `FRB-xxx` (Field Requirement — Behavior). Chaque `FRB-xxx` doit être vérifiable par un test automatisé ou une procédure manuelle documentée dans `test/README.md`.

## FRB-001 — Origine de la photo de compteur
La capture d'une lecture de compteur doit être **refusée** si elle ne provient pas de l'appareil photo intégré à l'app (pas d'import depuis la galerie).
**Vérifie** : FR-002, INV-002. **Type de test** : test d'intégration sur `apps/field-app/`, vérification côté backend que le fichier reçu porte les métadonnées attendues.

## FRB-002 — File d'attente hors-ligne
Une déclaration créée sans connexion doit être conservée en file d'attente locale et synchronisée automatiquement à la reconnexion, **sans perte ni duplication**.
**Vérifie** : FR-008. **Type de test** : test manuel (couper le réseau réellement, pas seulement en théorie) + test automatisé sur la logique de queue.

## FRB-003 — Validation du formulaire de déclaration
Le formulaire de déclaration ne doit pas permettre la soumission si un champ obligatoire (substrat, quantité, durée) est vide ou hors plage plausible.
**Vérifie** : FR-001. **Type de test** : test unitaire frontend.

## FRB-004 — Latence de mise à jour du score
Le score affiché doit se mettre à jour en moins de 5 secondes après réception d'une déclaration valide, dans le contexte de démo (données simulées, environnement local).
**Vérifie** : FR-003. **Type de test** : test d'intégration chronométré sur le flux `POST /declarations` → `GET /producers/:id/score`.

## FRB-005 — Distinction visuelle des types d'alerte
Une alerte de type `maintenance` doit être visuellement distincte d'une alerte `sur_declaration` dans toutes les interfaces qui les affichent (dashboard, éventuelle notification).
**Vérifie** : FR-004, BR-001. **Type de test** : revue visuelle manuelle avant démo, checklist dans `demo/scenario-mvp.md`.

## FRB-006 — Rejet d'un substrat inconnu
Une déclaration référençant un substrat absent du référentiel `yield_reference` doit être rejetée avec `ERR-422-UNKNOWN-SUBSTRATE`, pas silencieusement acceptée avec un score par défaut.
**Vérifie** : FR-001, FR-009, INV-004. **Type de test** : test unitaire backend.

## FRB-007 — Non-dégradation du score en cas de sous-performance
Un cas de test doit démontrer explicitement qu'une lecture sous la fourchette attendue déclenche une alerte `maintenance` **sans** faire baisser la valeur du score au même cycle de calcul.
**Vérifie** : BR-001, INV-003. **Type de test** : test unitaire du moteur de scoring — cas obligatoire, à ne jamais retirer de la suite de tests.

## FRB-008 — Vérification des permissions par rôle
Chaque endpoint protégé doit refuser une requête si le rôle de l'appelant n'est pas dans la liste autorisée, y compris si le token est valide mais le rôle insuffisant.
**Vérifie** : FR-006. **Type de test** : test d'intégration par endpoint, matrice rôle × endpoint dans `test/README.md`.

## Statut de couverture

| FRB-xxx | Testé | Preuve |
|---|---|---|
| FRB-001 | **Partiellement** | `apps/backend/tests/anti-fraud.service.spec.ts` — le serveur vérifie que la photo vient du stockage Sika, il ne peut pas encore prouver qu'elle vient de l'appareil intégré. Voir `docs/decisions/DECISIONS-DEV3.md` (D11) |
| FRB-002 | Non | `apps/field-app/` n'existe pas |
| FRB-003 | Non (UI) | Validation équivalente côté serveur : `apps/backend/src/declarations/dto/create-declaration.dto.ts` |
| FRB-004 | Non mesuré | Le flux `POST /declarations` → `GET /producers/:id/score` existe ; la latence n'a pas été chronométrée contre une vraie base |
| FRB-005 | Non | Aucune interface |
| FRB-006 | **Oui** | `apps/backend/tests/scoring.service.spec.ts` (adaptateur → ERR-422) + contrainte FK en base |
| FRB-007 | **Oui** | `packages/scoring-engine/tests/engine.test.ts` — cas obligatoire, à ne jamais retirer |
| FRB-008 | **Partiellement** | `apps/backend/test/auth-producers.spec.ts` (e2e) + cloisonnement producteur testé sur déclarations, score et versements. La matrice rôle × endpoint n'est pas exhaustive |

Rappel BR-004 : cette table dit ce qui est vérifié, pas ce qui est espéré. Une exigence non couverte reste marquée « Non ».
