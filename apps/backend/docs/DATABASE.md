# Schéma de base de données — PostgreSQL

> Propriétaire : Dev 1 — à tenir à jour à chaque migration (`infra/migrations/`)

## 1. Vue d'ensemble

```
producers ──< declarations ──< meter_readings
    │              │
    │              └──< scores
    │
    └──< payments

yield_reference   (référentiel indépendant, alimenté par Dev 3)
alerts            (générées à partir de scores + declarations)
```

## 2. Détail des tables

### `producers`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| phone_number | text | |
| activity_type | text | ex: `elevage_volaille`, `restaurant_collectif` |
| capacity_declared | numeric | |
| zone | text | |
| climate_zone | enum(`sud`,`nord`) | utilisé par le `yield-model` |
| meter_serial_number | text, unique | |
| created_at | timestamptz | |

### `declarations`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| producer_id | uuid, FK → producers | |
| substrate | text | doit correspondre à une clé de `yield_reference` |
| quantity_kg | numeric | |
| duration_hours | numeric | |
| declared_at | timestamptz | |

### `meter_readings`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| declaration_id | uuid, FK → declarations | |
| value_m3 | numeric | |
| photo_url | text | capture in-app uniquement |
| captured_at | timestamptz | horodatage automatique |
| geo_lat | numeric | |
| geo_lng | numeric | |

### `scores`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| producer_id | uuid, FK → producers | |
| value | numeric | |
| computed_at | timestamptz | |
| signal_intrant_extrant | numeric | voir `packages/scoring-engine/README.md` |
| signal_temporel | numeric | |
| signal_capacite | numeric | |
| signal_preuve | numeric | |

### `yield_reference`
| Colonne | Type | Note |
|---|---|---|
| substrate | text, PK | |
| min_m3_per_kg | numeric | |
| max_m3_per_kg | numeric | |
| reliability | enum(`haute`,`moyenne`,`basse`) | |
| source | text | traçabilité obligatoire |
| climate_coefficient_sud | numeric | |
| climate_coefficient_nord | numeric | |

### `alerts`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| producer_id | uuid, FK → producers | |
| type | enum(`maintenance`,`sur_declaration`) | jamais `maintenance` traité comme fraude |
| severity | enum(`low`,`medium`,`high`) | |
| detail | text | |
| detected_at | timestamptz | |
| resolved | boolean, default false | |

### `payments`
| Colonne | Type | Note |
|---|---|---|
| id | uuid, PK | |
| producer_id | uuid, FK → producers | |
| amount_fcfa | numeric | |
| status | enum(`initiated`,`completed`,`failed`) | |
| transaction_ref | text | |
| created_at | timestamptz | |

## 3. Règles d'intégrité importantes

- `declarations.substrate` doit toujours correspondre à une entrée existante dans `yield_reference`.
- `meter_readings.captured_at` ne doit jamais être modifiable après création.
- Une déclaration ne peut avoir qu'une seule lecture de compteur associée (1-1, pas 1-N).
