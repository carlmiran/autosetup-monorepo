# Runbook — Auditoria + Implantação AutoSetup (ordem cronológica)

Use **PowerShell ou Git Bash** (o `cmd` antigo quebra alguns comandos). Siga um bloco por vez e não pule o "Verificar" de cada etapa.

**Regra de ouro:** só **uma** sessão do Claude Code mexendo no repo por vez. Já aconteceu uma sessão paralela commitar sem coordenação. Sempre `git pull` antes de abrir.

---

## ETAPA 0 — Preparar o terreno (5 min)

```bash
cd caminho/para/autosetup-monorepo
git status                 # precisa estar limpo; se não, commit ou stash antes
git pull origin main
pnpm install
pnpm turbo lint typecheck test     # linha de base: anote o que já falha ANTES de mexer
git checkout -b auditoria-2026-10-14
```

Crie a pasta de prompts e salve dentro dela os arquivos já entregues:

```bash
mkdir -p docs/prompts docs/adr
# copie para docs/prompts/: autosetup-fase1-claude-code.md, autosetup-banco-argumentos.md,
#   autosetup-fase2a-sites-premium.md, autosetup-fase2b-sage-valentina.md,
#   prompt-claude-code-personas-autonomia.md
# copie para docs/adr/: ADR-CORE-006-personas-e-escada-de-autonomia.md
```

---

## ETAPA 1 — Segurança: revogar e rotacionar (ANTES de qualquer código)

### 1.1 Revogar o que vazou no chat (faça no navegador)
| O quê | Onde | Ação |
|---|---|---|
| Tokens do GitHub (4 colados no chat, pelo menos 3 ativos) | github.com → Settings → Developer settings → Personal access tokens (classic **e** fine-grained) | **Revogar todos.** Se precisar de um novo, use fine-grained, só no repo `autosetup-monorepo`, com validade de 30 a 90 dias. Nunca cole no chat. |
| Cakto client_id / client_secret (apareceram em print) | Painel Cakto → API/Integrações | Revogar e gerar novos. Guardar só no gerenciador de senhas. |

### 1.2 Varredura de segredos no histórico do Git
```bash
git log --all -p -S"ghp_" --oneline
git log --all -p -S"github_pat_" --oneline
git log --all -p -S"sk-" --oneline
git log --all -p -S"APP_USR-" --oneline
```
Se algum comando mostrar commits, o segredo está no histórico e **precisa ser revogado** (apagar do código não basta). Avise antes de reescrever o histórico, porque isso tem passo próprio.

### 1.3 Conferir os secrets no Cloudflare
```bash
npx wrangler login
npx wrangler secret list --name autosetup-monorepo
```
Esperado em produção: `OPENAI_API_KEY`. Pendentes da sua lista, a configurar quando tiver cada um:
```bash
npx wrangler secret put MERCADOPAGO_ACCESS_TOKEN --name autosetup-monorepo
npx wrangler secret put RESEND_API_KEY --name autosetup-monorepo
npx wrangler secret put NOTIFICATION_EMAIL --name autosetup-monorepo
npx wrangler secret put GOOGLE_PLACES_API_KEY --name autosetup-monorepo
npx wrangler secret put ADMIN_PASSWORD --name autosetup-monorepo   # Etapa 0.1: sem ele, /admin/* responde 503
```
(Esses comandos são para o Carlos rodar no terminal dele. O valor é digitado no prompt do wrangler, nunca no chat nem pelo Claude Code.)
(Se o nome do Worker for outro, ele aparece no painel Cloudflare → Workers & Pages.)

### 1.4 Ajustes de painel (navegador)
- **Mercado Pago:** webhook apontando para `https://autosetup-monorepo.teodoromiranda.workers.dev/api/pagamento/webhook`.
- **Google Cloud (Places):** restringir a chave à Places API e definir uma cota diária, para que um vazamento não vire conta.
- **OpenAI:** conferir o limite de gasto mensal no painel de billing.

### Verificar
- [ ] Nenhum token antigo do GitHub ativo
- [ ] Cakto com credenciais novas
- [ ] Varredura sem resultados (ou plano de rotação definido)
- [ ] `wrangler secret list` conferido

---

## ETAPA 2 — Auditoria do repositório pelo Claude Code

```bash
claude
```
Cole este prompt:

