-- 0002_users.sql — comptes utilisateurs pour l'authentification (FR-006, FRB-008)
-- Les rôles agent / imf / mmpe ne sont pas des producteurs : ils ont besoin
-- de leur propre table de comptes. Un producteur reçoit son compte à sa création
-- (POST /producers, tâche suivante) avec le rôle 'producteur'.

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('producteur', 'agent', 'imf', 'mmpe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  pin_hash     text NOT NULL,
  role         user_role_enum NOT NULL,
  producer_id  uuid REFERENCES producers(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT producer_role_requires_link CHECK (
    (role = 'producteur' AND producer_id IS NOT NULL) OR (role <> 'producteur')
  )
);
