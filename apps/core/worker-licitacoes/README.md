# Radar de Licitações Públicas — item 2/6

## Fonte de dados (confirmada, sem custo, sem CNPJ)
**PNCP — Portal Nacional de Contratações Públicas** (`pncp.gov.br`), API oficial
do governo federal:
- Cobre licitações **federais, estaduais e municipais** num único lugar (é o
  portal unificado da Lei 14.133/21 — melhor cobertura que o ComprasNet, que
  é só federal e mais antigo)
- **Sem autenticação** pra consulta — não precisa de token, chave, nem cadastro
- Resposta em JSON, paginada
- Endpoint principal usado aqui:
  `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`
  (aceita filtro por `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`,
  UF, município via código IBGE, CNPJ do órgão)

Existe também `compras.dados.gov.br` (API mais antiga, só federal) como
fallback caso o PNCP mude algo — mantido isolado num único ponto
(`buscarContratacoesPublicadasHoje` em `src/index.ts`) pra trocar fácil se
precisar.

## Como isso vira produto
Diferente do Prospector (que busca clientes pra você), este é o produto em si:
um agente que varre o PNCP diariamente, cruza com um perfil de interesse que
o cliente define uma vez (ex.: "construção civil, SP e região, até R$500mil"),
e avisa por e-mail quando aparece edital compatível — com um resumo em
linguagem simples gerado pela IA, não o texto burocrático cru do edital.

Modelo de cobrança sugerido: assinatura mensal separada do AutoSetup (esse
público — construção, serviços, fornecedores — é mais amplo que o público
físico atual do AutoSetup, mas o mecanismo de entrega é o mesmo: cron + D1 +
IA + e-mail).

## Onde isso se encaixa no monorepo
- Worker novo real: `apps/core/worker-licitacoes` (Cloudflare Worker com seu
  próprio `wrangler.jsonc`)
- Banco: mesmo D1 `autosetup-leads` já usado por `apps/core/web`
- Tabelas novas: `licitacao_perfil`, `licitacao_encontrada` (schema em
  `migrations/0001_licitacoes.sql`)

## Nota de import (revisão feita, ver `src/index.ts`)
O rascunho original chamava a OpenAI direto via `fetch`. Corrigido para usar
`@autosetup/adapter-llm` (mesmo LLM Gateway usado no resto do monorepo):
`import { llmAdapter, completeViaGateway } from '@autosetup/adapter-llm';`.
O envio de e-mail continua via `fetch` direto pra API da Resend — não existe
um pacote compartilhado pra isso no monorepo (só um helper dentro de
`apps/core/web`, que as regras de boundaries do ESLint não permitem importar
de outro app "core"), então o padrão aqui espelha
`apps/core/web/src/lib/resend.ts`.

## Schema D1 novo
Ver `migrations/0001_licitacoes.sql` — ainda **não aplicado** ao banco real.
Precisa ser rodado manualmente contra o D1 de produção (mesmo processo usado
pra todas as tabelas anteriores, documentado em `docs/traceability.md`):

```
npx wrangler d1 execute autosetup-leads --remote --file=./migrations/0001_licitacoes.sql
```

## wrangler.jsonc — cron trigger
`[triggers].crons` foi deixado **intencionalmente fora** de
`wrangler.jsonc` — depende das decisões de negócio abaixo.

## Código
`src/index.ts` — Cloudflare Worker completo (`export default { scheduled }`).

## Decisões já tomadas (12/08/2026)
1. **Preço — RESOLVIDO**: oferta separada, com preço próprio, fora dos
   planos existentes do AutoSetup (não entra em Essencial/Completo/Raio-X).
   Valor específico ainda não definido, só o modelo (assinatura separada).

## O que ainda falta decidir
1. **Cadastro de perfil — ADIADO, não implementar agora.** Decisão explícita
   de Carlos (12/08/2026): sem cadastro real por enquanto (nem
   `/licitacoes/cadastro` nem nenhuma outra rota). A tabela `licitacao_perfil`
   segue existindo só no schema — sem uma forma real de um cliente inserir
   uma linha nela, o worker nunca vai encontrar `ativo = 1` e nunca vai
   processar nada. Isso é esperado: o módulo está pronto pra ligar quando o
   cadastro for priorizado, não antes.
2. **Volume de e-mail** — o PNCP pode retornar centenas de resultados/dia em
   modalidades amplas; o filtro por palavra-chave é feito no lado do worker
   (a API não busca por texto livre), então o primeiro teste real vai mostrar
   se o filtro está preciso o suficiente ou se precisa de um segundo passe de
   IA pra separar relevante de ruído antes de mandar e-mail. Só relevante
   depois que o cadastro de perfil (item acima) existir.