> Modo auditoria, **sem alterar código**. Leia o repositório inteiro e `docs/prompts/` e me entregue uma tabela com o status real (FEITO / PARCIAL / NÃO INICIADO, com o arquivo/rota como evidência) de:
> 1. Fase 1 — Better Auth no D1, tabela `empresas`, onboarding, `/app`, feed "o que o AutoSetup fez por você", `/admin/empresas`, 3 temas (Ink/Navy/Claro)
> 2. Banco de argumentos por nicho + tabela `argumentos_uso`
> 3. Fase 2A — sites premium (direções Referência Local e Clareza Técnica; Editorial Noturno foi descartada)
> 4. Fase 2B — SAGE com fila semanal + Valentina conversacional + camada de economia de IA
> 5. `fila_execucao` e `/admin/painel`
> 6. Onde estão os leads da prospecção do Site-Prova (D1? planilha? `clientes_indicador`?)
> 7. Executor de Anúncio de Produto / qualquer kit de afiliado
> 8. Saúde: rate limiting (limite atual), rotas sem `llmAdapter.connect()`, webhooks MP/Resend, TODOs e testes falhando
> 9. Qualquer segredo hardcoded no código atual
> 10. Migrations D1: lista aplicada vs. pendente (local e `--remote`)
>
> No fim, proponha a ordem de execução das etapas 3 a 7 deste runbook ajustada ao que encontrou.

**Salve a resposta** em `docs/auditoria-2026-10-14.md` e me traga aqui. Eu reviso antes da Etapa 3.

---

## ETAPAS 3 a 7 — Implantação (pule a que a auditoria marcar como FEITO)

Para cada etapa, no Claude Code:
> Leia `docs/prompts/<arquivo>.md` e `docs/auditoria-2026-10-14.md`. Execute só o que falta. Comece pela Regra 0 do prompt, se houver.

E depois de cada uma:
```bash
pnpm -r lint && pnpm -r typecheck && pnpm -r test   # turbo crasha no Windows (0xC0000409)

# Migrations D1: NÃO use "wrangler d1 migrations apply" — nenhum wrangler.jsonc
# define migrations_dir e o remoto não tem a tabela d1_migrations; o comando
# tentaria reaplicar tudo (os ALTER TABLE já aplicados falhariam).
# Cada arquivo novo é aplicado à mão, de dentro da pasta do app/worker dono dele:
npx wrangler d1 execute autosetup-leads --local  --file=./migrations/NNNN_nome.sql
# teste local; se ok, o Claude Code MOSTRA o comando abaixo e só roda com
# confirmação explícita do Carlos:
npx wrangler d1 execute autosetup-leads --remote --file=./migrations/NNNN_nome.sql
# depois, registrar em docs/traceability.md
```
O Claude Code faz os commits e para com o diff e um resumo — **nunca faz push**. O push é sempre do Carlos:
```bash
git push origin auditoria-2026-10-14
```
Abra o PR, espere o CI verde e faça o merge na `main`. O deploy no Cloudflare acontece pela integração com o Git. Teste em produção antes da próxima etapa.

(Banco confirmado na auditoria: `autosetup-leads`, id `6020ad64-35e8-4e90-a0b1-46020eb4b53b`, compartilhado por todos os Workers. O D1 `--local` é separado por pasta, porque cada app/worker tem seu próprio `.wrangler/`.)

| Etapa | Prompt | Por que nesta ordem |
|---|---|---|
| **3** | `autosetup-fase1-claude-code.md` | Fundação: login, empresas e painel. Tudo depois depende disso. |
| **4** | `autosetup-banco-argumentos.md` | Alimenta as abordagens do Site-Prova e os posts da Valentina. |
| **5** | `autosetup-fase2a-sites-premium.md` | Site-Prova é a frente em modo entrega. *O visual premium em si sai do Claude Design; o Claude Code integra.* |
| **6** | `prompt-claude-code-personas-autonomia.md` (ADR-CORE-006) | Registro de personas, escada de autonomia, `/admin/aprovar`, rotina das 5h30. |
| **7** | `autosetup-fase2b-sage-valentina.md` | **Instrução extra ao colar:** "reconcilie com o ADR-CORE-006 já implementado: a Valentina é perfil em `persona_perfis`, e as tarefas do SAGE usam a `fila_execucao` estendida e a escada de autonomia". |

---

## ETAPA 8 — Pendências que ainda não têm prompt (eu escrevo depois da auditoria)
1. Ferramenta pública de afiliado: link → kit em texto, conta tipo "afiliado", onboarding com a Mel.
2. Gatilhos do PULSE para clientes (avaliação ruim no Google, sazonalidade).
3. Dados estruturados ("ser recomendado por IA") nos sites.
4. Servidor MCP da AutoSetup no Workers.
5. Chave da YouTube Data API v3 para o YT Studio (só no Google Cloud, sem código no Worker).

---

## Ao final do dia
- [ ] `docs/auditoria-2026-10-14.md` commitado
- [ ] Cada etapa concluída testada em produção
- [ ] Nenhum segredo colado em chat, commit ou print
