# Backend — NestJS, moteur de scoring, sécurité

> Propriétaire : Dev 1
> Dépend de : `packages/scoring-engine/yield-model/` (Dev 3)
> Consommé par : `apps/field-app/`, `apps/dashboard/`, `packages/payments/` (Dev 2)
> Voir aussi : [`docs/api/specification.md`](../../docs/api/specification.md) · [`docs/donnees/dictionnaire-de-donnees.md`](../../docs/donnees/dictionnaire-de-donnees.md) · [`docs/developpement/README.md`](../../docs/developpement/README.md)

## 1. Rôle de ce module

Transforme une déclaration brute en score de confiance exploitable. Réalise FR-001 à FR-006, FR-009, FR-010 (voir [`docs/produit/exigences-produit.md`](../../docs/produit/exigences-produit.md)).

## 2. Découpage en sous-modules (`src/`)

| Module | Rôle | Exigences réalisées |
|---|---|---|
| `declarations/` | Réception, validation des déclarations | FR-001, INV-004 |
| `scoring/` | Orchestration du calcul de score, déclenchement d'alertes | FR-003, FR-004, FR-010 |
| `auth/` | Rôles et permissions (`producteur`, `agent`, `imf`, `mmpe`) | FR-006, FRB-008 |
| `anti-fraud/` | Vérification origine photo, unicité compteur | INV-001, INV-002, FRB-001 |
| `producers/` | CRUD producteurs, association compteur | INV-001 |

## 3. Documents de référence

- Contrat système (invariants/règles métier) : [`docs/architecture/contrat-systeme.md`](../../docs/architecture/contrat-systeme.md)
- Schéma de données : [`docs/donnees/dictionnaire-de-donnees.md`](../../docs/donnees/dictionnaire-de-donnees.md)
- API exposée : [`docs/api/specification.md`](../../docs/api/specification.md)

## 4. Points de vigilance

- Ne jamais viser un scoring parfait — un flux complet et démontrable prime sur un algorithme sophistiqué isolé.
- Documenter tout seuil de tolérance directement en commentaire de code, en cohérence avec `docs/architecture/contrat-systeme.md`.
- Ne jamais hardcoder les coefficients du `yield-model` — toujours passer par l'interface documentée dans `packages/scoring-engine/README.md`.
- Sécurité applicative : validation stricte des entrées, rôles vérifiés côté serveur, pas de données sensibles en clair dans les logs.

## 5. Setup local

```bash
npm install
cp .env.example .env
npm run start:dev
```

## 6. Tests

Voir [`docs/test/README.md`](../../docs/test/README.md) — cas obligatoires incluant FRB-006, FRB-007, FRB-008.
