-- AUTOSETUP — worker-connector — migration 0001
-- Tabelas do AutoSetup Connector (conectores, códigos de pareamento,
-- log de erro de sync, vertical Hospedagem: reservas/hospedes/quartos/
-- tarifas). Banco: autosetup-leads (compartilhado com os demais
-- worker-* do monorepo). Rodar manualmente:
--   npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0001_connector.sql

-- ---------------------------------------------------------------------
-- Conexões (um agente Connector instalado = uma linha aqui)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connectors (
  connector_id       TEXT PRIMARY KEY,               -- UUID gerado na instalação
  property_id        TEXT NOT NULL,                  -- vincula à empresa (ex.: Casa do Fábio)
  token_hash         TEXT NOT NULL,                  -- SHA-256 do token; nunca texto plano
  pasta_autorizada   TEXT,                           -- caminho local, informativo
  status             TEXT NOT NULL DEFAULT 'ativo',  -- ativo | pausado | revogado
  criado_em          DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultimo_heartbeat   DATETIME
);

CREATE INDEX IF NOT EXISTS idx_connectors_token_hash ON connectors(token_hash);
CREATE INDEX IF NOT EXISTS idx_connectors_property ON connectors(property_id);

-- ---------------------------------------------------------------------
-- Códigos de pareamento — gerados manualmente por vocês para cada
-- cliente novo (ex.: CASA-FABIO-001) e consumidos uma única vez pelo
-- endpoint /api/connector/parear
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_pairing_codes (
  codigo        TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL,
  usado         INTEGER NOT NULL DEFAULT 0,   -- 0 = disponível, 1 = já consumido
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  usado_em      DATETIME
);

-- ---------------------------------------------------------------------
-- Log de erros de parsing — usado para disparar o alerta por Resend
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connector_sync_errors (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id   TEXT NOT NULL,
  connector_id  TEXT,
  filename      TEXT,
  r2_key        TEXT,
  erro          TEXT NOT NULL,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Vertical Hospedagem — Passo 1
-- Todas com property_id para isolamento multi-tenant.
-- Upsert por chave natural (evita duplicar em re-sincronizações).
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reservas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id     TEXT NOT NULL,
  hospede_nome    TEXT NOT NULL,
  checkin         TEXT NOT NULL,   -- ISO date (YYYY-MM-DD)
  checkout        TEXT NOT NULL,
  quarto          TEXT NOT NULL,
  valor_total     REAL NOT NULL,
  status          TEXT NOT NULL,   -- confirmada | cancelada | pendente
  origem          TEXT,
  atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (property_id, hospede_nome, checkin, quarto)
);

CREATE TABLE IF NOT EXISTS hospedes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id     TEXT NOT NULL,
  nome            TEXT NOT NULL,
  contato         TEXT,
  cidade_origem   TEXT,
  atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (property_id, nome, contato)
);

CREATE TABLE IF NOT EXISTS quartos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id     TEXT NOT NULL,
  identificador   TEXT NOT NULL,
  capacidade      INTEGER NOT NULL,
  tipo            TEXT,
  atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (property_id, identificador)
);

CREATE TABLE IF NOT EXISTS tarifas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id       TEXT NOT NULL,
  quarto_ou_tipo    TEXT NOT NULL,
  valor_diaria      REAL NOT NULL,
  periodo_vigencia  TEXT,
  atualizado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (property_id, quarto_ou_tipo, periodo_vigencia)
);

CREATE INDEX IF NOT EXISTS idx_reservas_property ON reservas(property_id);
CREATE INDEX IF NOT EXISTS idx_hospedes_property ON hospedes(property_id);
CREATE INDEX IF NOT EXISTS idx_quartos_property ON quartos(property_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_property ON tarifas(property_id);
