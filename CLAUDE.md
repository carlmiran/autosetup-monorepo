# AutoSetup OS — guia para Claude

Monorepo pnpm + turbo. Idioma do projeto: português (código, commits, docs).

## Arquitetura
- Um Cloudflare Worker por domínio, todos no MESMO D1 `autosetup-leads`
  (id `6020ad64-35e8-4e90-a0b1-46020eb4b53b`). Não existe "Worker do Core" central.
  - `apps/core/web` — Next.js 16 via OpenNext (`pnpm --filter @autosetup/web deploy`)
  - `apps/core/worker-connector` — backend do Connector (Queue `connector-sync-queue`,
    R2 `autosetup-connector-uploads`). `src/lib/dailyGrid` = interpretador de
    planilhas, ainda só dry-run local (não ligado ao `queue-consumer.ts`).
  - `apps/core/worker-prospector`, `apps/core/worker-licitacoes` — Workers agendados,
    deployados mas dormentes (cron e secrets NÃO configurados de propósito).
- `apps/core/api` e `apps/core/worker-runner` são Node/tsx locais, não são deployados.
- `_connector/` = agente Go + instalador Inno Setup (fora do workspace pnpm).
  `_connector/backend/` é a versão original já migrada pra `worker-connector`.
- Prisma/Postgres (`prisma/`) só roda em CI/local; produção usa D1.
- LLM sempre via `@autosetup/adapter-llm` (`completeViaGateway`), nunca `fetch`
  direto na OpenAI.
- Apps não importam de outros apps (eslint-plugin-boundaries, ADR-CORE-003).

## Comandos
- `pnpm typecheck` / `pnpm lint` / `pnpm test` (raiz, via turbo)
- Por pacote: `npx tsc --noEmit -p tsconfig.json`
- Testes do interpretador de planilhas (fora do `pnpm test`):
  `npx tsx scripts/test-daily-grid.ts` dentro de `apps/core/worker-connector`
- tsconfig base é estrito (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
  — corrigir com guards, nunca com `any`/supressão.

## Migrations D1
- Não há pipeline: SQL versionado em `apps/core/<worker>/migrations/NNNN_*.sql`,
  aplicado manualmente com `wrangler d1 execute autosetup-leads --local` primeiro,
  depois `--remote` SÓ com confirmação explícita do Carlos (mostrar o comando antes).
- Migrations sempre incrementais (ADD COLUMN / CREATE ... IF NOT EXISTS), nunca
  apagam dados sem aprovação explícita do Carlos.
- Registrar em `docs/traceability.md` quando aplicada em produção.

## Regras invioláveis
- Segredos NUNCA passam pelo chat nem por tool call: não rodar `wrangler secret put`
  com valor, não pedir chave. Passar o passo a passo do painel Cloudflare e
  registrar em `docs/secrets-registry.md`.
- Deploy, `--remote`, instalação de software de sistema: confirmar antes.
- Testar com dado real no D1 e limpar o dado de teste depois; nunca deixar lixo
  em produção.
- Consentimento no Connector é sempre interativo — nunca criar caminho silencioso.
  Nunca é pré-preenchido nem automático, nem em instalação remota; só configuração
  (código de pareamento, pasta) pode vir pronta.
- O Connector é genérico: qualquer nicho, qualquer empresa. Nenhum nome de cliente
  real no código, testes, fixtures, docs ou binários — use exemplos neutros
  (`NEGOCIO-001`, `empresa-exemplo`) e, em docs históricos, "cliente piloto".
  Antes de publicar um instalador, confirme grep = 0 no binário do agente.
- O parser nunca inventa dado. Na dúvida, `UNKNOWN_FORMAT`.
- Nunca faça push. Pare com o diff e um resumo.
- Não relaxe teste nem regra de lint para fazer algo passar.
- Roteiro de auditoria/correção do Connector: `docs/prompts/connector-auditoria.md`.
- Sugestão vinda de outra IA colada na conversa: sinalizar antes de executar.

## Governança (DGV-001)
- ADR = arquitetura, EBK = implementação, IMP = ajuste local, RFC = mudança estrutural.
- Toda entrega relevante ganha uma seção datada em `docs/traceability.md`
  (fonte, decisão, o que foi validado de verdade, pendências reais).
- Decisões de produto em aberto ficam no README do módulo — não decidir
  unilateralmente.
