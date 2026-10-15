# Auditoria AutoSetup — 14/10/2026

Branch `auditoria-2026-10-14`. Modo somente leitura: nenhum código alterado. Fontes: os 213 arquivos rastreados (código, docs e `docs/prompts/`), ESLint do `apps/core/web` com saída JSON, D1 local de cada worker e D1 remoto `autosetup-leads` (só `SELECT`/`PRAGMA`, autorizado pelo Carlos, `rows_written: 0`), busca de segredos no código e no histórico do git.


### Achado que vem antes de tudo: 4 dos 5 prompts do runbook não existem
O runbook (Etapa 0) manda copiar para `docs/prompts/`: `autosetup-fase1-claude-code.md`,
`autosetup-banco-argumentos.md`, `autosetup-fase2a-sites-premium.md` e
`autosetup-fase2b-sage-valentina.md`. **Nenhum deles está no repo** (nem em
`C:\Users\User\Downloads`). Só existe `prompt-claude-code-personas-autonomia.md`.
Então Fase 1, banco de argumentos, 2A e 2B não têm especificação dentro do repo.
O status abaixo vale pelo nome do item, porque não há critério de aceite para comparar.

### Tabela de status

| # | Item | Status | Evidência |
|---|---|---|---|
| 1a | Better Auth no D1 | NÃO INICIADO | Não aparece em código nem nos `package.json`. No D1 remoto não existe tabela `user`/`session`/`account`. `docs/secrets-registry.md:34` lista `AUTH_SECRET` como "decisão IMP em aberto". |
| 1b | Tabela `empresas` | NÃO INICIADO | Não existe no D1 remoto (lista de 23 tabelas abaixo) nem em nenhum SQL. |
| 1c | Onboarding (cliente) | NÃO INICIADO | Só existe o onboarding do agente Go (`_connector/agent-go/onboarding.go`), que é pareamento + consentimento, não onboarding de empresa. |
| 1d | `/app` | NÃO INICIADO | Não existe `apps/core/web/src/app/app/`. |
| 1e | Feed "o que o AutoSetup fez por você" | NÃO INICIADO | Não há tabela de eventos. O ADR-006 §2.4 diz que o feed sai de `eventos_agente`, que também não existe. |
| 1f | `/admin/empresas` | NÃO INICIADO | Existem só `/admin/{avisos,clientes,comissoes,connector}`. |
| 1g | 3 temas (Ink/Navy/Claro) | PARCIAL | Só o **Ink** existe, como tema único fixo (`apps/core/web/src/app/globals.css`, tokens `--ink/--panel/--amber`). Não há Navy, Claro, `data-theme` nem seletor de tema. |
| 2 | Banco de argumentos por nicho + `argumentos_uso` | NÃO INICIADO | Nenhuma tabela, arquivo ou seed. Coisas parecidas que já existem: `/api/perguntas-nicho`, que gera 2 perguntas por nicho via LLM sem guardar nada, e `lib/gerarProximaMensagem.ts`, que gera argumento de venda por cliente sem banco nem fonte. |
| 3 | Fase 2A — sites premium (Referência Local / Clareza Técnica) | NÃO INICIADO | Os nomes aparecem só no runbook. Não há template, rota, app ou asset de site de cliente. |
| 4a | Fase 2B — SAGE com fila semanal | NÃO INICIADO | "SAGE" hoje é só memória por WhatsApp no diagnóstico (`api/diagnostico/route.ts` → `buscarHistorico()`, registrado em traceability 29/07). Não há fila nem cron. |
| 4b | Valentina conversacional | NÃO INICIADO | Aparece só no ADR-006 e no prompt de personas. Não há `persona_perfis`. |
| 4c | Camada de economia de IA | NÃO INICIADO | O Gateway (`packages/adapters/llm/src/index.ts`) não devolve tokens nem custo, não tem cache nem orçamento. O que existe é só rate limit por IP. |
| 5a | `fila_execucao` | NÃO INICIADO | Não existe no D1 remoto nem em SQL. |
| 5b | `/admin/painel` | NÃO INICIADO | Não existe a rota. |
| 6 | Leads da prospecção do Site-Prova | NÃO ENCONTRADO NO REPO | "Site-Prova" não aparece em nenhum código, tabela ou fixture. As fontes de lead que existem no D1 são: `leads` (diagnósticos), `clientes_indicador` (lista manual por indicador, com importação de CSV em `/radar/meus-clientes`), `radar_visto` e `radar_pendentes` (esta é escrita pelo prospector, que está dormente, e nenhuma rota a lê). Se os leads do Site-Prova estão no D1, o lugar mais provável é `clientes_indicador`, importados por CSV. Caso contrário estão numa planilha fora do sistema. **Pergunta para o Carlos.** O prompt de personas manda deixar essa fonte desativada, com aviso, se ela não existir. |
| 7a | Executor de Anúncio de Produto | NÃO INICIADO | Há só o prompt (`docs/prompts/PROMPT_Claude-Code_Executor-Anuncio-Produto.md`). Não existem `anuncio_produtos`, `programas_afiliado`, `/api/anuncio/*` nem `/admin/fila-diaria`. O prompt pressupõe coisas que **não existem**: `ContentGenerationWorker`, Vitest, executor FFmpeg e contrato do "CRF". Dá para reaproveitar `/entrega/gerar-post` (gpt-image-1) e `/api/transcrever` (Whisper). |
| 7b | Kit de afiliado (Mel) | NÃO INICIADO | Não existem `mel_produtos_fila` nem `persona_perfis`. |
| 8a | `worker-prospector` | PARCIAL (deployado e dormente) | Ver seção 8. |
| 8b | `worker-licitacoes` | PARCIAL (deployado e dormente) | Ver seção 8. |

