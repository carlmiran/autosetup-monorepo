# Pacote 1 — Segurança, credenciais e proteção dos dados

Data: 24/10/2026 · Branch `auditoria-2026-10-14` · Sem push, **sem deploy de código**.
Fonte: `docs/plano/autosetup-pacotes-conclusao-claude-code.md` (Prompt Mestre +
Pacote 1). Esse plano veio de outra IA (ChatGPT, como o próprio arquivo diz) e
foi commitado pelo Carlos. Pela regra do CLAUDE.md fica sinalizado aqui. Foi
executado porque o Carlos pediu explicitamente. Pedido extra da mesma sessão:
comparar a configuração do painel Cloudflare com os `wrangler.jsonc` e fazer
um grep por "cakto".

**Classificação final: BLOQUEADA POR DEPENDÊNCIA EXTERNA**. O código está
pronto e testado. Faltam o deploy (decisão do Carlos), os secrets ausentes
no web e decisões de prazo de retenção (ver §8–§10). A revogação das
credenciais expostas foi feita manualmente pelo Carlos (informada em
24/10/2026, não verificável daqui).

---

## 1. Problema investigado

Auditoria de segurança dos 4 Workers, do D1 `autosetup-leads`, do R2, do
CI, dos secrets, da autenticação, do isolamento entre clientes e do histórico
do git, com correção do que fosse possível. Também a comparação entre o painel
Cloudflare e os arquivos wrangler, depois do aviso de "configuração
diferente".

## 2. Estado encontrado

Verificado na conta real (API Cloudflare e wrangler 4.114, só leitura salvo
onde indicado):

| # | Achado | Gravidade |
|---|---|---|
| A | **URLs de preview de versões antigas do web serviam `/api/admin/clientes` sem senha.** 5 versões anteriores ao Basic Auth (de 29/09 a 15/10) respondiam **200 com dados** (2.458 bytes; conteúdo não lido). A produção estava protegida (401), mas `<versão>-autosetup-monorepo.teodoromiranda.workers.dev` contornava a proteção. | Crítica, ativa |
| B | **Secret com valor no lugar do nome** no Worker web: nome de 40 caracteres com formato de credencial, criado pelo painel às 14:14 UTC de hoje. Os primeiros 31 caracteres ficaram na mensagem da versão ("Updated secret: …"), que não pode ser apagada. | Alta |
| C | **IDOR nos indicadores**: `/api/indicadores/{clientes,desempenho,parecer,proxima-mensagem,regiao}` só pediam o `codigo`, que é público (vai nos links). O PIN era conferido **só no navegador**. Quem soubesse o código lia, editava e apagava a carteira de clientes de outro indicador (nome, WhatsApp, notas) e gerava chamadas de LLM pagas. São 184 linhas em `clientes_indicador`. | Alta, **continua em produção até o deploy** |
| D | **OAuth do Mercado Pago sem `state` assinado**: o `state` era o código cru. Qualquer pessoa ligava a **própria** conta MP ao código de outro indicador e recebia a comissão dele. | Alta (hoje sem efeito: faltam `MERCADOPAGO_*` no Worker, ver G) |
| E | `/api/indicadores/registro` servia de oráculo de PIN (4 dígitos), limitado só a 30/h por IP, sem limite por código. | Média |
| F | Workers Logs desligado nos 4 Workers: nenhum log era guardado. | Média |
| G | O web usa 6 secrets que **não existem** no painel: `GOOGLE_PLACES_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`, `NOTIFICATION_EMAIL`, `CONNECTOR_ADMIN_SECRET`. Checkout, webhook, OAuth, `/radar` e `/admin/connector/criar` respondem 503 em produção. Há também `OPENAI_API_KEY2` e `ALERT_EMAIL_TO` no web sem uso no código. | Funcional (Pacote 3) |
| H | `rate_limits.chave` guarda IP (dado pessoal) e as linhas vencidas nunca são apagadas. Não havia política de retenção. | Média (LGPD) |
| I | `.dev.vars` (secrets locais do wrangler) não estava no `.gitignore`. | Baixa |
| — | Já OK: Basic Auth em `/admin/*`, `/api/admin/*` e `POST /api/avisos` em produção (401, conferido); nenhuma credencial no código nem no histórico do git (111 commits, 13 padrões); worker-connector com token por hash, consentimento obrigatório e revogação idempotente; Time Travel do D1 ativo. | — |

