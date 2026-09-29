-- AUTOSETUP — worker-licitacoes — migration 0001
-- Tabelas novas pro Radar de Licitações Públicas. Ainda NÃO aplicadas ao D1
-- de produção (autosetup-leads) — rodar manualmente:
--   npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0001_licitacoes.sql

CREATE TABLE IF NOT EXISTS licitacao_perfil (
  id TEXT PRIMARY KEY,
  cliente_email TEXT NOT NULL,
  palavras_chave TEXT NOT NULL,   -- ex: "construção civil,reforma,pintura"
  uf TEXT,                         -- ex: "SP" (opcional, vazio = todas)
  valor_max REAL,                  -- opcional
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS licitacao_encontrada (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL,
  numero_controle_pncp TEXT NOT NULL,
  objeto TEXT,
  orgao TEXT,
  uf TEXT,
  valor_estimado REAL,
  data_encerramento_proposta TEXT,
  resumo_simples TEXT,
  enviado_em TEXT,
  UNIQUE(perfil_id, numero_controle_pncp)
);
