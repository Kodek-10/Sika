# Infra — `infra/`

> Propriétaire : commun

## Contenu

- `docker-compose.yml` : PostgreSQL + stockage objet en local.
- `migrations/` : schéma PostgreSQL, voir [`apps/backend/docs/DATABASE.md`](../apps/backend/docs/DATABASE.md) pour le détail des tables.

## Setup

```bash
docker compose -f infra/docker-compose.yml up -d
```