### Painel × wrangler (pedido extra)

Comparado campo a campo (bindings, vars, compat date/flags, crons, rotas,
domínios, workers.dev, preview URLs, observability, placement, limits,
tail consumers, queue consumer), usando a mesma lógica do
`getRemoteConfigDiff` do wrangler:

- **Bindings, vars, compatibilidade, crons, rotas e Queue batiam nos 4
  Workers.** Nenhum binding ou var do painel faltava nos arquivos. Não
  existem rotas nem domínios customizados na conta. A Queue
  `connector-sync-queue` tem `batch_size 10`, `max_retries 5` e
  `max_wait_time 5000 ms`, igual ao arquivo mais o padrão.
- `workers_dev` e `preview_urls` só batiam por valor padrão, sem estar escritos.
- O aviso vem do web: é o único com `last_deployed_from = dash`, porque os
  secrets foram alterados pelo painel. O wrangler compara o painel com o arquivo
  e encontra `tags: []`, um campo que só existe no painel e não é chave válida
  do `wrangler.jsonc`. Em CI (Workers Builds) o wrangler só avisa e segue com o
  deploy.
- O que existe só no painel são **secrets**, que por regra não vão para o
  arquivo. Os nomes foram registrados em `docs/secrets-registry.md`.

## 3. Solução implementada

**Ações remotas (autorizadas pelo Carlos nesta sessão):**
1. Preview URLs do Worker `autosetup-monorepo` desligadas (`previews_enabled=false`,
   `workers.dev` de produção mantido). Resolve o achado A.
2. Secret de nome inválido apagado via API. O script achou o nome sozinho, com
   exatamente 1 candidato, sem o nome passar pelo chat. Resolve o achado B na
   Cloudflare; a revogação no provedor foi feita manualmente pelo Carlos
   (informada em 24/10/2026).
3. Export do D1 remoto para o teste de restauração. O arquivo foi apagado no
   fim.

**Código (local, não publicado):**
- `src/lib/indicadorAuth.ts`: PIN conferido **no servidor** em toda rota de
  dados do indicador, pelo header `x-indicador-pin`, com comparação em tempo
  constante. As falhas são contadas em `rate_limits`, que já existe, por IP
  (20/h) e por código (10/h), com upsert atômico. O bloqueio é verificado
  **antes** de comparar o PIN. Em caso de erro no D1 o acesso é negado
  (fail-closed). Código sem PIN responde igual a PIN errado, então não revela
  se o código existe. Resolve C e E.
- `src/lib/oauthState.ts`: `state` assinado com HMAC-SHA256 e validade de
  15 min, usando o `MERCADOPAGO_CLIENT_SECRET`, que já existe (nenhum secret
  novo). `conectar` virou POST com PIN (o GET responde 405) e `callback`
  rejeita `state` inválido antes de chamar o MP. Resolve D. A mensagem de erro
  do callback deixou de repassar o corpo da resposta do MP.
- `src/lib/eventoSeguranca.ts`: uma linha `[seguranca] {json}` por evento
  (`admin_auth_falha`, `admin_auth_nao_configurado`, `indicador_pin_falha`,
  `indicador_bloqueado`, `oauth_state_invalido`). Nunca registra senha, PIN,
  token, IP nem corpo, e corta quebras de linha. Usado no middleware e nas
  rotas.
- Front: `EntradaComPin` devolve o PIN, que fica só na memória da página
  (nunca em localStorage, URL ou cookie). As páginas meus-clientes,
  meu-desempenho e minha-regiao mandam o header. `/indicadores/entrar` agora
  pede código + PIN antes de conectar o MP.
- `regiao` POST confere o PIN **antes** de chamar a geocodificação do Google,
  que tem custo.
- `wrangler.jsonc` dos 4 Workers: `workers_dev: true` e `preview_urls: false`
  explícitos, `observability.enabled: true` (Workers Logs) e nomes dos secrets
  em comentário. Resolve F e o aviso de diferença. Nenhum valor de secret.
- `.gitignore`: `.dev.vars` e `.dev.vars.*`. Resolve I.
- Backup: `scripts/d1-backup-restauracao.mjs` faz o export remoto, restaura num
  D1 local descartável e compara esquema e contagens. O procedimento está em
  `docs/runbook-backup-d1.md`, incluindo a restauração de produção via Time
  Travel.
