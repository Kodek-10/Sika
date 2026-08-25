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

## Règles

- Toute migration doit correspondre exactement au dictionnaire de données, dans la même PR que sa modification.
- Les migrations sont immuables une fois mergées : on corrige en écrivant une nouvelle migration, jamais en éditant l'historique.
