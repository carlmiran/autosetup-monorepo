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

## Google Places API real pra comparação com concorrentes (30/07/2026)

Fonte: Carlos perguntou se já tínhamos integração com Google Places —
não tínhamos, o sistema dependia só da IA "lendo a internet" (OpenAI
web_search) pra achar concorrentes, o que podia sair impreciso.

- `lib/googlePlaces.ts`: busca real via Places API (New), Text Search
  com query "[nicho] em [cidade]", retorna nome/endereço/avaliações/
  nota REAIS e estruturados direto do Google — não depende da IA
  interpretar texto de página.
- `gerarDiagnosticoComPesquisa`: busca concorrentes via Google Places
  ANTES de chamar a IA; se encontrar, injeta a lista no prompt como
  dado já verificado ("use apenas estes, não pesquise nem invente
  outros") — a IA só escreve a comparação honesta, não precisa mais
  descobrir os concorrentes sozinha. Se a chave não estiver configurada
  ou a busca não achar nada, cai de volta pro método anterior (busca via
  IA) — nunca quebra o diagnóstico por causa disso.
- Custo real pesquisado: cobrança por SKU (~R$160-200/1.000 buscas pro
  tier com avaliação), mas **5.000 buscas grátis por mês** — dado o
  volume atual do AutoSetup, deve sair de graça por um bom tempo.

Pendência real, ação de Carlos: criar conta Google Cloud (exige cartão
cadastrado, mesmo pra usar cota grátis), ativar "Places API (New)",
gerar chave, colar como `GOOGLE_PLACES_API_KEY` no painel da Cloudflare
— nunca em chat.

Testado: typecheck+lint(0 erros)+build de produção limpos. Comportamento
honesto confirmado: ausência da chave não quebra o fluxo, cai pro
método anterior sem erro.

## Radar de Oportunidades — prospecção por geolocalização (30/07/2026)

Fonte: pedido de Carlos — navegar negócios reais perto de um local
(estilo "pedir um Uber"), clicar num e ver análise comercial como
possível cliente, sem precisar pré-selecionar nicho.

- `lib/googlePlaces.ts`: nova função `buscarNegociosProximos()` — usa
  Nearby Search da Places API (New), endpoint diferente do Text Search
  já usado pra concorrentes no diagnóstico. Filtro de tipo opcional.
- `lib/radar.ts`: `gerarAnaliseRadar()` — usa OpenAI Responses API com
  `web_search` de verdade (bug real pego antes do deploy: a primeira
  versão usava o Gateway de texto simples, sem ferramenta de busca,
  então a instrução "pesquise na web" no prompt não tinha como
  funcionar — corrigido pro mesmo padrão real do diagnóstico). Tom
  deliberadamente diferente do LENS: é nota interna de prospecção, não
  fala com o dono do negócio (que não pediu a análise).
- `/api/radar/proximos` + `/api/radar/analisar`: rate limiting aplicado
  (15/hora cada), erro honesto sem `GOOGLE_PLACES_API_KEY`/localização
  inválida — testado antes do deploy.
- `/radar`: página com geolocalização real do navegador, lista de
  negócios próximos, clique gera análise (resumo, presença digital,
  oportunidades, abordagem sugerida).

Nota de processo: outra sessão paralela já tinha implementado a
integração base do Google Places (commit 56b0c6c) enquanto esta sessão
conversava com Carlos sobre o mesmo assunto — verificado e reaproveitado
antes de construir em cima, evitando duplicação.

Pendência: mesma GOOGLE_PLACES_API_KEY do diagnóstico cobre esta
feature também — nenhuma chave nova necessária.

Testado: typecheck (achou e corrigiu um erro de sintaxe real deixado
por um str_replace anterior) + lint (0 erros) + build de produção
limpos (15 rotas). Comportamento honesto confirmado sem chave/dado
inválido neste sandbox.

## Rastreamento de indicação — base pra comissão futura (30/07/2026)

Fonte: pedido de Carlos — modelo de comissão por indicação (tipo
iFood/Quinto Andar), pessoa usa o Radar pra achar prospect, visita,
faz diagnóstico, oferece serviços da agência, ganha comissão.

Decisão de escopo (dev master): implementar SÓ o rastreamento agora —
pagamento automático de comissão fica de fora, porque envolve formalizar
acordo com quem indica (contrato/recibo, decisão contábil) antes de virar
código, e Carlos ainda está em CPF, não CNPJ.

- D1: coluna `codigo_indicacao` adicionada em `leads` e `pagamentos`
  (ALTER TABLE real, testado com INSERT/SELECT antes do deploy)
- `/diagnostico` e `/planos`: capturam `?ref=CODIGO` da URL
  automaticamente e salvam junto com o lead/pagamento
- Uso pretendido: cada pessoa que for prospectar recebe um link próprio
  (ex: `.../diagnostico?ref=NOMEDOPARCEIRO`), e Carlos consegue ver no
  banco quem trouxe qual venda pra calcular comissão manualmente por
  enquanto

Pendência real: nenhuma interface de gestão de parceiros/comissões foi
construída — isso é decisão de produto pra depois, quando o modelo for
validado com volume real.

Testado: typecheck+lint(0 erros)+build de produção limpos (15 rotas).
Rastreamento validado com INSERT/SELECT/DELETE reais no D1 de produção.

## LENS consultivo: glossário + honestidade financeira + prioridade (31/07/2026)

Fonte: proposta do ChatGPT (evolução comercial do LENS) — aceita com
correção séria. Cabe no feature freeze por ser melhoria de LENS/
conversão, não funcionalidade nova.

- **Adotado**: estrutura consultiva (o que aconteceu → por que importa,
  explicando termo técnico na hora → o que fazer), sem exigir schema
  novo — instrução reforçada nos dois prompts
- **Adotado**: prioridade (alta/média/baixa) em cada dia do plano de 7
  dias — novo campo opcional `prioridade`, badge visual no resultado
- **CORRIGIDO antes de implementar**: o "Motor de Impacto Financeiro"
  original pedia sempre calcular um valor em R$ específico (ex: "R$
  2.870/mês"), rotulando como "estimativa" quando não há dado real.
  Isso foi rejeitado — um número específico fabricado continua sendo
  fabricação mesmo com etiqueta de honestidade colada. Regra
  implementada: só citar R$ específico com base real (dado informado
  pelo usuário ou pesquisa real confirmada); sem base, dizer isso
  explicitamente, nunca inventar número pra "parecer mais concreto"
- **Não implementado agora**: plano de 90 dias (mudança de estrutura
  maior, mudança de estrutura maior, fica pra depois de testar o resto)

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Preço real do serviço = impacto financeiro real (31/07/2026)

Fonte: Carlos perguntou se cliente poderia informar tabela de preços
pra tornar as estimativas financeiras reais. Resposta: sim, mas como
campo de texto (com áudio), não upload de arquivo — evita ativar a
construção maior do Painel do Cliente (que exigiria storage/R2, fora de
escopo por ora).

- Novo campo opcional `precosServicos` no formulário ("Quanto você
  cobra pelos seus principais serviços?"), mesmo padrão de áudio já
  usado nos outros campos
- Instrução de impacto financeiro atualizada: quando esse preço real
  existe, a IA é instruída a calcular impacto de verdade em cima dele
  (ex: "+3 clientes/mês x R$150 = R$450"), deixando claro que veio do
  preço informado pelo próprio dono — fecha exatamente o gap que a
  correção da proposta do ChatGPT (nunca inventar R$) tinha deixado:
  agora existe um caminho real pra ter número de verdade, não só a
  opção de "não temos base pra estimar"
- D1: coluna `precos_servicos` adicionada à tabela `leads`

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Bug real de campo encontrado por prospect (02/08/2026)

Fonte: Fábio (Pousada Casa do Fábio, primeiro contato externo real),
relatou por áudio no WhatsApp pra Carlos que não conseguiu colocar o
link do Instagram no diagnóstico. Nenhum registro dele apareceu no D1,
consistente com ter travado no formulário antes de conseguir enviar.

Hipótese técnica (provável causa raiz): os campos de link usavam
`type="url"`, que exige protocolo (`https://`) pra passar na validação
nativa do navegador. Usuário real digitando só `instagram.com/negocio`
(sem `https://`) provavelmente travava no envio sem mensagem de erro
clara.

Corrigido: campos trocados pra `type="text"` (sem validação nativa
rígida), com `inputMode="url"` (mantém teclado otimizado no celular),
microcopy explicando que funciona com ou sem "https://", e normalização
real no `handleSubmit` — adiciona `https://` automaticamente se a
pessoa não digitou, antes de mandar pro servidor.

Bug real de lint pego no processo: aspas retas dentro de JSX
(`react/no-unescaped-entities`) — corrigido com `&quot;`.

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Notificação real de pagamento + checklist de entrega (02/08/2026)

Fonte: Carlos, cenário identificado — "o que acontece quando alguém
paga de verdade e ninguém é avisado?"

- `lib/resend.ts`: envia e-mail real via Resend quando o webhook do
  Mercado Pago confirma status "approved"/"authorized" — usa domínio de
  teste deles (`onboarding@resend.dev`), não exige domínio próprio
- Deduplicação real: só notifica quando o UPDATE no D1 realmente mudou
  o status de "pendente" (checando `changes` do resultado) — reenvio do
  mesmo webhook pelo Mercado Pago não gera aviso duplicado
- `docs/checklist-entrega.md`: processo real de entrega pro Raio-X e
  planos mensais, com prazo definido (3 dias úteis) — antes não existia
  nenhum processo escrito, só a promessa em `/planos`

**Pendência real, ação de Carlos**: criar conta no Resend, gerar
`RESEND_API_KEY`, colar no painel da Cloudflare — mesma regra de
sempre, nunca em chat. Também precisa definir `NOTIFICATION_EMAIL`
(o e-mail que deve receber o aviso — pode ser passado em texto, não é
segredo).

Testado: typecheck+lint(0 erros)+build de produção limpos.

## LENS multilíngue (texto, sem mudança de negócio) (02/08/2026)

Fonte: Carlos perguntou sobre tornar o LENS global. Separado em parte
barata (implementada) e parte cara (documentada como visão gated, ver
`docs/plano-lens-global.md`).

- Instrução adicionada aos dois prompts do diagnóstico: responder no
  mesmo idioma que a pessoa usou pra escrever as respostas — capacidade
  nativa do modelo, sem custo extra, sem infraestrutura nova
- Preço (R$), processador de pagamento (Mercado Pago), base jurídica
  (LGPD/RFC-001) continuam Brasil-only — "ir global de verdade" exige
  resolver pagamento/moeda/jurídico por região, escopo equivalente ao
  da frente B2B já gated

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Geração real de imagem pra posts + oferta reforçada (06/08/2026)

Fonte: implementação a partir das decisões consolidadas nas últimas
horas (memória de sessões paralelas) — Carlos pediu implementação
direta como Dev Master.

- `lib/gerarImagemPost.ts`: gera imagem real via OpenAI (gpt-image-1),
  a partir de tema+legenda — mesma chave já configurada, custo real
  ~R$0,10-0,20/imagem (modelo calculado antes, confirmado)
- `/api/entrega/gerar-post` + `/entrega/gerar-post`: ferramenta
  interna (não linkada publicamente), pra equipe gerar a imagem durante
  a entrega de um plano pago — rate limit de 30/hora (uso interno, não
  público)
- **Decisão de escopo**: NÃO chamado automaticamente no `/diagnostico`
  gratuito — custo fica embutido só nos planos pagos, consistente com
  a decisão já registrada de não inflar o custo do que é grátis
- `/planos`: Essencial atualizado pra 12 posts/mês, Completo pra 24/mês
  (texto + imagem pronta), copy menciona entrega em pequenos lotes via
  WhatsApp — números batem com o modelo de custo calculado (~2% da
  receita do plano)

**O que ainda não foi implementado, propositalmente**: envio automático
via WhatsApp (continua exigindo CNPJ + verificação Meta) — a entrega
continua manual, equipe gera a imagem aqui e manda ela mesma, mesmo
padrão do checklist de entrega já documentado.

Testado: typecheck+lint(0 erros)+build de produção limpos (16 rotas).
Comportamento honesto confirmado sem chave configurada neste sandbox.

## Manual do Indicador (06/08/2026)

Fonte: Carlos pediu um manual pra pessoa sem experiência de vendas
(ou migrando de carreira) usar o Radar de Oportunidades pra prospectar
e vender o AutoSetup.

- `/radar/manual`: 8 seções — o que é o AutoSetup, resumo do papel do
  indicador, passo a passo real de uso do Radar, script de abordagem,
  o que explicar sobre o diagnóstico, o que NUNCA prometer (resultado
  garantido, WhatsApp automatizado, geração automática de post no
  gratuito), como funciona a comissão HOJE (honesto: rastreamento já
  existe via `?ref=`, pagamento automático ainda não validado —
  combinado direto com quem indicou por enquanto), perguntas comuns
- Linkado a partir de `/radar` ("Primeira vez? Leia o manual")
- Decisão de honestidade: não empurra ninguém pra `/indicadores/entrar`
  (fluxo de conexão Mercado Pago não validado) — o manual reflete o
  estado real do sistema, não o estado desejado

Testado: typecheck+lint(0 erros)+build de produção limpos (17 rotas).

## Termos de colaboração — sem vínculo empregatício (06/08/2026)

Fonte: Carlos pediu esclarecimento formal de que a atividade de
indicação/prospecção não constitui vínculo empregatício.

- `/radar/termos`: sem vínculo empregatício, como funciona a comissão
  hoje (honesto: combinada diretamente, pagamento automático não
  validado ainda), o que se espera do indicador, direito de parar a
  qualquer momento sem penalidade
- Aviso explícito no topo: não é contrato formal registrado nem
  revisado por advogado — se a relação virar PJ/RPA formal, documento
  próprio revisado juridicamente será criado (mantém a mesma cautela já
  registrada em `docs/plano-onboarding-vendedores.md`)
- Linkado a partir de `/radar/manual`

Testado: typecheck+lint(0 erros)+build de produção limpos (18 rotas).

## Painéis internos: comissões e clientes (06/08/2026)

Fonte: Carlos pediu forma de gerenciar pagamento manual de comissão e
acompanhamento pós-venda, já que ambos ainda são processos manuais.

- `/admin/comissoes`: lista pagamentos aprovados com indicador
  associado, calcula comissão (20%), checkbox pra marcar como paga
  (persistido no D1, nova coluna `comissao_paga`), total em aberto,
  exportação CSV pra abrir como planilha
- `/admin/clientes`: lista diagnósticos e pagamentos (duas listas
  separadas — não existe campo em comum confiável entre `leads` e
  `pagamentos` hoje pra juntar automaticamente sem risco de associar
  errado, documentado no próprio código), exportação CSV de cada uma
- Nenhuma das duas páginas linkada publicamente — uso interno

Testado: typecheck+lint(0 erros, corrigido um erro real de React
hooks)+build de produção limpos (20 rotas). Dado real gravado/consultado/
removido no D1 de produção antes do deploy.

## Meus Clientes (indicador) + Radar sem repetir negócio visto (06/08/2026)

Fonte: Carlos pediu que o vendedor/indicador tenha controle próprio dos
clientes dele (WhatsApp, notas, follow-up) enquanto atendimento
automatizado não existe, e que o Radar não repita negócio já visto pro
mesmo vendedor.

- `clientes_indicador` (D1): lista pessoal por código de indicador —
  nome, WhatsApp, notas ("vontades e detalhes da venda"), data de
  follow-up
- `radar_visto` (D1): registra qual negócio (place_id) cada código já
  viu; `/api/radar/proximos` agora filtra automaticamente esses
  negócios das buscas seguintes do mesmo código
- `/radar/meus-clientes`: sem login, identificado só pelo código (mesmo
  padrão informal do resto do programa) — cadastra cliente, vê lista
  com destaque visual pra follow-up atrasado (vermelho) ou hoje
  (âmbar)
- `/radar`: ganhou campo de código (opcional) e link pra "Meus clientes
  e follow-ups"

**Honestidade sobre o que ficou de fora**: notificação push/automática
("radar sempre ligado avisando") não foi construída — exigiria conta de
usuário real (não existe) e serviço de notificação push (infraestrutura
nova). O que existe é pull, não push: o vendedor abre a própria lista e
vê o que está atrasado/pra hoje, o sistema não avisa sozinho ainda.

Bug real de lint corrigido no processo: mesmo padrão de setState
síncrono em efeito via função nomeada — corrigido com IIFE inline +
inicialização preguiçosa do código vindo da URL.

Testado: typecheck+lint(0 erros)+build de produção limpos (21 rotas).
Dado real gravado/consultado/removido nas duas tabelas novas antes do
deploy.

## Desconto por diagnóstico bem respondido (07/08/2026)

Fonte: Carlos pediu incentivo pra converter mais gente pros planos, mas
condicionado à qualidade real das respostas — nunca desconto por
"responder de qualquer jeito".

- Prompts do diagnóstico (ambos) ganharam avaliação real de qualidade:
  `respostasSubstantivas: boolean` — só `true` se pelo menos 2 respostas
  em texto livre forem específicas e reais, nunca por só ter enviado o
  formulário. Default conservador (`false`) se o modelo não informar.
- Quando `true`, gera um código real (`LENS` + 6 caracteres aleatórios),
  salva no D1 (`descontos`, 15%), mostra na tela do resultado
- O link pro plano de entrada já leva o código embutido
  (`/planos?desconto=CODIGO`) — não precisa copiar/colar
- `/planos`: campo de código de desconto no checkout, valida de verdade
  contra o D1 antes de criar a Preferência/Assinatura — código
  inválido ou já usado retorna erro claro, nunca ignora silenciosamente
- Marcação de uso é atômica (`UPDATE ... WHERE usado = 0`, checando
  `changes`) — evita dois checkouts simultâneos usarem o mesmo código
- Comissão do indicador (quando existe) calculada sobre o valor **já
  com desconto**, não o valor cheio — justo com o indicador, reflete a
  receita real

Testado: typecheck+lint(0 erros)+build de produção limpos (21 rotas).
Ciclo completo (gerar código → validar → marcar usado → tentar reusar)
testado com dado real no D1 de produção antes do deploy.

## Correção: desconto só pra assinatura mensal (07/08/2026)

Fonte: Carlos revisou a própria ideia — melhor incentivar receita
recorrente (Essencial/Completo) do que descontar o Raio-X, que já é a
entrada mais barata e não precisa de desconto extra pra ser aceito.

- `/api/pagamento/criar-checkout`: rejeita código de desconto em plano
  `tipo !== "assinatura"` **antes** de validar/consumir o código no
  banco — uma tentativa errada nunca queima o código à toa
- Copy do banner de desconto no resultado do diagnóstico atualizada:
  "vale um desconto na assinatura mensal (Essencial ou Completo)", não
  mais "em qualquer plano"

Testado: typecheck+lint(0 erros)+build de produção limpos. Confirmado
que tentar aplicar no Raio-X recusa com mensagem clara, sem consumir o
código.

## Radar com horário real + Manual enriquecido (08/08/2026)

Fonte: Carlos perguntou como o AutoSetup deveria atuar quando a rota do
Radar mostra nichos variados, e pediu estratégia de vendedor de
software.

- **Esclarecimento**: a análise do Radar já se adapta a qualquer nicho
  por construção (IA + pesquisa real por negócio, não template fixo) —
  nenhuma mudança de código necessária pra isso
- `lib/googlePlaces.ts`: campo `regularOpeningHours` adicionado ao
  Nearby Search — Radar agora mostra "Aberto agora"/"Fechado agora" na
  lista, informação real de quando visitar
- `/radar/manual`: duas seções novas (renumerado 01-10):
  - "Antes de visitar — o que checar" (usar o horário do Radar, olhar
    perfil digital do negócio, ler avaliação negativa como gancho,
    evitar hora de pico)
  - "O que um bom vendedor de software faz diferente" (escutar mais
    que falar, diagnóstico é demonstração não venda, perguntar o
    porquê de um "não", nunca insistir na hora)

Testado: typecheck+lint(0 erros, corrigido erro real de aspas em
JSX)+build de produção limpos (21 rotas).

## Redirecionamento honesto pra quem não tem negócio (09/08/2026)

Fonte: Carlos perguntou o que aconteceria se alguém preenchesse "nicho"
com algo que não é negócio (ex: "mãe solteira", "desempregado"). Buraco
real identificado: o diagnóstico pressupõe negócio existente, mas o
formulário nunca direcionava quem não tem um.

- `/diagnostico`: aviso no topo do formulário, antes de qualquer campo
  — explica que o diagnóstico é pra quem tem/está começando negócio, e
  linka pro Manual do Indicador (`/radar/manual`) pra quem quer renda
  sem ter negócio próprio (caminho que já existia, só não era indicado)
- Prompts do diagnóstico (ambos): instrução nova — se "nicho" não
  parecer negócio de verdade, o resumo reconhece isso com gentileza e
  menciona o caminho de indicador, em vez de fingir que existe
  oportunidade de negócio que não existe

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Removida obrigatoriedade de pergunta de negócio (09/08/2026)

Fonte: Carlos testou preenchendo nicho "desempregado" e constatou que
ainda era obrigado a responder "qual sua maior dificuldade pra atrair
clientes" — pergunta que não faz sentido pra quem não tem negócio.

- `maiorDificuldade` deixou de ser obrigatório: removido `required` do
  campo no formulário, removido da validação do backend
  (`api/diagnostico/route.ts`), tipo atualizado pra opcional em
  `lib/diagnostico.ts`
- Prompts do diagnóstico (ambos) tratam a ausência explicitamente:
  "Maior dificuldade: não informada (pode ser sinal de que a pessoa não
  está numa situação de negócio tradicional)" — nunca quebra nem finge
  que a resposta existe
- Campos obrigatórios agora: nome, cidade, nicho — os mínimos que
  fazem sentido pra qualquer situação, sem forçar pergunta
  business-specific

**Decisão consciente, comunicada a Carlos**: não construí "orientação
de amparo pra qualquer situação de vida" — isso extrapola o que o
AutoSetup é/deveria fingir ser, e poderia ser prejudicial (dar sensação
de ajuda real onde não existe recurso de verdade) pra alguém numa
situação vulnerável. A resposta honesta pra quem não tem negócio
continua sendo o direcionamento pro caminho de indicador, já
implementado ontem.

Testado: typecheck+lint(0 erros)+build de produção limpos. Confirmado
que o formulário aceita envio sem "maior dificuldade" e continua
recusando sem os 3 campos mínimos reais.

## Meus Clientes: editar, apagar, compartilhar (10/08/2026)

Fonte: Carlos viu a página real (print do celular, cliente "Fabio Wey"
cadastrado) e pediu edição completa — hoje só dava pra criar.

- `PATCH /api/indicadores/clientes`: edita nome/WhatsApp/notas/follow-up
  de um cliente existente — sempre filtrado por `codigo_indicacao`
  também (um indicador só edita o próprio registro, mesmo sabendo o id
  de outro)
- `DELETE /api/indicadores/clientes`: apaga, mesma trava de código
- `/radar/meus-clientes`: cada cliente ganhou 4 ações — Editar (form
  inline pré-preenchido), Copiar (formata as informações em texto e
  copia pra área de transferência — funciona com qualquer app que o
  indicador queira colar depois), Abrir WhatsApp (link direto
  `wa.me/` quando tem WhatsApp cadastrado), Apagar (com confirmação)

Bug real de lint corrigido no processo: mesmo padrão de sempre
(setState síncrono em efeito via função nomeada) — IIFE inline de novo.

Testado: typecheck+lint(0 erros)+build de produção limpos (21 rotas).
Ciclo completo (inserir→editar→apagar) testado com dado real no D1 de
produção antes do deploy.

## Visualização Kanban em Meus Clientes (11/08/2026)

Fonte: Carlos pediu visualizações diferentes (cards, etiquetas de
prioridade/agendamento, estilo Kanban).

- `/radar/meus-clientes` ganhou alternador **Lista / Kanban** no
  cabeçalho — mesmo dado, duas formas de ver, sem mudança nenhuma no
  banco
- Kanban usa 4 colunas calculadas a partir do mesmo campo que já
  existia (`data_followup`): **Atrasado** (vermelho), **Hoje** (âmbar),
  **Agendado** (verde), **Sem data** (neutro) — cada coluna mostra a
  contagem de clientes
- Card virou componente reutilizável (`CardCliente`), usado igual nas
  duas visualizações — evita duplicar lógica de editar/copiar/
  WhatsApp/apagar
- Colunas roláveis horizontalmente (`overflow-x-auto`), pensado pra
  celular

Testado: typecheck+lint(0 erros)+build de produção limpos (21 rotas).

## Ícone de WhatsApp no card (11/08/2026)

Fonte: Carlos pediu que o link de WhatsApp em cada card do "Meus
Clientes" fosse um ícone, não texto visível — já existia como link de
texto ("WhatsApp"), agora é um ícone real (SVG inline, sem dependência
nova), com `aria-label`/`title` pra acessibilidade. Comportamento
continua o mesmo: abre a conversa direto no WhatsApp do cliente (nunca
compartilha nada automaticamente), útil pra coletar informação extra,
entregar material, ou copiar um áudio do cliente pra colar depois no
campo de anotações (via o botão Editar já existente).

Testado: typecheck+lint(0 erros)+build de produção limpos.

## Importação de planilha (CSV) em Meus Clientes (11/08/2026)

Fonte: Carlos pediu subir uma planilha de contatos (feita via scraper)
e virar cards em lote — esclarecido que não é redundante com o Radar
(fontes diferentes: Radar acha negócio perto de agora, planilha traz
contato de qualquer lugar, pré-filtrado).

- `papaparse` adicionado como dependência real (parser de CSV robusto —
  lida com aspas/vírgula dentro de campo, comum em planilha de
  scraper)
- `/radar/meus-clientes`: seção "Importar planilha (CSV)" — sobe
  arquivo, detecta automaticamente qual coluna é nome/WhatsApp/notas
  por heurística de nome de cabeçalho (sempre mostrado pro usuário
  conferir/trocar antes de importar, nunca assume certeza), prévia das
  3 primeiras linhas, botão de importar com progresso real
  (feito/total, falhas reportadas)
- Importação reaproveita o mesmo endpoint de criar cliente já
  existente (POST), um por um — sem endpoint novo de bulk-insert
- Rate limit do endpoint de clientes elevado de 60 pra 300/hora (essa
  rota não chama IA nenhuma, só grava no D1 — custo real é zero, só
  limita abuso, não uso legítimo de importação em lote)

Testado: typecheck+lint(0 erros)+build de produção limpos (21 rotas).

## Painel pessoal de desempenho do indicador (11/08/2026)

Fonte: Carlos pediu identificação de gargalos pra ferramenta de
vendedores — maior gargalo identificado: indicador trabalhava sem ver
o próprio resultado (só Carlos via `/admin/comissoes`).

- `/api/indicadores/desempenho`: agrega dado que já existia
  (`leads`/`pagamentos` filtrados por `codigo_indicacao`) — diagnósticos
  gerados, quantos demonstraram interesse, vendas confirmadas, comissão
  total/paga/pendente (20%, mesmo cálculo já usado em `/admin/comissoes`)
- `/radar/meu-desempenho`: página real, sem login (por código), 4
  números principais + detalhe de comissão + aviso honesto de que
  pagamento ainda é manual
- Linkado a partir de `/radar`

Outros 3 gargalos identificados e registrados, não construídos ainda:
colisão de código entre indicadores (sem checagem de unicidade), falta
de canal de aviso Carlos→indicadores, funil de conversão por cliente
individual (Meus Clientes) ainda não cruzado com leads/pagamentos reais.

Testado: typecheck+lint(0 erros)+build de produção limpos (22 rotas).
Cálculo de comissão validado com dado real inserido/consultado/removido
no D1 de produção antes do deploy.

## Três gargalos resolvidos: PIN, avisos, funil real (11/08/2026)

Fonte: Carlos pediu "construa tudo que for necessário" pros 3 gargalos
restantes identificados no turno anterior.

**1. Colisão de código (PIN de 4 dígitos)**
- `indicadores_registro` (D1): codigo + pin. Primeira vez que um código
  é usado, reivindica com um PIN escolhido na hora; da próxima vez,
  precisa do mesmo PIN — nunca deixa duas pessoas usarem o mesmo texto
  sem perceber
- `/api/indicadores/registro` + componente `EntradaComPin` (reutilizado
  em `/radar/meus-clientes` e `/radar/meu-desempenho`, as duas páginas
  com dado sensível — comissão e lista pessoal)
- Link com `?codigo=` agora só pré-preenche o campo, não pula mais o
  PIN — preservar a proteção mesmo vindo de link direto

**2. Canal de aviso Carlos→indicadores**
- `avisos` (D1) + `/api/avisos` (GET público, POST interno) +
  `/admin/avisos` (Carlos publica, não linkado publicamente)
- Componente `AvisoIndicadores` — mural, não notificação push; mostrado
  em `/radar`, `/radar/manual`, `/radar/meus-clientes`,
  `/radar/meu-desempenho`. Só um aviso ativo por vez

**3. Funil de conversão real por cliente**
- `/api/indicadores/clientes` agora cruza cada cliente com `leads` pelo
  WhatsApp normalizado (único campo em comum confiável) — mostra "✓ Fez
  o diagnóstico em [data]" no card quando encontra correspondência
  real. Sem inventar status quando não dá pra confirmar

Testado: typecheck+lint(0 erros)+build de produção limpos (25 rotas).
PIN, aviso e normalização de WhatsApp validados com dado real
inserido/consultado/removido no D1 de produção antes do deploy. Teste
local do endpoint de PIN bateu na limitação conhecida do
`getCloudflareContext` fora do ambiente real (mesma limitação já vista
antes nesta sessão) — validação real feita direto no D1 de produção.

## Parecer de prioridade — diagnóstico + anotação do vendedor (11/08/2026)

Fonte: Carlos pediu — cruzar o diagnóstico real do cliente com as
anotações que o vendedor já tem sobre ele, e devolver UMA prioridade
clara pro cliente resolver (mesmo formato que Claude usa com Carlos:
apontar o bloqueio real, não listar 10 pendências soltas).

- `lib/gerarParecer.ts`: recebe diagnóstico real (resumo salvo +
  maior dificuldade) + anotação do vendedor (se houver), devolve UMA
  prioridade + porquê + mensagem pronta pra mandar no WhatsApp,
  terminando perguntando se o cliente quer resolver agora. Regra de
  honestidade: só usa o que está de fato escrito nas duas fontes,
  nunca inventa problema que nenhuma delas mencionou
- `/api/indicadores/parecer`: busca o cliente, cruza com `leads` pelo
  WhatsApp (usando a correção abaixo), chama o motor
- Botão "✨ Gerar parecer de prioridade" no card de "Meus Clientes" —
  só aparece quando já existe diagnóstico real casado (reaproveita o
  cruzamento de funil construído antes)

**Bug real encontrado e corrigido nesta mesma sessão, antes de
publicar**: a normalização de WhatsApp usada pro cruzamento (aqui e em
`/api/indicadores/clientes`) só removia caractere não-numérico —
`5535977776666` (com DDI) e `35977776666` (sem DDI) são o mesmo número
mas não batiam. Corrigido pra comparar só os últimos 11 dígitos.
Achado testando com dado real inserido no D1 de produção antes do
deploy — exatamente o motivo de sempre testar assim, não confiar que
"deveria funcionar".

Testado: typecheck+lint(0 erros)+build de produção limpos (26 rotas).
Cruzamento de WhatsApp validado com dado real, com e sem DDI, no D1 de
produção.

## Parecer vira sequência guiada (11/08/2026)

Fonte: Carlos pediu evolução do parecer de prioridade — depois de
resolvido e comprovado, mostrar o próximo passo da mesma forma, com
explicação do que fica destravado.

- `lib/gerarParecer.ts`: agora gera até 3 prioridades em sequência
  (não mais uma só), cada uma com `oQueDestrava` (o que fica possível
  no negócio assim que aquela prioridade for resolvida)
- `clientes_indicador` (D1): novas colunas `pareceres_json` (a
  sequência inteira, gerada uma vez) e `parecer_indice` (qual passo
  está ativo)
- `/api/indicadores/parecer`: POST gera a sequência só na primeira
  vez (não regenera se já existe); PATCH avança o índice quando o
  vendedor confirma que o passo atual foi resolvido de verdade
- Card de "Meus Clientes": mostra só o passo atual ("Passo 1 de 3 —
  ..."), com botão "✓ Marcar resolvido e ver próximo passo" (pede
  confirmação antes de avançar — nunca avança sozinho)

Testado: typecheck+lint(0 erros)+build de produção limpos (26 rotas).
Gravação da sequência e avanço de índice validados com dado real no D1
de produção antes do deploy.

## Bug real corrigido: limite de diagnóstico bloqueou venda real (13/08/2026)

Fonte: Carlos reportou — abordou um cliente real, mandou o link, foi
testar ele mesmo e recebeu erro de limite excedido no meio do
questionário. Bloqueou uso legítimo durante uma abordagem comercial de
verdade.

**Causa raiz encontrada**: `/api/diagnostico` tinha limite de 5
diagnósticos/hora por IP — baixo demais pra um cenário real onde a
mesma pessoa testa/demonstra várias vezes antes de abordar, e sem
considerar que múltiplas pessoas diferentes podem compartilhar o mesmo
IP público no Brasil (CGNAT das operadoras), fazendo teste de uma
pessoa consumir cota de outra sem relação nenhuma.

**Corrigido**: limite elevado de 5 pra 25/hora. Custo real por
diagnóstico é baixo (~US$0,05-0,15 com pesquisa), então 25/hora ainda
protege contra abuso sério (pior caso ~US$2-4/hora de um único IP) sem
travar uso legítimo. Mensagem de erro também melhorada, convidando a
pessoa a avisar se acontecer de novo numa demonstração real.

Outras rotas do mesmo fluxo (perguntas-nicho 10/h, transcrever 20/h)
já estavam em níveis razoáveis — não mexidas, o problema era
específico do envio final.

Testado: typecheck+lint(0 erros)+build de produção limpos. Confirmado
no D1 de produção que não há bloqueio ativo pro IP relatado no momento
(contagem atual bem abaixo do novo limite).

## Diagnóstico rápido — 5 perguntas (13/08/2026)

Fonte: Carlos pediu versão curta do diagnóstico, endereçando frustração
real e recorrente (formulário completo é longo demais pra parte do
público, confirmado pelo relato do Fábio em campo).

- `/diagnostico/rapido`: 5 perguntas (nome do negócio, cidade, nicho,
  WhatsApp, maior dificuldade), cada uma com opção de gravar/transcrever
  (mesmo componente `CampoTextoComAudio` já usado no formulário
  completo e na entrevista de RH)
- Envia pro mesmo `/api/diagnostico` real — não é simulação, é o
  mesmo motor, mesmo banco, mesma qualidade de resposta
- WhatsApp mantido como pergunta necessária (não cosmética): sem ele,
  o cruzamento de funil e o parecer de prioridade em
  `/radar/meus-clientes` não conseguem achar esse diagnóstico depois
- Nicho continua texto livre — multinicho preservado, nada específico
  de hospedagem ou qualquer outro segmento
- Resultado mostrado numa versão mais enxuta (resumo, pontos
  favoráveis, oportunidades, comparação com concorrente, plano de 7
  dias, desconto se qualificar) — não duplica toda a UI do formulário
  completo
- Link pro formulário completo, pra quem preferir mais detalhe

Testado: typecheck+lint(0 erros)+build de produção limpos (23 rotas).
Envio mínimo (só os 5 campos) confirmado passando pela validação real
do backend.
