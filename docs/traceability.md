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

## Redesign v2 (OS-panel) + perguntas dinâmicas por nicho (28/07/2026)

Fonte: feedback direto de Carlos — v1 (creme/dourado/serifa/selo) lia
como "diário de princesa", não "SaaS do futuro"; faltava logotipo.

- **Paleta v2**: ink (#0b0d0c) dominante em toda a aplicação (não só
  header), panel (#141613) pra cards, âmbar (#e0a940, "fósforo de
  terminal") como cor de ação, mint pra status positivo, rust pra erro
  — convenção real de dashboard, não decoração.
- **Tipografia v2**: JetBrains Mono (self-hosted via @fontsource) pra
  display/headline/rótulos — decisão deliberada de reforçar que o
  produto SE CHAMA "Operating System"; Public Sans mantido pro corpo de
  texto (legibilidade). Fraunces removido.
- **Logotipo real**: `components/Logo.tsx` — marca geométrica com 8 nós
  ao redor de um núcleo central, representando literalmente os 8
  componentes do Core (LENS/SAGE/ATLAS/PULSE/PATHS/WINDOW/WORKERS + HUB
  no centro) — não é um ícone genérico, é o diagrama real do produto.
- **Perguntas dinâmicas por nicho**: `/api/perguntas-nicho` gera 2
  perguntas específicas via LLM a partir do nicho digitado, medindo
  envolvimento REAL com o estado da arte do mercado (física e
  digitalmente) — ex: nicho "organização de eventos" → pergunta sobre
  frequentar/produzir eventos, não presença digital genérica (isso já é
  perguntado em outra seção). Botão "Analisar meu nicho" dispara a
  geração; respostas (texto ou áudio, reaproveitando CampoTextoComAudio)
  entram no diagnóstico como contexto de calibração de oportunidades.
- D1: coluna `perguntas_nicho` adicionada à tabela `leads` via
  `ALTER TABLE` real (não migration arquivo, aplicada direto via query)

Testado: typecheck 11/11, build de produção com 5 rotas de API,
comportamento honesto confirmado sem chave configurada neste sandbox.

## PDF do diagnóstico + memória real por telefone (ATLAS-lite) (29/07/2026)

Fonte: pedido de Carlos — "não faz sentido a pesquisa ser dados que vão
ser apagados"; SAGE precisa ter memória real, não só arquitetura.

- **PDF real**: `lib/gerarPdf.ts`, via `pdf-lib` (puro JS, roda no
  navegador, sem serviço externo). Botão "Baixar PDF" no resultado,
  monta perguntas+respostas+diagnóstico completo (resumo, pontos
  favoráveis, achados de pesquisa, oportunidades, plano de 7 dias,
  distância até a meta).
- **Memória real por WhatsApp (primeiro pedaço real do SAGE)**:
  `buscarHistorico()` em `api/diagnostico/route.ts` consulta o D1 real
  por diagnósticos anteriores com o mesmo WhatsApp, ANTES de gerar o
  novo diagnóstico. Se encontrar, o resumo anterior entra no prompt
  como contexto real (nunca fabricado), com instrução de reconhecer a
  pessoa sem repetir o texto anterior literalmente. Frontend mostra
  banner "Reconhecemos você" quando há histórico.
- **Validado com dado real no banco de produção antes do deploy**:
  inserido um lead de teste com WhatsApp fixo, confirmado que a query
  de histórico retorna o resumo anterior corretamente, removido depois.
- **O que isso NÃO é ainda**: não é o SAGE completo (agente contínuo,
  proativo, decidindo ações). É memória real e reconhecimento real,
  disparado por formulário — a peça de "lembrar quem é a pessoa" que o
  futuro atendente de WhatsApp vai usar quando existir.

Testado: typecheck+lint+build de produção limpos; query de histórico
validada com INSERT/SELECT/DELETE reais no D1 de produção antes do
código ir pro ar.

## Nunca perder o que a pessoa preencheu (29/07/2026)

Fonte: Carlos reportou "page could not be found" ao clicar em "Ver meu
diagnóstico" — e pediu explicitamente que os dados nunca se percam,
mesmo se algo falhar.

- **Rascunho salvo no navegador (localStorage)**: todo o formulário é
  salvo automaticamente (debounced, 500ms) a cada mudança. Se a página
  falhar, recarregar, ou a pessoa fechar sem querer, o rascunho volta
  sozinho, com aviso "Recuperamos o que você já tinha preenchido antes"
  e opção de começar do zero. Limpo só depois de um diagnóstico gerado
  com sucesso.
- **Timeout explícito no fetch (AbortController, 110s)**: antes, uma
  falha de rede/timeout aparecia como erro genérico do navegador (o que
  provavelmente causou o "page could not be found" relatado). Agora
  aparece uma mensagem clara dentro do próprio app, reforçando que os
  dados estão salvos.
- **Expectativa de tempo**: texto abaixo do botão avisa que a busca de
  concorrentes reais pode levar até 1 minuto — hipótese real de causa
  raiz é a pessoa achar que travou e sair da tela antes de terminar
  (a pesquisa de concorrentes+nicho+verificação numa chamada só ficou
  mais pesada depois da feature de comparação com concorrentes).
- Bug real de lint pego no processo: `setState` síncrono dentro de
  `useEffect` (React) — corrigido com inicialização preguiçosa do
  estado (`useState(() => ...)`), padrão correto pra restaurar de
  localStorage sem cascata de renders.

Testado: typecheck+lint (0 erros reais)+build de produção limpos.
Causa raiz exata do "page could not be found" não confirmada (não temos
acesso a logs do Cloudflare nesta sessão) — mitigação cobre os cenários
mais prováveis (timeout, navegação por impaciência, erro de rede).

## Estrutura de preços e planos real (29/07/2026)

Fonte: pedido de Carlos — "assuma o destrave de dinheiro... defina
preços e planos". Decisão de dev master (produto/preço, não arquitetura
— sem necessidade de ADR), comunicada com raciocínio explícito, não
implementada silenciosamente.

