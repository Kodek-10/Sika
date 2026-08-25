#!/usr/bin/env bash
# Comptes de démonstration pour les tests inter-devs (FRB-008 : matrice des rôles).
# ⚠️ Démo locale uniquement — jamais en production.
# Prérequis : docker compose up + migrations appliquées + npm install dans apps/backend.
# Usage : infra/seeds/demo-users.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

hash() {
  local h
  h=$(cd apps/backend && node -e "console.log(require('bcryptjs').hashSync('$1', 10))")
  [ -n "$h" ] || { echo "Erreur : hash bcrypt vide" >&2; exit 1; }
  echo "$h"
}

PSQL="docker exec -i sika-postgres psql -v ON_ERROR_STOP=1 -U sika -d sika"

$PSQL <<SQL
INSERT INTO producers (name, phone_number, activity_type, capacity_declared, zone, climate_zone, meter_serial_number)
VALUES ('Producteur Démo', '+2250700000001', 'elevage_volaille', 30, 'Bouaké', 'nord', 'SM-DEMO-001')
ON CONFLICT (phone_number) DO NOTHING;

INSERT INTO users (phone_number, pin_hash, role, producer_id) VALUES
  ('+2250700000001', '$(hash 1111)', 'producteur',
   (SELECT id FROM producers WHERE meter_serial_number = 'SM-DEMO-001')),
  ('+2250700000002', '$(hash 2222)', 'agent', NULL),
  ('+2250700000003', '$(hash 2222)', 'imf', NULL),
  ('+2250700000004', '$(hash 2222)', 'mmpe', NULL)
ON CONFLICT (phone_number) DO UPDATE SET pin_hash = EXCLUDED.pin_hash;
SQL

echo "== Comptes démo prêts :"
echo "   producteur +2250700000001 / PIN 1111 · agent +2250700000002 · imf ...003 · mmpe ...004 / PIN 2222"
