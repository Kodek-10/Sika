#!/usr/bin/env bash
# Applique les migrations SQL dans l'ordre, une seule fois chacune.
# Prérequis : docker compose -f infra/docker-compose.yml up -d
set -euo pipefail
cd "$(dirname "$0")"

docker exec sika-postgres psql -v ON_ERROR_STOP=1 -U sika -d sika \
  -c "CREATE TABLE IF NOT EXISTS _migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())" > /dev/null

for file in [0-9]*.sql; do
  if docker exec sika-postgres psql -U sika -d sika -tAc \
    "SELECT 1 FROM _migrations WHERE filename = '$file'" | grep -q 1; then
    echo "== $file déjà appliquée"
    continue
  fi
  echo "== Application de $file"
  docker exec -i sika-postgres psql -v ON_ERROR_STOP=1 -U sika -d sika < "$file"
  docker exec sika-postgres psql -v ON_ERROR_STOP=1 -U sika -d sika \
    -c "INSERT INTO _migrations (filename) VALUES ('$file')"
done
echo "== Migrations à jour"
