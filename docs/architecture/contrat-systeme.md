# Contrat système

> Question à laquelle ce document répond : qu'est-ce qui ne doit jamais devenir faux ?
> Deux catégories d'identifiants : `INV-xxx` (invariants techniques, garantis par la structure du système) et `BR-xxx` (règles métier, garanties par la logique applicative). Un `ERR-xxx` est le code d'erreur associé quand une règle est violée côté API.

## 1. Invariants (`INV-xxx`)

Un invariant est une propriété qui doit rester vraie à tout instant, indépendamment de l'utilisateur ou du chemin de code emprunté.

### INV-001 — Unicité de l'association compteur ↔ producteur
Un identifiant de compteur (QR code ou numéro de série) ne peut être associé qu'à un seul producteur actif à la fois.
**Portée** : `producers`, `apps/backend/src/producers/`, `apps/backend/src/anti-fraud/`.

### INV-002 — Origine des métadonnées de capture
`meter_readings.captured_at` et la géolocalisation associée ne sont jamais saisis manuellement — ils sont générés exclusivement par la capture photo in-app.
**Portée** : `meter_readings`, `apps/field-app/`, `apps/backend/src/anti-fraud/`. **Lié à** : FRB-001.

### INV-003 — Non-dégradation du score par sous-performance
Une lecture sous la fourchette de rendement attendue ne dégrade jamais directement le score de confiance au même cycle de calcul (voir BR-001 pour le comportement attendu).
**Portée** : `packages/scoring-engine/`. **Lié à** : FRB-007.

### INV-004 — Intégrité référentielle substrat
Une déclaration ne peut référencer qu'un substrat existant dans `yield_reference`. Aucune déclaration avec un substrat inconnu n'est acceptée.
**Portée** : `declarations`, `yield_reference`, `apps/backend/src/declarations/`. **Lié à** : FRB-006.

### INV-005 — Déterminisme du score
Pour un même jeu de données d'entrée (déclaration, historique, référentiel de rendement à une version donnée), le score calculé est toujours identique. Pas d'aléatoire caché dans le moteur de scoring.
**Portée** : `packages/scoring-engine/`.

## 2. Règles métier (`BR-xxx`)

Une règle métier encode une décision de produit, pas une contrainte technique — elle peut évoluer si le produit évolue, mais jamais silencieusement.

### BR-001 — Sous-performance ≠ fraude
Une lecture sous la fourchette attendue déclenche une alerte de type `maintenance`. Le score de confiance n'est **pas** dégradé par cet événement seul. Raison : il est physiquement plus facile de sous-produire (mauvais entretien, problème de pH, rétention hydraulique insuffisante) que de sur-produire.
**Conséquence si violée** : traite injustement un producteur mal équipé comme un fraudeur — risque de réputation majeur pour le projet face au jury et aux partenaires. **Lié à** : INV-003, FR-004, FRB-007.

### BR-002 — Seuil de sur-déclaration suspecte
Une lecture supérieure à +100% de la borne haute de la fourchette attendue déclenche une alerte `sur_declaration` et une priorité d'audit. Le seuil de +100% est volontairement large pour ne détecter que les écarts flagrants, pas le bruit de mesure du compteur à bulles (±15-20%).
**Lié à** : FR-004.

### BR-003 — Éligibilité au versement Mobile Money
Un producteur est éligible à un versement si son score ≥ seuil défini (valeur à fixer par Dev 1 + Dev 2 ensemble, documentée ici dès qu'actée) **et** qu'il n'a aucune alerte non résolue.
**Lié à** : FR-007.

### BR-004 — Aucun partenariat présenté comme signé sans preuve
Un partenariat IMF/MMPE ne peut être communiqué (pitch, dossier, dashboard) comme "signé" ou "confirmé" sans document écrit (lettre d'intention ou contrat). Statut réel à suivre dans `packages/payments/PARTNERSHIPS.md`.
**Portée** : communication uniquement, pas de contrainte technique directe.

## 3. Codes d'erreur (`ERR-xxx`)

Le détail complet avec exemples de requête/réponse est dans [`../api/specification.md`](../api/specification.md). Liste de référence :

| Code | Déclenché par |
|---|---|
| `ERR-400-INVALID-DECLARATION` | Champ obligatoire manquant ou hors plage (FRB-003) |
| `ERR-401-UNAUTHORIZED` | Token absent ou invalide |
| `ERR-403-ROLE-FORBIDDEN` | Rôle authentifié mais non autorisé pour cette action (FR-006, FRB-008) |
| `ERR-404-PRODUCER-NOT-FOUND` | Producteur inexistant |
| `ERR-409-METER-ALREADY-ASSIGNED` | Violation de INV-001 |
| `ERR-409-PHONE-ALREADY-REGISTERED` | Numéro de téléphone déjà rattaché à un compte (`POST /producers`) |
| `ERR-422-UNKNOWN-SUBSTRATE` | Violation de INV-004, FRB-006 |
| `ERR-502-PAYMENT-PROVIDER-UNAVAILABLE` | Échec de l'appel à l'opérateur Mobile Money |

## 4. Règle de modification

Toute modification d'un `INV-xxx` doit être répercutée dans `architecture/exigences-tracabilite.md`, `architecture/architecture-systeme.md`, et dans les tests qui le vérifient (voir `test/README.md`). Ne jamais modifier silencieusement — passer par un ADR si la modification change une décision structurante (voir `adr/`).