- `docs/politica-retencao-dados.md`: inventário de dado pessoal por tabela,
  prazos **propostos** e procedimento de exclusão a pedido do titular. Os prazos
  esperam decisão (achado H).
- `docs/secrets-registry.md`: estado real do painel por Worker, incidente B,
  tabela de credenciais expostas e resultado do grep "cakto".

## 4. Arquivos alterados

Novos: `apps/core/web/src/lib/{indicadorAuth,indicadorCliente,oauthState,eventoSeguranca}.ts`,
`apps/core/web/scripts/test-indicador-auth.ts`, `scripts/d1-backup-restauracao.mjs`,
`docs/politica-retencao-dados.md`, `docs/runbook-backup-d1.md`, este arquivo.

Alterados: `apps/core/web/src/app/api/indicadores/{callback,clientes,conectar,desempenho,parecer,proxima-mensagem,regiao,registro}/route.ts`,
`apps/core/web/src/app/indicadores/entrar/page.tsx`,
`apps/core/web/src/app/radar/{meus-clientes,meu-desempenho,minha-regiao}/page.tsx`,
`apps/core/web/src/components/EntradaComPin.tsx`, `apps/core/web/src/middleware.ts`,
`apps/core/{web,worker-connector,worker-licitacoes,worker-prospector}/wrangler.jsonc`,
`docs/secrets-registry.md`, `docs/traceability.md`, `.gitignore`.

## 5. Migrations e configurações

- **Nenhuma migration**: usa `rate_limits` e `indicadores_registro`, que já
  existem.
- Nenhum secret novo.
- No próximo deploy de cada Worker passam a valer `observability` ligado e
  `preview_urls: false`, este último nos 3 Workers que ainda têm preview
  ligado no painel.
- A Cloudflare cobra Workers Logs além da franquia. Até 30/11/2026: Free com
  200 mil eventos/dia e 3 dias de retenção; Paid com 20 milhões/mês e 7 dias.
  A partir de 01/12/2026 entra o preço do Observability (Free com 0,5 GB/dia e
  7 dias). O volume atual é baixo.

## 6. Testes executados (resultados reais)

| Teste | Resultado |
|---|---|
| `apps/core/web/scripts/test-indicador-auth.ts` (novo): handlers reais das rotas contra **D1 local real** (Miniflare/`getPlatformProxy`, pasta temporária vazia, tabelas da baseline). Cobre: sem PIN → 401, PIN de outro indicador → 401, resposta negada sem vazar dado, edição cruzada → 404, bloqueio por código e por IP (inclusive com o PIN certo), expiração do bloqueio, PIN malformado, `state` forjado/expirado/cru, `conectar` GET 405 e POST 401/200, `callback` com `state` cru → 400 sem chamar o MP, ligação MP no código certo | **46/46** |
| `apps/core/web/scripts/test-admin-auth.ts` (existente, middleware alterado) | **46/46** |
| `worker-connector/scripts/test-daily-grid.ts` | **19/19** |
| `pnpm typecheck` (raiz) | 14/14 tarefas |
| `pnpm lint` (raiz) e `eslint src scripts` (web) | 0 erros |
| `pnpm test` (raiz) | passou |
| `next build` (web) | passou, middleware incluído |
| Varredura do histórico git (111 commits, 13 padrões de credencial) | 1 ocorrência, uma senha fictícia de teste (`…-de-teste-123`) |

O build completo do OpenNext não foi rodado: no Windows ele para em `EPERM
symlink`, como registrado em 14/10. **O layout das páginas alteradas não foi
conferido no navegador.**

## 7. Evidências

- Preview URLs, antes: 5 versões antigas com `/api/admin/clientes` → `200 2458B`.
  Depois de desligar: as 8 versões → `404`. Produção: `/` 200, `/admin` 401,
  `/api/admin/clientes` 401, `/api/avisos` 200, iguais antes e depois.
- Secret B: lista de secrets antes com `<suspeito len=40>`, depois sem ele.
  Nova versão `20ba3fdb` ("Secret Change"). Produção conferida em seguida.
- Backup e restauração: export de 88.850 bytes (sha256 `b3a2f643…6d03`),
  restaurado em D1 local vazio. **21 tabelas, 217 linhas, esquema e contagem
  idênticos ao remoto em todas.** Arquivo apagado.

  ```
  tabela                    remoto  restaurado  esquema
  clientes_indicador           184         184  igual
  connector_pairing_codes        2           2  igual
  descontos                      2           2  igual
  indicadores_registro           1           1  igual
  leads                          9           9  igual
  pagamentos                     1           1  igual
  rate_limits                   18          18  igual
  (outras 14 tabelas)            0           0  igual
  ```
