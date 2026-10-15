-- AUTOSETUP — apps/core/web/migrations/0000_baseline.sql
-- Baseline das 10 tabelas do apps/core/web no D1 `autosetup-leads`.
--
-- Essas tabelas foram criadas em produção por `wrangler d1 execute` ad hoc
-- (28/07 a 11/08/2026, ver docs/traceability.md) e nunca tiveram SQL
-- versionado. Este arquivo foi extraído do remoto em 14/10/2026 (consulta
-- só de leitura em sqlite_master) — Etapa 0.5 de docs/auditoria-2026-10-14.md.
--
-- Colunas que entraram depois via ALTER TABLE ADD COLUMN estão dentro do
-- CREATE, marcadas com comentário. Num banco zerado o resultado é o mesmo
-- esquema do remoto (conferido com pragma_table_info); no remoto, que já tem
-- tudo, o IF NOT EXISTS não faz nada. NÃO aplicar no remoto — não há motivo.
--
-- Aplicar só no local (de dentro de apps/core/web):
--   npx wrangler d1 execute autosetup-leads --local --file=./migrations/0000_baseline.sql

-- Diagnósticos do LENS (/diagnostico, /diagnostico/rapido).
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  nome_contato TEXT,
  whatsapp_contato TEXT,
  nome_negocio TEXT NOT NULL,
  cidade TEXT NOT NULL,
  nicho TEXT NOT NULL,
  tamanho_equipe TEXT,
  canais_atendimento TEXT,
  ferramentas_atuais TEXT,
  perda_financeira TEXT,
  maior_dificuldade TEXT,
  rotina_diaria TEXT,
  o_que_atrapalha TEXT,
  sobrecarga TEXT,
  visao_negocio TEXT,
  meta_financeira TEXT,
  diagnostico_resumo TEXT,
  interesse_final TEXT,
  perguntas_nicho TEXT,    -- ALTER 28/07/2026
  codigo_indicacao TEXT,   -- ALTER 30/07/2026
  precos_servicos TEXT     -- ALTER 31/07/2026
);

-- Checkouts do Mercado Pago (/planos) + controle manual de comissão.
CREATE TABLE IF NOT EXISTS pagamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  plano TEXT NOT NULL,
  nome TEXT,
  email TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mp_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  atualizado_em TEXT,
  codigo_indicacao TEXT,          -- ALTER 30/07/2026
  comissao_paga INTEGER DEFAULT 0 -- ALTER 06/08/2026
);

-- Rate limiting por rota+IP (src/lib/rateLimit.ts).
CREATE TABLE IF NOT EXISTS rate_limits (
  chave TEXT PRIMARY KEY,
  contagem INTEGER NOT NULL DEFAULT 1,
  expira_em TEXT NOT NULL
);

-- Códigos de desconto gerados por diagnóstico bem respondido.
CREATE TABLE IF NOT EXISTS descontos (
  codigo TEXT PRIMARY KEY,
  percentual REAL NOT NULL,
  lead_id INTEGER,
  usado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  usado_em TEXT
);

-- Entrevistas de RH (/rh/entrevista).
CREATE TABLE IF NOT EXISTS rh_entrevistas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  nome TEXT,
  formacao TEXT,
  fascina_rh TEXT,
  processos_mal_resolvidos TEXT,
  ferramenta_ideal TEXT,
  processo_contratacao_ideal TEXT,
  erros_comuns TEXT,
  termos_importantes TEXT,
  nunca_automatizar TEXT,
  orgulho TEXT,
  resumo_estruturado TEXT
);

-- Negócios do Radar já mostrados a cada indicador.
CREATE TABLE IF NOT EXISTS radar_visto (
  codigo_indicacao TEXT NOT NULL,
  place_id TEXT NOT NULL,
  nome_negocio TEXT,
  visto_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (codigo_indicacao, place_id)
);

-- Mural de avisos Carlos -> indicadores.
CREATE TABLE IF NOT EXISTS avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mensagem TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indicadores que conectaram a conta do Mercado Pago (OAuth).
CREATE TABLE IF NOT EXISTS indicadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT,
  mp_user_id TEXT,
  conectado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Código de indicador + PIN (evita colisão de código entre indicadores).
CREATE TABLE IF NOT EXISTS indicadores_registro (
  codigo TEXT PRIMARY KEY,
  pin TEXT NOT NULL,
  contato TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Lista pessoal de clientes de cada indicador (/radar/meus-clientes).
CREATE TABLE IF NOT EXISTS clientes_indicador (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_indicacao TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  whatsapp_cliente TEXT,
  notas TEXT,
  data_followup TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT,
  pareceres_json TEXT,           -- ALTER 11/08/2026
  parecer_indice INTEGER DEFAULT 0 -- ALTER 11/08/2026
);
