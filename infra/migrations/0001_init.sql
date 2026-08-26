-- 0001_init.sql — schéma initial complet
-- Source de vérité : docs/donnees/dictionnaire-de-donnees.md (toute différence = bug)
-- Invariants couverts :
--   INV-001 : meter_serial_number unique sur producers
--   INV-004 : declarations.substrate doit exister dans yield_reference
--   INV-002 : meter_readings en 1-1 avec declarations ; captured_at non modifiable

-- Enumérations
DO $$ BEGIN
  CREATE TYPE climate_zone_enum AS ENUM ('sud', 'nord');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type_enum AS ENUM ('maintenance', 'sur_declaration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('initiated', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- producers
CREATE TABLE IF NOT EXISTS producers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  phone_number        text NOT NULL UNIQUE,
  activity_type       text NOT NULL CHECK (activity_type IN (
                        'elevage_volaille', 'elevage_bovin', 'elevage_porcin', 'restaurant_collectif'
                      )),
  capacity_declared   numeric NOT NULL CHECK (capacity_declared >= 0),
  zone                text NOT NULL,
  climate_zone        climate_zone_enum NOT NULL,
  meter_serial_number text NOT NULL UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- yield_reference (contenu des lignes = Dev 3, jamais écrit par Dev 1 sans accord — D10)
CREATE TABLE IF NOT EXISTS yield_reference (
  substrate               text PRIMARY KEY,
  min_m3_per_kg           numeric NOT NULL,
  max_m3_per_kg           numeric NOT NULL,
  reliability             text NOT NULL CHECK (reliability IN ('haute', 'moyenne', 'basse')),
  source                  text NOT NULL,
  climate_coefficient_sud numeric NOT NULL,
  climate_coefficient_nord numeric NOT NULL,
  CONSTRAINT yield_range_honest CHECK (min_m3_per_kg <= max_m3_per_kg)
);

-- declarations
CREATE TABLE IF NOT EXISTS declarations (
  id             uuid PRIMARY KEY,
  producer_id    uuid NOT NULL REFERENCES producers(id),
  substrate      text NOT NULL REFERENCES yield_reference(substrate),
  quantity_kg    numeric NOT NULL CHECK (quantity_kg > 0),
  duration_hours numeric NOT NULL CHECK (duration_hours > 0),
  declared_at    timestamptz NOT NULL DEFAULT now()
);

-- meter_readings — relation 1-1 avec declarations (UNIQUE sur declaration_id)
CREATE TABLE IF NOT EXISTS meter_readings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id uuid NOT NULL UNIQUE REFERENCES declarations(id),
  value_m3       numeric NOT NULL CHECK (value_m3 >= 0),
  photo_url      text NOT NULL,
  captured_at    timestamptz NOT NULL,
  geo_lat        numeric NOT NULL,
  geo_lng        numeric NOT NULL
);

-- INV-002 : captured_at non modifiable après création
CREATE OR REPLACE FUNCTION prevent_captured_at_change() RETURNS trigger AS $$
BEGIN
  IF NEW.captured_at IS DISTINCT FROM OLD.captured_at THEN
    RAISE EXCEPTION 'INV-002 : captured_at est non modifiable apres creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meter_readings_immutable ON meter_readings;
CREATE TRIGGER trg_meter_readings_immutable
  BEFORE UPDATE ON meter_readings
  FOR EACH ROW EXECUTE FUNCTION prevent_captured_at_change();

-- scores
CREATE TABLE IF NOT EXISTS scores (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id            uuid NOT NULL REFERENCES producers(id),
  value                  numeric NOT NULL CHECK (value >= 0 AND value <= 100),
  computed_at            timestamptz NOT NULL DEFAULT now(),
  signal_intrant_extrant numeric NOT NULL CHECK (signal_intrant_extrant >= 0 AND signal_intrant_extrant <= 100),
  signal_temporel        numeric NOT NULL CHECK (signal_temporel >= 0 AND signal_temporel <= 100),
  signal_capacite        numeric NOT NULL CHECK (signal_capacite >= 0 AND signal_capacite <= 100),
  signal_preuve          numeric NOT NULL CHECK (signal_preuve >= 0 AND signal_preuve <= 100)
);

-- alerts — uniquement maintenance / sur_declaration (BR-001, BR-002)
CREATE TABLE IF NOT EXISTS alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES producers(id),
  type        alert_type_enum NOT NULL,
  severity    alert_severity_enum NOT NULL,
  detail      text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved    boolean NOT NULL DEFAULT false
);

-- payments (contenu propriété Dev 2 — schéma posé ici pour compléter le modèle canonique)
CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id     uuid NOT NULL REFERENCES producers(id),
  amount_fcfa     numeric NOT NULL CHECK (amount_fcfa > 0),
  status          payment_status_enum NOT NULL,
  transaction_ref text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