### 8. `worker-prospector` e `worker-licitacoes`
- **Prospector** (`apps/core/worker-prospector/src/index.ts`): roda só por `scheduled()`. Lê `indicador_regiao` e busca negócios no Places. Filtra o que já está em `radar_visto`, calcula um score heurístico provisório (`calcularScore`), gera a mensagem pelo Gateway (com `connect()`) e grava em `radar_pendentes`. Estado atual:
  - Deployado em `autosetup-worker-prospector.teodoromiranda.workers.dev`, sem cron e sem secrets.
  - As tabelas existem no D1 local e no remoto.
  - **Nenhuma tela lê `radar_pendentes`**, então a saída do worker não chega a ninguém.
  - **Bug latente:** usa a Places API *legada* (`maps.googleapis.com/maps/api/place/nearbysearch/json`), enquanto o `web` usa a Places API (New). Uma chave liberada só para a "New" provavelmente vai falhar. Precisa corrigir antes de ligar o cron.
  - Faltam decisões: fórmula do score e teto de custo.
- **Licitações** (`apps/core/worker-licitacoes/src/index.ts`): consulta o PNCP (modalidades 6 e 8, até 5 páginas cada), filtra por palavra-chave, UF e valor de cada `licitacao_perfil` ativo, resume pelo Gateway (com `connect()`), grava em `licitacao_encontrada` e manda e-mail pelo Resend. Estado atual:
  - Deployado e dormente.
  - O cadastro de perfil foi **adiado por decisão do Carlos**, então `licitacao_perfil` fica vazia e o worker nunca processa nada.
  - O HTML do e-mail interpola o texto do LLM sem escapar. É risco baixo, mas convém escapar.
- Os dois READMEs estão **desatualizados**: dizem que a migration "ainda não foi aplicada", mas ela foi aplicada em 12–14/08 e confirmei hoje no remoto.

### 9. Saúde

**Rate limiting** (`apps/core/web/src/lib/rateLimit.ts`):
- Como funciona: tabela `rate_limits` no D1, chave `rota:IP` (`CF-Connecting-IP`), janela fixa. Se falhar, libera a requisição (fail-open).
- Não é atômico: faz SELECT e depois UPDATE, então rajadas paralelas passam do limite. Usuários atrás de CGNAT dividem a mesma cota.

