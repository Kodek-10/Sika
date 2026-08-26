# Dictionnaire de données

> Question à laquelle ce document répond : quels sont les noms, types, énumérations, relations et propriétaires de chaque donnée ?
> Source de vérité pour le modèle canonique — toute migration doit correspondre exactement à ce document.

## `producers`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `name` | text | requis | Dev 1 |
| `phone_number` | text | requis, unique | Dev 1 |
| `activity_type` | text | `elevage_volaille`, `elevage_bovin`, `elevage_porcin`, `restaurant_collectif` | Dev 1 |
| `capacity_declared` | numeric | ≥ 0, en **kg de substrat par jour** (unité fixée lors de l'implémentation du signal capacité) | Dev 1 |
| `zone` | text | libre (ex: "Bouaké") | Dev 1 |
| `climate_zone` | enum | `sud`, `nord` | Dev 3 (définit la logique), Dev 1 (stocke) |
| `meter_serial_number` | text | unique — voir INV-001 | Dev 1 |
| `created_at` | timestamptz | auto | Dev 1 |

## `users`

Comptes d'authentification (FR-006, FRB-008). Ajouté par Dev 1 — migration `0002_users.sql` — car les rôles `agent`, `imf`, `mmpe` ne sont pas des producteurs.

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `phone_number` | text | requis, unique | Dev 1 |
| `pin_hash` | text | hash bcrypt — jamais de PIN en clair | Dev 1 |
| `role` | enum | `producteur`, `agent`, `imf`, `mmpe` | Dev 1 |
| `producer_id` | uuid, FK → `producers.id` | obligatoire si `role = 'producteur'`, sinon null | Dev 1 |
| `created_at` | timestamptz | auto | Dev 1 |

## `declarations`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `producer_id` | uuid, FK → `producers.id` | requis | Dev 1 |
| `substrate` | text, FK → `yield_reference.substrate` | doit exister — voir INV-004 | Dev 1 (contrainte), Dev 3 (valeurs valides) |
| `quantity_kg` | numeric | > 0 | Dev 1 |
| `duration_hours` | numeric | > 0 | Dev 1 |
| `declared_at` | timestamptz | auto | Dev 1 |

## `meter_readings`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `declaration_id` | uuid, FK → `declarations.id` | relation 1-1 (pas 1-N) | Dev 1 |
| `value_m3` | numeric | ≥ 0 | Dev 1 |
| `photo_url` | text | capture in-app uniquement — voir INV-002 | Dev 3 (capture), Dev 1 (stockage) |
| `captured_at` | timestamptz | non modifiable après création — voir INV-002 | Dev 1 |
| `geo_lat`, `geo_lng` | numeric | requis — voir INV-002 | Dev 3 (capture), Dev 1 (stockage) |

## `scores`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `producer_id` | uuid, FK → `producers.id` | — | Dev 1 |
| `value` | numeric | 0-100 (à confirmer avec Dev 1 lors de l'implémentation) | Dev 1 |
| `computed_at` | timestamptz | auto | Dev 1 |
| `signal_intrant_extrant` | numeric | détail des 4 signaux — voir `packages/scoring-engine/README.md` | Dev 1 |
| `signal_temporel` | numeric | idem | Dev 1 |
| `signal_capacite` | numeric | idem | Dev 1 |
| `signal_preuve` | numeric | idem | Dev 1 |

## `yield_reference`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `substrate` | text, PK | ex: `fientes_volaille`, `fumier_bovin`, `lisier_porcin`, `dechets_alimentaires`, `dechets_graisses_iaa`, `dechets_poisson_marche` | Dev 3 |
| `min_m3_per_kg`, `max_m3_per_kg` | numeric | fourchette, jamais une valeur unique — voir principe "fourchette honnête" | Dev 3 |
| `reliability` | enum | `haute`, `moyenne`, `basse` | Dev 3 |
| `source` | text | traçabilité obligatoire, jamais vide | Dev 3 |
| `climate_coefficient_sud`, `climate_coefficient_nord` | numeric | angle mort actuel : coefficient nord provisoire, pas de source ivoirienne directe | Dev 3 |

## `alerts`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 1 |
| `producer_id` | uuid, FK → `producers.id` | — | Dev 1 |
| `type` | enum | `maintenance`, `sur_declaration` uniquement — voir BR-001, BR-002 | Dev 1 |
| `severity` | enum | `low`, `medium`, `high` | Dev 1 |
| `detail` | text | — | Dev 1 |
| `declaration_id` | uuid, FK → `declarations.id` | déclaration qui a levé l'alerte ; nullable (migration `0006`) | Dev 1 |
| `detected_at` | timestamptz | auto | Dev 1 |
| `resolved` | boolean | défaut `false` ; passe à `true` via `PATCH /alerts/:id/resolve` | Dev 1 |

## `payments`

| Champ | Type | Énumération / contrainte | Propriétaire |
|---|---|---|---|
| `id` | uuid, PK | — | Dev 2 |
| `producer_id` | uuid, FK → `producers.id` | — | Dev 2 |
| `amount_fcfa` | numeric | > 0 | Dev 2 |
| `status` | enum | `initiated`, `completed`, `failed` | Dev 2 |
| `transaction_ref` | text | référence opérateur Mobile Money — jamais loguée en clair | Dev 2 |
| `idempotency_key` | text | unique — garantit qu'une même intention ne verse qu'une fois (migration `0005`) | Dev 2 |
| `failure_detail` | text | raison conservée en cas d'échec, pour reprise **manuelle** (quarantaine) | Dev 2 |
| `initiated_by` | uuid, FK → `users.id` | agent/MMPE déclencheur | Dev 2 |
| `completed_at` | timestamptz | renseigné **uniquement** si `status = 'completed'` (contrainte en base) | Dev 2 |
| `created_at` | timestamptz | auto | Dev 2 |

## Substrats effectivement présents au référentiel

Le référentiel `yield_reference` contient aujourd'hui **3 substrats provisoires** (`fientes_volaille`, `lisier_porcin`, `dechets_alimentaires`), tous marqués `reliability = 'basse'` et sourcés « PROVISOIRE ». Les trois autres cités en exemple ci-dessus (`fumier_bovin`, `dechets_graisses_iaa`, `dechets_poisson_marche`) **restent à livrer par Dev 3**. Une déclaration les référençant est rejetée en `ERR-422-UNKNOWN-SUBSTRATE` : c'est le comportement voulu (INV-004), pas un bug.

⚠️ Toute valeur ajoutée ici doit exister à l'identique en base : un menu déroulant construit sur ce document et un référentiel divergent produisent un 422 sur chaque déclaration. C'est exactement ce qu'a corrigé la migration `0004`.

## Règle de modification

Toute modification de ce dictionnaire doit être accompagnée, dans la même PR, d'une migration dans `infra/migrations/` et d'une mise à jour de l'OpenAPI/`api/specification.md` si le champ est exposé via l'API.
