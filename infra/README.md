# Infra — `infra/`

> Propriétaire : commun

## Contenu

- `docker-compose.yml` : PostgreSQL + stockage objet en local.
- `migrations/` : schéma PostgreSQL — voir [`docs/donnees/dictionnaire-de-donnees.md`](../docs/donnees/dictionnaire-de-donnees.md) pour le modèle canonique correspondant.

## Setup

```bash
docker compose -f infra/docker-compose.yml up -d
```
