# Prospector Autônomo — item 1/6

## O que isso faz
Hoje o `/radar` é *pull*: o indicador entra no app e busca negócios perto dele.
Este módulo transforma isso em *push*: um Cron Trigger do Cloudflare Workers roda
sozinho todo dia, varre as regiões que já têm indicador ativo, pontua as
oportunidades novas, gera a mensagem de abordagem pronta via LLM Gateway, e deixa
tudo esperando na tabela `radar_pendentes` — o indicador só abre o app e vê "3
oportunidades novas hoje, mensagem já pronta, é só enviar".

O agente decide **quem** prospectar e **como** abordar. O humano só aperta
enviar — mantém você fora do bloqueio de automação de WhatsApp/CNPJ.

## Onde isso se encaixa no monorepo
- Worker novo real: `apps/core/worker-prospector` (Cloudflare Worker com seu
  próprio `wrangler.jsonc`, igual em espírito ao `apps/core/web`, não um script
  Node como o `worker-runner`)
- Reaproveita: `radar_visto` (já existe, evita repetir negócio já mostrado),
  Google Places API (já configurada), `@autosetup/adapter-llm` (LLM Gateway
  real do monorepo — ver nota de import abaixo)
- Tabela nova: `radar_pendentes` (schema em `migrations/0001_radar_pendentes.sql`)
- Banco: mesmo D1 `autosetup-leads` já usado por `apps/core/web`

## Nota de import (revisão feita, ver `src/index.ts`)
O rascunho original deste módulo tinha dois imports comentados como
placeholder:

- `llmAdapter` **existe de verdade** em `@autosetup/adapter-llm`
  (`packages/adapters/llm`). Import corrigido para
  `import { llmAdapter, completeViaGateway } from '@autosetup/adapter-llm';`,
  mesmo padrão usado em `apps/core/web/src/app/api/indicadores/parecer/route.ts`.
  A chamada de geração de mensagem trocou de `fetch` direto na OpenAI pra
  `completeViaGateway(prompt)`.
- `calcularOpportunityScore` **não existe no monorepo**. O `/radar` atual
  (`apps/core/web/src/lib/radar.ts`) faz uma análise qualitativa via IA
  (resumo, presença digital, oportunidades, abordagem sugerida) — não existe
  nenhuma fórmula numérica de "Opportunity Score" hoje. `src/index.ts` mantém
  a função `calcularScore()` como placeholder heurístico local, comentado
  como tal. **Isso é uma decisão de produto pendente, não um detalhe
  técnico** — ver seção abaixo.

## Schema D1 novo
Ver `migrations/0001_radar_pendentes.sql` — ainda **não aplicado** ao banco
real. Precisa ser rodado manualmente contra o D1 de produção (mesmo processo
usado pra todas as tabelas anteriores, documentado em `docs/traceability.md`):

```
npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0001_radar_pendentes.sql
```

## wrangler.jsonc — cron trigger
`[triggers].crons` foi deixado **intencionalmente fora** de
`wrangler.jsonc` — depende das decisões de negócio abaixo.

## Código do Worker
`src/index.ts` — Cloudflare Worker completo (`export default { scheduled }`),
pronto pra `wrangler dev` / `wrangler deploy` depois de `pnpm install` na raiz
do monorepo.

## Decisões já tomadas (12/08/2026)
1. **Região do indicador — RESOLVIDO**: `indicador_regiao` agora está na
   migration (`migrations/0001_radar_pendentes.sql`), com suporte aos dois
   modos que Carlos decidiu: geolocalização do navegador (mesmo padrão que
   `/radar` já usa) OU endereço digitado manualmente (cidade/bairro),
   geocodificado no servidor via Google Places Text Search — sem precisar
   habilitar a Geocoding API separada no Google Cloud. Cadastro real em
   `/radar/minha-regiao` (`apps/core/web/src/app/radar/minha-regiao/page.tsx`
   + `apps/core/web/src/app/api/indicadores/regiao/route.ts`), protegido
   pelo mesmo PIN de `/radar/meus-clientes`. Um indicador tem uma única
   região ativa (chave primária); salvar de novo substitui a anterior.
2. **Radar de Licitações — RESOLVIDO**: será oferta separada, com preço
   próprio, fora dos planos existentes do AutoSetup (não afeta este módulo
   diretamente, registrado aqui só pra rastreabilidade da decisão).

## O que ainda falta decidir
1. **Fórmula de Opportunity Score**: não existe hoje (ver nota de import
   acima). Decidir se vale a pena formalizar uma fórmula compartilhada em
   `packages/shared` (reaproveitável também pelo `/radar`) ou manter o
   heurístico local deste worker.
2. **Limite de custo**: cada indicador ativo gera N chamadas de Places +
   1 chamada de LLM por oportunidade nova. Com poucos indicadores hoje, o
   custo é baixo — mas defina um teto por indicador/dia antes de escalar
   (o código já limita a 5 oportunidades novas/dia por indicador,
   `MAX_NOVAS_POR_INDICADOR_DIA`, mas isso é um valor arbitrário do rascunho,
   não uma decisão validada).
3. **Notificação**: o cron só *prepara* os dados. Avisar o indicador que
   tem coisa nova pode ser e-mail (Resend, já configurado no restante do
   projeto) — ou o indicador simplesmente vê ao abrir `/radar/meus-clientes`.
   Recomendo começar sem notificação (mais simples) e adicionar depois se
   fizer diferença.
