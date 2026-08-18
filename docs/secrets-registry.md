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
