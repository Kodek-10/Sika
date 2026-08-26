-- 0006_alerts_declaration_link.sql — FR-004, FR-010
--
-- Une alerte n'était rattachée qu'à un producteur, jamais à la déclaration qui
-- l'a déclenchée. Deux conséquences :
--   1. impossible de répondre exactement « cette déclaration a-t-elle levé une
--      alerte ? » sur un rejeu de POST /declarations — seule une heuristique
--      temporelle était possible, et elle comptait aussi les alertes voisines ;
--   2. un agent voyant une alerte ne peut pas remonter à la déclaration en
--      cause, ce qui est précisément ce qu'il lui faut pour arbitrer (FR-010).
--
-- Nullable : les alertes créées avant cette migration n'ont pas de rattachement,
-- et le scoring peut être invoqué hors du flux déclaratif.

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS declaration_id uuid REFERENCES declarations(id);

CREATE INDEX IF NOT EXISTS alerts_declaration_idx
  ON alerts (declaration_id)
  WHERE declaration_id IS NOT NULL;
