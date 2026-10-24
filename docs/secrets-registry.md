# AUTOSETUP — Registro de Segredos (Vault de Estrutura)

Este documento lista **nomes e propósitos** de credenciais do projeto —
**nunca valores**. Nenhum valor real deve aparecer neste arquivo, em
nenhum commit, ou em nenhuma conversa com IA (chat ou ferramenta),
independente de quão "seguro" o destino pareça — o momento em que um
segredo passa por texto de chat ou por uma chamada de ferramenta de IA já
é o momento em que ele deve ser considerado exposto.

**Regra de ouro**: quem digita o valor real é sempre uma pessoa, direto no
painel do provedor. Nenhuma IA (Claude, ChatGPT, Gemini, DeepSeek) deve
ser o canal de trânsito de um valor de segredo.

## Secrets de runtime da aplicação (produção)

Vivem em **Cloudflare Pages → Settings → Variables and Secrets** (ou
Vercel, se for o destino escolhido). Nunca em `.env` commitado.

| Nome | Propósito | Fonte arquitetural |
|---|---|---|
| `DATABASE_URL` | Conexão com o Postgres de produção | SPR-CORE-001 |
| `OPENAI_API_KEY` | LLM Gateway — provider OpenAI | IMP-LLM-001 |
| `GOOGLE_PLACES_API_KEY` | Google Places API (New) — `/radar`, `/diagnostico` (comparação de concorrentes) e `worker-prospector` | decisão de 30/07/2026 |
| `RESEND_API_KEY` | Envio de e-mail transacional (Resend) — notificação de pagamento, `worker-licitacoes` e `worker-connector` (alerta de erro de parsing) | decisão de 02/08/2026 |
| `NOTIFICATION_FROM_EMAIL` | Remetente dos e-mails do `worker-licitacoes` (não é secret, mas vive junto) | worker-licitacoes |
| `ALERT_EMAIL_TO` | E-mail que recebe alerta de erro de parsing do `worker-connector` (não é secret, mas cadastrado como secret no Worker pra evitar valor real commitado em `wrangler.jsonc`) | AutoSetup Connector V1 (17/08/2026) |
| `MERCADOPAGO_ACCESS_TOKEN` | Checkout Pro / assinaturas (`lib/mercadoPago.ts`) e consulta de status no webhook (`api/pagamento/webhook`) — `apps/core/web` | Checkout real via Mercado Pago (30/07/2026) |
| `MERCADOPAGO_CLIENT_ID` | OAuth do Mercado Pago pra conectar a conta do indicador (`api/indicadores/conectar` e `callback`) — `apps/core/web` | indicadores/Mercado Pago |
| `MERCADOPAGO_CLIENT_SECRET` | Par do `MERCADOPAGO_CLIENT_ID` na troca do código OAuth (`api/indicadores/callback`) — `apps/core/web` | indicadores/Mercado Pago |
| `NOTIFICATION_EMAIL` | E-mail que recebe o aviso de pagamento aprovado (`lib/resend.ts`) — `apps/core/web` (não é secret por natureza, mas vive junto) | Notificação de pagamento (02/08/2026) |
| `ADMIN_PASSWORD` | Senha do Basic Auth de `/admin/*`, `/api/admin/*` e `POST /api/avisos` (`src/middleware.ts`) — `apps/core/web`. Sem ela, essas rotas respondem 503 (fail-closed). Paliativo até o login da Fase 1 | Etapa 0.1 da auditoria (14/10/2026) |
| `CONNECTOR_ADMIN_SECRET` | Senha compartilhada que protege `/admin/connector` e `/api/admin/connector/criar` (self-service de código de pareamento) no `apps/core/web` — desde 14/10/2026 é a segunda camada, depois do Basic Auth do `ADMIN_PASSWORD` — não é autenticação de verdade (sem login/sessão no projeto), é proporcional ao padrão já usado no resto do produto | Self-service de pareamento do Connector (19/09/2026) |
| `ANTHROPIC_API_KEY` | LLM Gateway — provider Anthropic | IMP-LLM-001 |
| `GEMINI_API_KEY` | LLM Gateway — provider Gemini | IMP-LLM-001 |
| `GROQ_API_KEY` | LLM Gateway — provider Groq | IMP-LLM-001 |
| `DEEPSEEK_API_KEY` | LLM Gateway — provider DeepSeek | IMP-LLM-001 |
| `CEREBRAS_API_KEY` | LLM Gateway — provider Cerebras | IMP-LLM-001 |
| `AUTOSETUP_LLM_PRIORITY` | Ordem de fallback do Gateway (não é secret, mas vive junto) | IMP-LLM-001 |
| `AUTH_SECRET` | Assinatura de sessão de autenticação | decisão IMP em aberto |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Se Supabase for usado para Auth/Storage | decisão IMP em aberto |
| `STORAGE_*` | Storage S3-compatível | decisão IMP em aberto |

