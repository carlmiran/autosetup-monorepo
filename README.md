# AutoSetup OS — Monorepo

Cognitive Operating System para PMEs brasileiras. Core: LENS, SAGE, ATLAS,
PULSE, PATHS, WINDOW, WORKERS, HUB.

Este commit é o **EBK Task 0.1 (Monorepo + Ambiente Base)** — o primeiro
código real integrado a este repositório. Ver `docs/traceability.md` para
o registro completo de fonte, motivação, critério de aceite e evidência.

## Rodando localmente

```bash
pnpm install
docker compose -f docker/docker-compose.dev.yml up -d   # sobe o Postgres
cp .env.example .env                                     # preencha as chaves
pnpm dev
```

## Estrutura

```
apps/core/api            — servidor HTTP do Core (/health)
apps/core/web             — frontend (Next.js 16) — PENDENTE, ver traceability.md
apps/core/worker-runner    — smoke test real: Event -> Registry -> Runtime -> Worker
packages/shared/*          — types, events, contracts (usados por tudo)
packages/workers/*         — registry + runtime de Workers (ADR-CORE-003)
packages/adapters/*        — spreadsheet, whatsapp (stubs), llm (real, IMP-LLM-001)
prisma/                    — schema multi-tenant, só entidades HUB nesta fase
docs/traceability.md       — aplicação prática do DGV-001
```

## Governança

Mudança estrutural aqui segue DGV-001: ADR para arquitetura, EBK para
implementação, IMP para ajuste local, RFC para mudança estrutural maior.