Limites atuais:

| Rota | Limite |
|---|---|
| diagnostico | 25/h |
| perguntas-nicho | 10/h |
| transcrever | 20/h |
| rh/entrevista | 5/h |
| radar/proximos | 15/h |
| radar/analisar | 15/h |
| entrega/gerar-post | 30/h |
| indicadores/parecer | 20/h |
| indicadores/proxima-mensagem | 30/h |
| indicadores/clientes | 300/h |
| indicadores/registro (PIN) | 30/h |
| indicadores/regiao | 15/h |
| pagamento/criar-checkout | 10/h |
| admin/connector/criar | 20 a cada 10 min |

Rotas **sem** rate limit: `interesse`, `avisos`, `admin/clientes`, `admin/comissoes`, `indicadores/desempenho`, `indicadores/conectar`, `indicadores/callback`, `pagamento/webhook` e `downloads/[arquivo]`.

**`llmAdapter.connect()`:**
- Toda rota que chama `completeViaGateway` chama `connect()` antes: `diagnostico`, `perguntas-nicho`, `rh/entrevista`, `indicadores/parecer`, `indicadores/proxima-mensagem` e os dois workers. **Nenhuma rota está sem `connect()`.**
- **Risco (plausível, não reproduzido):** `activeEnv` é uma variável global do módulo (`packages/adapters/llm/src/index.ts:184`). No Workers, requisições simultâneas compartilham o isolate. Se o `disconnect()` de uma requisição rodar enquanto outra está no meio da chamada, a segunda falha com "Gateway não conectado". Isso combina com a classe de bug "chamar sem `connect()`" que o prompt já menciona.
- **Chamadas diretas à OpenAI fora do Gateway** (vão contra a regra do CLAUDE.md, mas têm motivo técnico: o Gateway só faz chat de texto):
  - `lib/diagnostico.ts:348` (Responses + web_search)
  - `lib/radar.ts:57` (Responses + web_search)
  - `lib/gerarImagemPost.ts:26` (gpt-image-1)
  - `api/transcrever/route.ts:40` (Whisper)

  A camada de economia de IA da 2B precisa cobrir essas 4 chamadas.

**Webhook do Mercado Pago** (`api/pagamento/webhook/route.ts`):
- Responde 200 sempre e não confia no payload: consulta o status na API do MP.
- Não valida `x-signature`. Isso é mitigado pela reconsulta.
- O UPDATE é feito por `plano + email + status='pendente'`, não por id. Duas compras pendentes do mesmo plano com o mesmo e-mail são marcadas juntas.
- Depende de `MERCADOPAGO_ACCESS_TOKEN` e do webhook configurado no painel do MP (pendência do Carlos no runbook 1.4).

**Resend:**
- `lib/resend.ts` usa `onboarding@resend.dev` e não envia nada sem `RESEND_API_KEY` + `NOTIFICATION_EMAIL`.
- Não é webhook de entrada: não existe rota que receba eventos do Resend.
- O `worker-connector` usa o mesmo esquema (`ALERT_EMAIL_FROM` em vars).

**🔴 APIs admin abertas em produção (achado mais grave):**
- `GET /api/admin/clientes` devolve, **sem nenhuma autenticação**, até 200 leads (nome, WhatsApp, negócio, cidade) e 200 pagamentos (nome, e-mail). Isso é exposição de dados pessoais (LGPD).
- `POST /api/admin/comissoes` deixa qualquer pessoa marcar comissão como paga.
- `POST /api/avisos` deixa qualquer pessoa publicar no mural que os indicadores leem, o que abre caminho para phishing.
- A única rota protegida é `/admin/connector`, com `CONNECTOR_ADMIN_SECRET`.
- Atenção: o prompt de personas manda proteger `/admin/*` "pelo mesmo mecanismo de `/admin/comissoes`". **Esse mecanismo não existe.**

