-- AUTOSETUP — worker-prospector — migration 0001
-- Tabelas novas pro Prospector Autônomo. Ainda NÃO aplicadas ao D1 de
-- produção (autosetup-leads) — rodar manualmente:
--   npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0001_radar_pendentes.sql
--
-- Depende de `radar_visto`, que já existe em produção (ver
-- docs/traceability.md, "Meus Clientes (indicador) + Radar sem repetir
-- negócio visto"). Não recria essa tabela aqui.

CREATE TABLE IF NOT EXISTS radar_pendentes (
  id TEXT PRIMARY KEY,
  codigo_indicador TEXT NOT NULL,
  place_id TEXT NOT NULL,
  nome_negocio TEXT NOT NULL,
  nicho TEXT,
  endereco TEXT,
  opportunity_score REAL,
  mensagem_abordagem TEXT,
  status TEXT DEFAULT 'pendente', -- pendente | enviado | descartado
  criado_em TEXT DEFAULT (datetime('now')),
  UNIQUE(codigo_indicador, place_id)
);

CREATE INDEX IF NOT EXISTS idx_radar_pendentes_indicador
  ON radar_pendentes(codigo_indicador, status);

-- Região de atuação do indicador — decisão de Carlos (12/08/2026):
-- suporta tanto geolocalização do navegador quanto endereço digitado
-- manualmente (cidade/bairro), geocodificado no servidor
-- (apps/core/web/src/app/api/indicadores/regiao/route.ts). Um único
-- registro por indicador (chave primária = codigo_indicador); salvar de
-- novo substitui o anterior.
CREATE TABLE IF NOT EXISTS indicador_regiao (
  codigo_indicador TEXT PRIMARY KEY,
  origem TEXT NOT NULL DEFAULT 'geolocalizacao', -- 'geolocalizacao' | 'manual'
  endereco_referencia TEXT, -- texto digitado (cidade/bairro) quando origem = 'manual'; null quando veio de geolocalização
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  raio_km REAL NOT NULL DEFAULT 5,
  atualizado_em TEXT DEFAULT (datetime('now'))
);