## Credenciais de ferramenta (dev/CI — NÃO são secret de app)

Categoria diferente por natureza — nunca junto dos secrets de runtime
acima. Vivem em GitHub Actions Secrets (se um workflow precisar) ou no
gerenciador de credenciais local da sua máquina.

| Nome | Propósito | Onde vive |
|---|---|---|
| GitHub Fine-grained PAT | `git push` manual/autorização pontual | Nunca persistido — gerar, usar, revogar |
| Cloudflare API Token (conector) | Verificação de infraestrutura via IA | Gerenciado pelo próprio conector OAuth, não é um valor que trafega em texto |

## Local (desenvolvimento)

`.env` ou `.env.local`, na raiz do monorepo, nunca commitado —
`.gitignore` já cobre `.env`, `.env.local`. Cada dev configura o próprio,
copiando de `.env.example` (que só tem nomes, nunca valores).

## Processo — o que aconteceu neste projeto até aqui (histórico, não recomendação)

Entre 26 e 27/07/2026, quatro tokens do GitHub foram colados em texto
puro em conversas com Claude para autorizar pushes emergenciais. Isso
está registrado aqui como o exemplo do que **não** repetir — não porque
tenha causado dano confirmado, mas porque o risco existiu e pelo menos
três desses tokens não foram revogados até o momento deste registro.

## Estado real no painel da Cloudflare — conferido em 24/10/2026 (Pacote 1)

Só nomes, lidos da API (`versions view` / `secrets`). Valores nunca são
retornados pela API e não passaram por aqui.

| Worker | Secrets cadastrados | Usados pelo código e **ausentes** |
|---|---|---|
| `autosetup-monorepo` (web) | `ADMIN_PASSWORD`, `ALERT_EMAIL_TO`, `OPENAI_API_KEY`, `OPENAI_API_KEY2`, `RESEND_API_KEY` | `GOOGLE_PLACES_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`, `NOTIFICATION_EMAIL`, `CONNECTOR_ADMIN_SECRET` |
| `autosetup-worker-connector` | `ALERT_EMAIL_TO`, `RESEND_API_KEY` | — (`LENS_REFRESH_URL` é opcional) |
| `autosetup-worker-licitacoes` | nenhum | `OPENAI_API_KEY`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` (dormente de propósito) |
| `autosetup-worker-prospector` | nenhum | `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY` (dormente de propósito) |

- `OPENAI_API_KEY2` não é lido por nenhum código — confirmar se é sobra e apagar.
- `ALERT_EMAIL_TO` no web também não é lido pelo código do web.
- Sem `MERCADOPAGO_*` no web, checkout, webhook e OAuth de indicador respondem
  503 em produção; sem `GOOGLE_PLACES_API_KEY`, o `/radar` e a comparação de
  concorrentes do diagnóstico não funcionam. Pendência do Pacote 3.

### Incidente — secret com valor no lugar do nome (24/10/2026)

Às 14:14 (UTC) de 24/10/2026 uma versão do `autosetup-monorepo` foi criada
pelo painel com um secret cujo **nome** era uma string de 40 caracteres com
formato de credencial (provável valor colado no campo "nome"). O nome de um
secret não é protegido: aparece no painel, na API e na mensagem da versão
("Updated secret: …", truncada em 31 caracteres) — que **continua no
histórico de versões** e não pode ser apagada.

- Apagado do Worker em 24/10/2026 16:32 UTC (autorizado por Carlos), via API,
  sem o nome passar pelo chat. Produção conferida depois (200/401 iguais).
- **Ação do Carlos:** identificar de qual provedor é essa credencial e
  **revogá-la/rotacioná-la lá**. Não está registrado aqui de qual provedor é
  porque não foi possível confirmar. Em 24/10/2026 o Carlos informou que a
  revogou manualmente.

### Credenciais expostas em conversa — situação em 24/10/2026

Não verificável por código; dependem de confirmação do Carlos no painel de
cada provedor. Em 24/10/2026 o Carlos informou que revogou todas manualmente
nos provedores. A informação é dele; não há como confirmar por código.

| Credencial | Onde vazou | Revogada? |
|---|---|---|
| Tokens do GitHub (4, 26–27/07/2026) | texto de conversa com IA | **revogada manualmente pelo Carlos** (informado em 24/10/2026; não verificável daqui) |
| Cakto client_id / client_secret | print em conversa | **revogada manualmente pelo Carlos** (informado em 24/10/2026; não verificável daqui) |
| Secret de nome inválido (acima) | nome de secret no Cloudflare | **revogada manualmente pelo Carlos** (informado em 24/10/2026; não verificável daqui) |

Busca por "cakto" (sem diferenciar maiúsculas) em 24/10/2026: só 4 linhas de
documentação (pendência de revogação, sem valor); zero em código, `_connector/`
(inclusive binários), CI, mensagens de commit e secrets do Cloudflare. A
Cakto não é integrada ao código.
