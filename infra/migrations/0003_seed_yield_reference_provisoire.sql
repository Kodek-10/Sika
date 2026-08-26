-- 0003_seed_yield_reference_provisoire.sql
-- ⚠️ CONTENU PROVISOIRE — D10 (docs/decisions/DECISIONS-DEV3.md) : « schéma = Dev 1, contenu = Dev 3 ».
-- Ordres de grandeur issus de la littérature biométhanisation, NON calibrés.
-- À remplacer dès que Dev 3 livre le référentiel officiel (aucun changement de schéma).
-- Idempotent : ne touche jamais une ligne existante.

INSERT INTO yield_reference
  (substrate, min_m3_per_kg, max_m3_per_kg, reliability, source,
   climate_coefficient_sud, climate_coefficient_nord)
VALUES
  ('fientes_volaille',     0.050, 0.090, 'basse',
   'PROVISOIRE — ordre de grandeur littérature, en attente calibration Dev 3', 1.00, 1.10),
  ('lisier_porcin',        0.030, 0.070, 'basse',
   'PROVISOIRE — ordre de grandeur littérature, en attente calibration Dev 3', 1.00, 1.10),
  ('restes_alimentaires',  0.080, 0.150, 'basse',
   'PROVISOIRE — ordre de grandeur littérature, en attente calibration Dev 3', 1.05, 1.15)
ON CONFLICT (substrate) DO NOTHING;
