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

---

## Continuação (26/07/2026, mesma data) — fecha 4 das 5 pendências acima

**Fonte arquitetural**: mesma do EBK 0.1, mais ADR-CORE-004 (novo).

**Motivação**: Carlos autorizou Claude a decidir a ordem e construir "da
forma mais robusta e completa possível" sem check-ins intermediários.

**O que foi feito e validado de verdade nesta continuação**:

1. **ADR-CORE-004** (`docs/adr/ADR-CORE-004-reconciliacao-kernel-vs-core.md`)
   — formaliza por escrito a reconciliação arquitetural (Core de 8
   componentes = oficial; Kernel/Business DNA = Horizonte H4), com mapa
   explícito de equivalência para não perder o valor conceitual do
   documento mais amplo.

2. **Postgres real instalado e rodando neste sandbox** (PostgreSQL 16.14,
   não simulado) — migration inicial (`prisma/migrations/20260726000000_init/`)
   escrita manualmente (espelha `schema.prisma` exatamente) e **aplicada
   de verdade** via `psql`. Inserção e JOIN reais validados: Tenant →
   Organization → Partner, com foreign keys funcionando.
   - **Limitação honesta**: o Prisma CLI (`prisma generate`/`migrate dev`)
     não roda neste sandbox — a rede bloqueia `binaries.prisma.sh` (403),
     necessário para baixar o engine binário. A migration foi validada
     via SQL direto contra Postgres real, não via Prisma CLI. Rodar
     `pnpm db:generate`/`db:migrate` numa máquina com rede normal deve
     funcionar sem esse bloqueio.

3. **Adapter `spreadsheet` implementado de verdade** (não é mais stub)
   — parsing real de CSV via `csv-parse`, validado lendo um CSV real de
   3 linhas (fixture em `apps/core/worker-runner/fixtures/leads-teste.csv`)
   através do `worker-runner`, com output real impresso no console.

4. **CI estendido** (`ci.yml`) — agora sobe um Postgres real como
   `service` do GitHub Actions e aplica a migration a cada push/PR, sem
   depender de Docker local.

5. **Scaffold real do Next.js 16.2.12** em `apps/core/web` via
   `create-next-app` — **build de produção real rodou e passou**
   (`next build`, Turbopack, 4 páginas estáticas geradas). Ajuste feito:
   removidas as fontes Google (`next/font/google`) porque
   `fonts.googleapis.com` é bloqueado nesta rede sandbox — substituídas
   por system font stack; trocar pela fonte real da marca (preto/dourado)
   é pendência de IMP separada, não desta task.

**Pendências que restam, agora só 2**:
- Implementação real do adapter `whatsapp` (bloqueado por decisão
  consciente — precisa de chave de provider real, ex. WhatsApp Business
  API/Twilio, ainda não obtida)
- Decisão IMP: Next API routes vs. NestJS para `apps/core/api`
- Rodar `prisma generate`/`migrate dev` via CLI numa máquina sem o
  bloqueio de rede deste sandbox (a migration em si já está correta e
  validada — falta só o CLI conseguir baixar seu engine binário)

---

## Decisão operacional sobre o LLM Gateway (27/07/2026)

O commit `32b2fc1` (LLM Gateway multi-provider) veio de uma sessão
paralela, instruída a partir de uma sugestão do ChatGPT que Carlos colou
lá depois de compartilhar esta conversa com ele — não foi uma decisão
tomada dentro do processo normal desta sessão. Carlos confirmou
explicitamente que **não quer gerenciar múltiplos providers** — só
OpenAI, por enquanto.

**Decisão**: manter o código do Gateway (é real, testado — 6/6 testes
passando — e não atrapalha), mas a operação é OpenAI-only: só
`OPENAI_API_KEY` deve ser configurada em produção. O Gateway já filtra
para só tentar providers com chave configurada
(`packages/adapters/llm/src/index.ts`, linha ~158), então isso não exige
nenhuma mudança de código — só a decisão de não preencher as outras 5
chaves em `.env`/Cloudflare Secrets.

