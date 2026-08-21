# Interpretador Inteligente de Planilhas — escopo implementado (piloto do Fábio)

Recorte mínimo da especificação de 10 fases recebida de outra sessão/comitê,
suficiente pra validar o piloto do Fábio com segurança. **Não integrado ao
fluxo real do Connector ainda** — `queue-consumer.ts` continua exatamente
como estava, só o parser tabular decide o que sincroniza de verdade hoje.

## O que existe

- `types.ts` (Fase 2) — `Space`, `GuestObservation`, `DailyRevenue`,
  `BillingNote`. De propósito **não** é o modelo canônico completo
  (client/property/payment/etc.) da especificação original.
- `classifier.ts` (Fase 3) — `classifyDocument()`, determinístico, sem
  IA/LLM. Distingue `TABULAR` / `HOSPITALITY_GRID` / `UNKNOWN` por
  pontuação de sinais estruturais (sequência de dias, rótulos
  Qtdd/Valor/Extras/Total, rótulos de espaço, anotação de
  vencimento/pagamento) — nunca por posição fixa de linha/coluna.
- `parser.ts` (Fase 4) — `parseHospitalityGrid()`. Interpreta o grid,
  extrai espaços, observações de hóspede (nome+dia+espaço, **nunca**
  infere checkin/checkout), receita diária por espaço, e notas de
  cobrança como texto bruto. Regra inegociável aplicada em código: nunca
  inventa dado — se Qtdd declarada não bate com a contagem real de
  nomes, registra os dois números e um aviso, não corrige um pelo outro.
- `report.ts` + `scripts/dry-run.ts` / `scripts/dry-run-todas-abas.ts`
  (Fase 7) — roda o classificador + parser contra um arquivo real, local,
  **sem enviar nada pro backend**, e imprime relatório humano-legível
  (confidence, período, espaços, receita, avisos de ambiguidade) — a
  segunda variante roda contra todas as abas de um arquivo, não só a
  primeira.
- `scripts/gerar-planilha-exemplo.ts` — gera uma planilha `.xlsx`
  sintética recriando a estrutura descrita originalmente (grid por
  dia/mês, blocos quinzenais, Qtdd/Valor/EXTRAS/Total, nomes empilhados,
  notas de vencimento/pagamento) — fixture de regressão, não uma cópia de
  nenhum arquivo real.
- `scripts/test-hospitality-grid.ts` — 19 testes cobrindo os cenários
  originais mais as regressões encontradas testando contra arquivos
  reais (ver seção abaixo). Sem framework de teste novo — asserções
  simples, `process.exit(1)` na primeira falha.

## Validado contra arquivos reais (não só o exemplo sintético)

Testado em modo dry-run contra 3 planilhas `.xlsx` reais de terceiros
(dado real e denso, múltiplas abas, sem nenhuma relação com o piloto do
Fábio — usadas só como material de generalização, nomes de arquivo/aba
nunca entraram no código). Isso expôs e corrigiu **5 bugs genéricos
reais** que o exemplo sintético não pegava, todos com teste de regressão:

1. Falso positivo de mês/ano: rótulo de espaço cuja substring batia com
   abreviação de mês (ex.: um nome de espaço contendo as 3 letras de
   "março") virava contexto de mês errado — corrigido com borda de
   palavra (`\b`) de verdade.
2. Mês/ano em célula formatada como data no Excel (vem como número
   serial, não texto, quando lida com `raw:true`) não era reconhecido —
   generalizado reaproveitando `XLSX.SSF.parse_date_code` (mesma função
   já usada no parser tabular).
3. Linha de resumo/total com valores puramente numéricos (ex.: "0"
   repetido por coluna) virava "hóspede" com nome numérico — nenhum
   hóspede se chama um número, filtro genérico adicionado.
4. Linha de metadado de cabeçalho (nome do mês + dias da semana
   abreviados, ou data serial, precedendo a linha numérica 1-31) virava
   rótulo de espaço ou nome de hóspede fantasma — corrigido
   estruturalmente (qualquer linha adjacente a QUALQUER cabeçalho de
   dias é sempre metadado, não conteúdo), sem depender de reconhecer
   nome de mês/dia da semana como texto específico.
5. Bloco Qtdd/Valor/Extras/Total sem rótulo de espaço explícito antes
   (a linha representa uma contraparte/grupo identificado só pelo
   contexto da aba) era descartado inteiro — agora abre um "espaço
   implícito" (nome da aba, confidence mais baixa que rótulo explícito)
   em vez de perder o dado.
6. Classificador: sequência de dias sozinha (sem nenhum rótulo
   Qtdd/Valor/Extras/Total reconhecido) classificava como
   `HOSPITALITY_GRID` mesmo sendo outro domínio (ex.: controle de
   funcionários, rótulos tipo "Nº Func."); e o inverso — rótulo
   "Valor"/"Total" sozinho, sem sequência de dias, também classificava
   errado (é cabeçalho de tabela comum). Agora exige sequência de dias
   **e** (rótulo reconhecido **ou** vários candidatos de rótulo de
   espaço em maiúsculas — cobre template real preenchido só com nomes de
   espaço, sem nenhuma linha de campo ainda digitada).

**Ainda não testado**: o arquivo `.xlsx` real do Fábio especificamente —
os 3 arquivos usados pra generalizar são de outro(s) negócio(s), com
estrutura semelhante mas não idêntica. A planilha sintética em
`scripts/fixtures/exemplo-grid-fabio.xlsx` continua sendo uma
reconstrução, não uma cópia do arquivo dele. Antes de aprovar pro piloto
de verdade, rode:

```bash
npx tsx scripts/dry-run.ts caminho/para/arquivo-real-do-fabio.xlsx
```

## O que NÃO foi implementado (próximo passo, não bloqueia o piloto)

Documentado aqui pra não se perder, não pra travar nada:

- Sincronização real com a nuvem pro formato novo (`queue-consumer.ts`
  não foi tocado — o grid interpretado não vira linha em nenhuma tabela
  D1 ainda; hoje é só relatório de dry-run).
- Motor de validação formal com taxonomia de warnings (hoje é só
  string livre em `avisos`/`avisosGerais`).
- Idempotência/dedup avançada além do hash de arquivo que já existe no
  agente Go (upsert por chave natural, como as tabelas tabulares já
  fazem, não foi desenhado pro formato grid).
- Observabilidade/logging estruturado completo.
- Outros parsers da especificação original (`FinancialGridParser`,
  `AgendaParser`, etc.).
- Uso de LLM pra resolver ambiguidade — tudo aqui é determinístico de
  propósito.
- Modelo canônico completo (client/property/payment/etc.) — só o
  suficiente pra interpretar e relatar existe hoje.

## Como rodar

```bash
cd apps/core/worker-connector
npx tsx scripts/gerar-planilha-exemplo.ts   # gera o fixture sintético (só precisa rodar 1x, ou de novo se mudar)
npx tsx scripts/dry-run.ts scripts/fixtures/exemplo-grid-fabio.xlsx       # 1 aba
npx tsx scripts/dry-run-todas-abas.ts caminho/para/arquivo-com-varias-abas.xlsx
npx tsx scripts/test-hospitality-grid.ts
```
