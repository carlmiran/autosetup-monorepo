-- AUTOSETUP — worker-connector — migration 0002
-- Adiciona consentimento_em: timestamp exato de quando a pessoa confirmou
-- o aceite dos termos de verdade, no prompt interativo (nunca inferido,
-- nunca aproximado pelo horário de chegada da chamada no servidor — vem
-- do próprio agente, capturado no instante do "sim" digitado). Migration
-- incremental, não apaga nem recria nada. Rodar manualmente:
--   npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0002_consentimento.sql

ALTER TABLE connectors ADD COLUMN consentimento_em DATETIME;
