# Infra — `infra/`

> Propriétaire : commun

## Contenu

- `docker-compose.yml` : PostgreSQL + stockage objet (MinIO) en local. Ports surchargeables via `SIKA_PG_PORT`, `SIKA_MINIO_PORT`, `SIKA_MINIO_CONSOLE_PORT` (utile si un PostgreSQL tourne déjà sur la machine).
- `migrations/` : schéma PostgreSQL — voir [`docs/donnees/dictionnaire-de-donnees.md`](../docs/donnees/dictionnaire-de-donnees.md) pour le modèle canonique correspondant. `apply.sh` applique dans l'ordre les fichiers non encore appliqués (suivi via table `_migrations`).

## Setup

```bash
docker compose -f infra/docker-compose.yml up -d
infra/migrations/apply.sh
```

## Migrations

| Fichier | Contenu |
|---|---|
| `0001_init.sql` | Schéma initial : producers, yield_reference, declarations, meter_readings, scores, alerts, payments. Trigger d'immuabilité de `captured_at` (INV-002) |
| `0002_users.sql` | Comptes d'authentification (FR-006) |
| `0003_seed_yield_reference_provisoire.sql` | Référentiel **provisoire**, 3 substrats (contenu = Dev 3, D10) |
| `0004_fix_substrate_naming.sql` | Aligne `restes_alimentaires` sur `dechets_alimentaires` du dictionnaire |
| `0005_payments_idempotency.sql` | Idempotence des versements, quarantaine, checkpoint (FR-007) |
| `0006_alerts_declaration_link.sql` | Rattache chaque alerte à la déclaration qui l'a levée (FR-010) |

## Règles

- Toute migration doit correspondre exactement au dictionnaire de données, dans la même PR que sa modification.
- Les migrations sont immuables une fois mergées : on corrige en écrivant une nouvelle migration, jamais en éditant l'historique.
