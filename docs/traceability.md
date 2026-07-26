# AUTOSETUP — Traceability Log

Aplicação prática do DGV-001: toda tarefa registra Fonte arquitetural,
Motivação, Critério de aceite, Artefatos afetados, Evidência de validação.

---

## EBK Task 0.1 — Monorepo + Ambiente Base

**Fonte arquitetural**: SPR-CORE-001 v1.1, ADR-CORE-002/003, DGV-001, Architecture Baseline v1.1.

**Motivação**: destravar toda a fase de execução — nenhum outro item do
roadmap (APR-001) pode avançar sem um ambiente real reproduzível.

**Critério de aceite**: um dev novo clona o repositório, roda
`pnpm install && pnpm dev`, e tem ambiente funcional + CI + boundaries +
docs, sem precisar do contexto desta conversa.

**Artefatos criados nesta execução**:
- Estrutura completa `apps/core/{api,web,worker-runner}` e
  `packages/{shared/{types,events,contracts},workers/{runtime,registry},adapters/{spreadsheet,whatsapp,llm}}`
- `package.json` / `pnpm-workspace.yaml` / `turbo.json` / `tsconfig.base.json` raiz
- `eslint.config.js` com `eslint-plugin-boundaries` aplicando ADR-CORE-003
  (adapters/workers só importam `shared`, nunca `core` nem um ao outro)
- `docker/docker-compose.dev.yml` (Postgres local)
- `.env.example`, `.gitignore`
- `prisma/schema.prisma` — só entidades HUB (Tenant/Organization/Partner)
- `.github/workflows/ci.yml` — typecheck + lint (boundaries) + test
- `apps/core/api` — servidor HTTP real com `/health`, lista workers registrados
- `apps/core/worker-runner` — smoke test real de ponta a ponta:
  registra worker `echo`, monta `DomainEvent` sintético, despacha via
  `@autosetup/workers-runtime`, imprime resultado
- Adapters `spreadsheet` e `whatsapp`: **stubs explícitos**, lançam
  `NOT_IMPLEMENTED` — não simulam funcionalidade que não existe
  (Princípio #24, Honestidade em Demonstrações)
- Adapter `llm`: implementação mínima real (não stub) do provider OpenAI,
  ponto único de troca por IMP-LLM-001

**Evidência de validação**:
- `pnpm install` e `pnpm typecheck` executados neste ambiente — ver
  resultado no commit desta task
- **Pendente (ação do time)**: rodar `pnpm dev` numa máquina com Docker
  real disponível e confirmar que `apps/core/worker-runner` imprime o
  resultado do smoke test — este sandbox não tem Docker instalado, então
  a subida do Postgres via `docker-compose.dev.yml` não foi testada de
  fato aqui, só validada estruturalmente

**Pendências explícitas para o próximo sprint** (não implementadas agora,
por decisão de escopo desta task, não por esquecimento):
- Scaffold real do Next.js 16 em `apps/core/web` (hoje é um placeholder
  que declara sua própria pendência)
- Implementação real dos adapters `spreadsheet` e `whatsapp`
- Decisão IMP: Next API routes vs. NestJS para `apps/core/api`
- Primeira migration real via Prisma (`prisma migrate dev`)

**Reconciliação arquitetural registrada nesta task**: a arquitetura
oficial usada como base deste monorepo é o Core de 8 componentes
congelado (LENS, SAGE, ATLAS, PULSE, PATHS, WINDOW, WORKERS, HUB). A
visão mais ampla descrita em documentos anteriores (Kernel, Business DNA,
Executive Intelligence Layer, Digital Twin, Sistema Nervoso Empresarial)
fica classificada como Horizonte H4 — arquivada como inspiração de longo
prazo, não implementada nesta fase. Esta reconciliação foi comunicada e
não vetada antes desta execução; se precisar ser revista formalmente como
ADR-CORE-004, isso ainda está em aberto.