- Time Travel: `wrangler d1 time-travel info` devolve um bookmark atual, o que
  confirma que a restauração para um ponto no tempo está disponível.
- Grep "cakto" (sem diferenciar maiúsculas), na árvore de trabalho inteira
  (inclusive `_connector/` com binários, `.github/`, arquivos não rastreados e
  `node_modules`), no histórico de todas as branches, nas mensagens de commit e
  nos secrets do Cloudflare. Resultado: **4 linhas, todas em documentação**
  (`docs/auditoria-2026-10-14.md:130`,
  `docs/plano/autosetup-pacotes-conclusao-claude-code.md:150`,
  `docs/runbook-auditoria-implantacao.md:38` e `:72`). Todas tratam da
  pendência de revogação e nenhuma traz valor. No histórico, só os 3 commits de
  docs que adicionaram essas linhas (`274966a`, `5614982`, `d7e640a`). Zero em
  código, `_connector/`, CI e mensagens de commit. A Cakto não é integrada ao
  código.
  Conferido de novo ao fechar o relatório: mesmo resultado. As únicas menções
  novas são as que este pacote escreveu ao registrar a pendência
  (`docs/status/pacote-01.md`, `docs/secrets-registry.md`,
  `docs/traceability.md`), também sem valor.

## 8. Dependências externas pendentes

1. **Deploy do web** (decisão do Carlos): até lá **o IDOR dos indicadores (C)
   continua em produção**. É o item mais urgente. Depois do deploy:
   - repetir `/api/indicadores/clientes?codigo=X` sem header e esperar 401;
   - entrar em `/radar/meus-clientes` com o PIN e esperar a lista carregada;
   - conferir `/indicadores/entrar`.
2. ~~Revogação no provedor~~ — **feita manualmente pelo Carlos**, informada em
   24/10/2026 (não verificável por código):
   - os tokens do GitHub de 07/2026;
   - o client_id/secret da Cakto;
   - a credencial do secret B, cujo provedor não foi identificado.
3. Cadastrar no Worker web os 6 secrets ausentes (G), pelo painel: Workers &
   Pages → autosetup-monorepo → Settings → Variables and Secrets. Isso
   pertence ao Pacote 3, mas o OAuth assinado (D) só funciona com eles.
4. Confirmar se `OPENAI_API_KEY2` e `ALERT_EMAIL_TO` no web são sobra e
   apagá-los.

## 9. Procedimentos manuais que restam

- Restauração de produção (Time Travel): manual por natureza, sempre com
  confirmação. Ver o runbook.
- Exclusão a pedido do titular: manual até existir tela. Ver a política, §2.
- O teste de restauração é sob demanda (`scripts/d1-backup-restauracao.mjs`).
  A cópia automática para fora do banco depende de decisão (abaixo).

## 10. Decisões necessárias (não inferidas)

- Prazos de retenção: `docs/politica-retencao-dados.md` §3.
- Onde rodar um cron de limpeza (`rate_limits` vencido) e de cópia periódica do
  D1 para fora do banco. Os Workers dormentes não devem ganhar cron sem as
  decisões já pendentes deles.
- Se `/entrega/gerar-post` (público, custa por geração, 30/h por IP) entra no
  Basic Auth. Pendência herdada de 14/10.

## Limites do que foi entregue

- **Controle de acesso por função e por empresa (item 5)**: não existe hoje
  login, papel nem tabela `empresas` (Fase 1 não iniciada). O que foi feito é
  isolamento por indicador (código + PIN no servidor) e admin por Basic Auth.
  Papéis e isolamento por empresa dependem da Fase 1 (Better Auth). O PIN de 4
  dígitos continua sendo paliativo.
- `/api/radar/proximos` ainda aceita `codigo` sem PIN, mas só para marcar
  `place_id` como já visto (sem dado pessoal). O pior caso é alguém esconder
  negócios do radar de outro indicador. Risco baixo, registrado.
- Os códigos de indicador sem PIN registrado ficam com quem entrar primeiro,
  como já era antes. Hoje só 1 código tem PIN.
- Workers Logs só passa a guardar eventos depois do deploy.