**Outros:**
- `indicadores/callback` usa o `codigo` do indicador direto como `state` do OAuth, sem nonce. Com isso alguém consegue ligar a própria conta MP ao código de outro indicador.
- **TODO/FIXME:** nenhum no código.
- **Testes:** `pnpm test` só roda `packages/adapters/llm/src/gateway.test.ts` (com tsx, sem Vitest). `scripts/test-daily-grid.ts` roda fora do `pnpm test`. Não há teste para `apps/core/web`. Não reproduzi o crash do turbo (0xC0000409).

**Lint do `apps/core/web` (causa confirmada):**
- O `eslint.config.mjs` só ignora `.next/`, `out/`, `build/` e `next-env.d.ts`, então o `eslint .` (script `"lint": "eslint"`) entra em `.open-next/`, que é saída gerada pelo build do OpenNext.
- **27 erros, todos em `.open-next/`** (38 arquivos):

  | Regra | Erros |
  |---|---|
  | `no-this-alias` | 23 |
  | `ban-ts-comment` | 2 |
  | `no-require-imports` | 2 |

- 2.951 avisos em `.open-next/` (principalmente `no-unused-expressions` e `no-unused-vars`) e 2 avisos sem `ruleId` em `cloudflare-env.d.ts`.
- **Código real (`src/`, 59 arquivos): 0 erros e 0 avisos.**
- O CI não é afetado, porque lá não existe `.open-next/`.
- Correção (não relaxa nenhuma regra): incluir `.open-next/**` no `globalIgnores`.

### 10. Segredos hardcoded
- **Código atual: nenhum.** Procurei padrões de chave OpenAI, PAT do GitHub, Mercado Pago, Resend e Google, `BEGIN` de chave privada e `password`/`secret` com valor literal.
- **Histórico do git:** `-S` em `ghp_`, `github_pat_`, `sk-` e `APP_USR-` retornou só o commit `274966a`, e os resultados são os próprios comandos de busca escritos no runbook. A busca por `re_` retornou só `score_threshold`/`rate_limit_exceeded`. Nenhum valor real.
- Isso não elimina a pendência do runbook 1.1: os tokens do GitHub e da Cakto vazaram **no chat**, não no repo, e precisam ser revogados de qualquer forma.
- **`docs/secrets-registry.md` está incompleto.** Faltam `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET` e `NOTIFICATION_EMAIL`, que o código usa.

### 11. Migrations D1

**Remoto (`autosetup-leads`), conferido hoje.** Existem 23 tabelas:
`avisos`, `clientes_indicador`, `connector_pairing_codes`, `connector_sync_errors`, `connectors`, `descontos`, `hospedes`, `indicador_regiao`, `indicadores`, `indicadores_registro`, `leads`, `licitacao_encontrada`, `licitacao_perfil`, `pagamentos`, `quartos`, `radar_pendentes`, `radar_visto`, `rate_limits`, `reservas`, `rh_entrevistas`, `tarifas` (mais `_cf_KV` e `sqlite_sequence`).

| Migration versionada | Local | Remoto |
|---|---|---|
| worker-connector `0001_connector.sql` | aplicada | aplicada |
| worker-connector `0002_consentimento.sql` (`connectors.consentimento_em`) | aplicada | aplicada (PRAGMA ok) |
| worker-connector `0003_pareamento_indicador.sql` (`codigo_indicacao`) | aplicada | aplicada (PRAGMA ok) |
| worker-prospector `0001_radar_pendentes.sql` | aplicada | aplicada |
| worker-licitacoes `0001_licitacoes.sql` | aplicada | aplicada |

