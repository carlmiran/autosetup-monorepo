-- AUTOSETUP — worker-connector — migration 0003
-- Adiciona codigo_indicacao (opcional) a connector_pairing_codes: se o
-- cliente veio de um vendedor/indicador, guarda o rastro pra comissão —
-- sem forçar vínculo (fica NULL quando não veio de indicação). Não é
-- FOREIGN KEY pra `leads`/`pagamentos` de propósito — a auditoria
-- confirmou que não existe hoje campo confiável em comum entre essas
-- tabelas e connector_pairing_codes, então isso é só texto rastreável,
-- não um vínculo relacional garantido. Migration incremental, não apaga
-- nem recria nada. Rodar manualmente:
--   npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0003_pareamento_indicador.sql

ALTER TABLE connector_pairing_codes ADD COLUMN codigo_indicacao TEXT;