- `/planos`: página real com 3 camadas + personalizado sob consulta:
  - Raio-X + Plano de Ação — R$97 (pagamento único, oferta de entrada)
  - Parceria Mensal Essencial — R$397/mês
  - Parceria Mensal Completa — R$797/mês
  - Personalizado — sob consulta
- Calibração: faixa real de gestão de redes sociais pra pequeno negócio
  no Brasil (R$300-800 freelancer/pequena agência, R$1.000-3.000 agência
  estabelecida) — AutoSetup posicionado competitivo por baixo dessa
  faixa. **Estimativa fundamentada, não testada com venda real** —
  ajustar conforme resposta de mercado.
- Fechamento do diagnóstico atualizado: menciona o plano de entrada
  (R$97) com link real pra `/planos`, em vez de oferta vaga sem preço.
- Público-alvo expandido (sugestão, não implementação de código):
  clínicas odontológicas, clínicas veterinárias, fisioterapeutas,
  academias pequenas, restaurantes/lanchonetes locais — mesmo perfil dos
  nichos já testados (dependem de reputação local/Google, baixa
  maturidade digital). Não expandido pra B2B/empresas maiores.
- RH: pricing não definido ainda — prematuro antes do PRD existir.

Testado: typecheck+lint+build de produção limpos (12 rotas).

## Robustez pra venda: rate limiting + privacidade (29/07/2026)

Fonte: pedido de Carlos — "melhoramentos faltantes pra AutoSetup ficar
mais robusto e pronto pra ser vendido". Inventário completo dado a
Carlos: falta checkout de pagamento real (maior gap), rate limiting
(resolvido agora), política de privacidade (resolvido agora), domínio
próprio (pendente, depende de decisão/compra de Carlos), analytics
(pendente).

- **Rate limiting real**: tabela `rate_limits` no D1, testada com
  INSERT/SELECT/DELETE reais antes do código. Aplicado nas 4 rotas que
  custam dinheiro de verdade (diagnostico: 5/hora, perguntas-nicho:
  10/hora, transcrever: 20/hora, rh/entrevista: 5/hora) por IP. Falha
  do D1 nunca bloqueia a requisição (best-effort, protege custo sem
  arriscar disponibilidade).
- **Política de Privacidade e Termos de Uso real**: `/privacidade`,
  texto honesto sobre o que é coletado, como é usado, onde fica
  guardado (D1/Cloudflare), direitos LGPD, e deixa claro que o
  diagnóstico é análise, não garantia de resultado. Linkado no rodapé
  do diagnóstico e da entrevista de RH.

Ainda pendente (depende de decisão de Carlos, não implementado):
checkout de pagamento real (Mercado Pago/Stripe — precisa de conta
própria dele), domínio próprio, analytics de funil.

Testado: typecheck+lint+build de produção limpos (13 rotas). Rate limit
verificado com dado real no D1 de produção antes do deploy.

## Checkout real via Mercado Pago (30/07/2026)

Fonte: pedido de Carlos — "assuma o destrave de dinheiro", decisão de
processador confirmada (Mercado Pago, conta pessoa física/CPF por
enquanto). Fecha o maior gap identificado no inventário de robustez.

- Confirmado na documentação oficial: pagamento único usa API de
  Preferências (Checkout Pro), assinatura mensal usa API de Preapproval
  — dois mecanismos distintos, implementados corretamente.
- `lib/mercadoPago.ts`: `criarPreferencia()` (Raio-X R$97) e
  `criarAssinatura()` (Essencial R$397/mês, Completo R$797/mês)
- `api/pagamento/criar-checkout`: recebe plano+e-mail, cria o checkout
  certo conforme o tipo, salva pagamento como "pendente" no D1
  (tabela `pagamentos`, criada e testada antes do código)
- `api/pagamento/webhook`: recebe notificação real do Mercado Pago,
  consulta o status real (nunca confia no payload da notificação sem
  verificar), atualiza o D1. Sempre retorna 200 rápido — Mercado Pago
  reenvia por até 4 dias se não receber confirmação.
- `/planos`: botões reais "Comprar"/"Assinar", pede nome+e-mail inline,
  redireciona pro checkout de verdade do Mercado Pago
- `/planos/sucesso`: página de retorno pós-pagamento

**Pendência real, ação de Carlos**: `MERCADOPAGO_ACCESS_TOKEN` precisa
ser gerado no painel de desenvolvedores do Mercado Pago e colado direto
no painel de Secrets da Cloudflare — nunca em chat, mesma regra de
sempre. Sem isso, o checkout retorna erro honesto (não finge sucesso).
Webhook também precisa ser configurado no painel do Mercado Pago
apontando pra `/api/pagamento/webhook`.

Bug real de lint pego no processo: `window.location.href = ...` é
rejeitado pela versão atual do eslint-plugin-react-hooks (regra de
imutabilidade) — corrigido usando `window.location.assign()`.

Testado: typecheck+lint (0 erros)+build de produção limpos (14 rotas).
Comportamento honesto confirmado sem chave configurada neste sandbox.