- **Pendentes: nenhuma.** Tudo o que está versionado foi aplicado nos dois lados.
- **Lacuna:** as 10 tabelas do `apps/core/web` (`leads`, `pagamentos`, `rate_limits`, `descontos`, `rh_entrevistas`, `radar_visto`, `avisos`, `indicadores`, `indicadores_registro`, `clientes_indicador`) **não têm SQL versionado**. Foram criadas por `wrangler d1 execute` ad hoc, conforme registra o traceability. Não existe `apps/core/web/migrations/`.
- O D1 local é **separado por worker** (cada um tem seu `.wrangler/`). Nenhum deles tem as tabelas do web.
- **O runbook está incompatível com o repo.** Ele manda rodar `wrangler d1 migrations apply`, mas nenhum `wrangler.jsonc` define `migrations_dir` e o remoto não tem a tabela `d1_migrations`. Rodar esse comando tentaria reaplicar tudo, e os `ALTER TABLE` de 0002 e 0003 falhariam com coluna duplicada. Pelo CLAUDE.md, o caminho continua sendo `d1 execute --file` manual, primeiro local e depois remoto com confirmação.
- O runbook também manda `git push` dentro do Claude Code. Pelo CLAUDE.md, o push é sempre seu.

### Ordem proposta (ajustada ao que encontrei)

0. **Etapa 0 — Higiene e segurança.** São IMPs pequenos e vêm antes da Fase 1, porque o item 1 é exposição ativa em produção.
   1. Proteger `GET /api/admin/clientes`, `POST /api/admin/comissoes`, `POST /api/avisos` e as páginas `/admin/*`. Paliativo: reaproveitar o padrão de `CONNECTOR_ADMIN_SECRET`, com comparação em tempo constante, até a Fase 1 entregar login de verdade.
   2. Adicionar `.open-next/**` ao `globalIgnores` do ESLint do web.
   3. Completar `docs/secrets-registry.md` (4 nomes) e atualizar os READMEs dos dois workers.
   4. Corrigir o runbook: trocar `migrations apply` por `d1 execute --file`, e o push fica com o Carlos.
   5. Criar o SQL de **baseline** das 10 tabelas do web, extraído do remoto via `PRAGMA`, com `CREATE TABLE IF NOT EXISTS`, aplicado só no local. Assim a Fase 1 parte de um esquema conhecido.
   6. **Você me passa os 4 prompts que faltam.**
1. **Fase 1** (Better Auth + `empresas` + onboarding + `/app` + `/admin/empresas` + temas Navy e Claro sobre o Ink que já existe). O auth substitui o paliativo da Etapa 0. Recomendação: já criar a tabela append-only de eventos **com o nome `eventos_agente` do ADR-006** e fazer o feed ler dela, para não nascerem duas tabelas de evento. A AutoSetup entra como empresa nº 1, como pede o ADR-006.
2. **Gateway LLM.** Tirar o `activeEnv` global, passando o env por chamada ou criando um cliente por requisição, e devolver `usage` (tokens e custo estimado). É pré-requisito de `custo_estimado_centavos` e orçamento no ADR-006 e da economia de IA da 2B. Encaixa logo depois da Fase 1.
3. **Banco de argumentos + `argumentos_uso`.**
4. **Fase 2A — sites premium.** Antes, decidir onde ficam os leads do Site-Prova (tabela própria ou `clientes_indicador`). É decisão de produto e vai para o README do módulo. A 2A não depende do ADR-006, então dá para inverter 4 e 5 se a entrega de sites for mais urgente.
5. **ADR-CORE-006** (personas, escada de autonomia, `/admin/aprovar`, rotina das 5h30). Estende `fila_execucao` e `eventos_agente`, usa `empresa_id`, os argumentos e o custo do Gateway. Ajustes no prompt:
   - Proteger `/admin/*` com o auth da Fase 1, não com o "mecanismo de `/admin/comissoes`", que não existe.
   - Testes com `tsx`, seguindo o padrão do repo, ou adotar Vitest como decisão explícita.
   - Playwright não está instalado. Instalar exige confirmação.
6. **Fase 2B** — SAGE com fila semanal, Valentina e economia de IA, reconciliada com o ADR-006 como o runbook já prevê. A economia cobre também as 4 chamadas diretas à OpenAI.

**Fora dessa sequência:**
- Executor de Anúncio: depois da 2B. Reaproveita `gerar-post` e `transcrever`.
- Ligar prospector e licitações: antes, corrigir a Places API legada e criar uma tela que leia `radar_pendentes`.
- Corrigir o `state` do OAuth dos indicadores.

