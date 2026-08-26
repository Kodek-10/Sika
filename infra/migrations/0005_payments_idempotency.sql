-- 0005_payments_idempotency.sql — FR-007, guide-connecteur §3
--
-- La table `payments` de 0001 ne permettait pas de garantir l'idempotence :
-- rien n'empêchait deux versements identiques après un double clic ou un
-- retry. Sur une opération financière, c'est la faute la moins rattrapable
-- du système — la garantie doit donc vivre EN BASE, pas seulement dans le code.
--
-- Ajouts :
--   idempotency_key  : contrainte d'unicité = dernier filet anti-doublon
--   failure_detail   : quarantaine — on conserve la raison de l'échec pour
--                      permettre une reprise MANUELLE (jamais automatique)
--   initiated_by     : traçabilité de l'agent/MMPE déclencheur
--   completed_at     : horodatage du checkpoint de confirmation opérateur

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS failure_detail  text,
  ADD COLUMN IF NOT EXISTS initiated_by    uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS completed_at    timestamptz;

-- Unicité : une même intention de versement ne peut exister qu'une fois.
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uniq
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Recherche des versements récents d'un producteur (fenêtre d'idempotence).
CREATE INDEX IF NOT EXISTS payments_producer_created_idx
  ON payments (producer_id, created_at DESC);

-- `completed_at` ne doit exister que sur un versement réellement confirmé
-- par l'opérateur (règle du checkpoint : jamais de `completed` optimiste).
DO $$ BEGIN
  ALTER TABLE payments
    ADD CONSTRAINT payments_completed_at_coherent
    CHECK ((status = 'completed') = (completed_at IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