**Nota de processo para sessões futuras**: se uma sugestão chegar via
outra IA (ChatGPT, Gemini, DeepSeek) colada numa conversa com Claude,
isso deve ser sinalizado explicitamente antes da execução — não
executado como se fosse uma decisão interna do processo AutoSetup. Duas
vezes já aconteceu de uma decisão arquitetural chegar por esse caminho
sem aviso prévio.

## Deploy real no Cloudflare Workers — preparado, não publicado (27/07/2026)

Fonte: decisão de stack (Cloudflare Pages/Workers, ver PROGRESS_LOG
12/07), documentação oficial da Cloudflare (Pages está sendo substituído
por Workers + Assets como caminho recomendado).

- `apps/core/web/wrangler.jsonc` + `open-next.config.ts`: config real via
  `@opennextjs/cloudflare` (adapter atual recomendado pela Cloudflare
  para Next.js em Workers)
- **Validado de verdade neste sandbox**: `opennextjs-cloudflare build`
  rodou e gerou `.open-next/worker.js` com sucesso; `wrangler deploy
  --dry-run` confirmou a configuração válida (binding `env.ASSETS`
  correto, 24 arquivos de assets, 4.5MB de upload)
- **Não publicado** — dry-run não publica nada, e este sandbox não tem
  (nem deveria ter) credencial de escrita na conta Cloudflare de
  produção
- **Pendência real, ação de Carlos**: conectar o repositório
  `carlmiran/autosetup-monorepo` via painel da Cloudflare (Workers &
  Pages → Create → Import a Git repository), e só depois disso existir,
  cadastrar `OPENAI_API_KEY` em Settings → Variables and Secrets desse
  projeto — nunca através de uma IA

## Captura real de lead + perguntas operacionais adicionais (28/07/2026)

Fonte: sugestão externa avaliada e incorporada por Claude (dev master),
mais pedido direto de Carlos (2 perguntas de satisfação/meta).

- **Cloudflare D1 real criado**: banco `autosetup-leads`
  (uuid `6020ad64-35e8-4e90-a0b1-46020eb4b53b`), tabela `leads` criada e
  testada com INSERT/SELECT/DELETE reais via API antes de qualquer
  código — não é suposição, foi verificado.
- Binding `DB` adicionado em `wrangler.jsonc` (`d1_databases`)
- `apps/core/web/cloudflare-env.d.ts` gerado via `wrangler types` —
  arquivo real, não escrito à mão, garante tipo `D1Database` correto
- Campos de contato (nome, WhatsApp) capturados no topo do formulário,
  com texto explícito de que só servem pra enviar o diagnóstico/contato
  futuro — nunca prometemos envio por e-mail (não implementado, evitado
  para não mentir sobre capacidade que não existe)
- 4 perguntas operacionais novas (todas com áudio): tamanho de
  equipe/volume, canais de atendimento, ferramentas já usadas, perda
  financeira por demora/desorganização — usadas pela IA pra calibrar
  oportunidades ao tamanho real do negócio (nunca sugerir solução
  desproporcional)
- `api/diagnostico`: salva o lead completo no D1 (best-effort — falha de
  persistência nunca derruba a resposta do diagnóstico) e retorna
  `leadId`
- `api/interesse`: nova rota, atualiza `interesse_final` do lead quando a
  pessoa clica Sim/Não no fechamento
- Botão de fechamento usa `NEXT_PUBLIC_WHATSAPP_NUMERO` (env pública, não
  secret) — **ainda pendente**, Carlos vai comprar um chip novo pra não
  misturar com o WhatsApp Business pessoal

Testado: typecheck 11/11 limpo, build de produção com 4 rotas de API,
D1 verificado com query real antes do código ser escrito.
