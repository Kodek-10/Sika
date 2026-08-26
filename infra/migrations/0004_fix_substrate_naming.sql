-- 0004_fix_substrate_naming.sql
-- Correction d'incohérence : le seed 0003 avait introduit `restes_alimentaires`
-- alors que le dictionnaire de données (source de vérité) déclare
-- `dechets_alimentaires`. Une app terrain construisant son menu déroulant
-- depuis le dictionnaire aurait produit un ERR-422-UNKNOWN-SUBSTRATE
-- sur chaque déclaration (INV-004, FRB-006).
--
-- Les migrations mergées sont immuables (infra/README.md) : on corrige ici,
-- on ne réécrit pas 0003.
--
-- ⚠️ Le CONTENU de yield_reference reste propriété de Dev 3 (D10). Cette
-- migration ne fait que RENOMMER une clé pour la rendre conforme au
-- dictionnaire — aucune valeur de rendement n'est modifiée.
--
-- Restent à livrer par Dev 3 (déclarés au dictionnaire, absents du référentiel) :
--   fumier_bovin, dechets_graisses_iaa, dechets_poisson_marche
-- Tant qu'ils sont absents, une déclaration les référençant est rejetée en 422,
-- ce qui est le comportement voulu (INV-004) — pas un bug.

-- Idempotent : ne fait rien si 0003 avait déjà le bon nom, ou si déjà appliquée.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM yield_reference WHERE substrate = 'restes_alimentaires') THEN

    -- 1. Créer la ligne au nom canonique en recopiant les valeurs existantes.
    INSERT INTO yield_reference
      (substrate, min_m3_per_kg, max_m3_per_kg, reliability, source,
       climate_coefficient_sud, climate_coefficient_nord)
    SELECT 'dechets_alimentaires', min_m3_per_kg, max_m3_per_kg, reliability, source,
           climate_coefficient_sud, climate_coefficient_nord
      FROM yield_reference
     WHERE substrate = 'restes_alimentaires'
    ON CONFLICT (substrate) DO NOTHING;

    -- 2. Faire suivre les déclarations éventuellement déjà rattachées
    --    (la FK declarations.substrate n'a pas d'ON UPDATE CASCADE).
    UPDATE declarations
       SET substrate = 'dechets_alimentaires'
     WHERE substrate = 'restes_alimentaires';

    -- 3. Retirer l'ancienne clé, désormais non référencée.
    DELETE FROM yield_reference WHERE substrate = 'restes_alimentaires';

  END IF;
END $$;
