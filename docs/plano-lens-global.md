# Plano — LENS Global (multi-país, multi-moeda, multi-idioma)

**Status**: Visão registrada, **nada implementado além do texto
multilíngue** (ver `docs/traceability.md`, 02/08/2026 — isso já está
ativo). Gated atrás da validação atual (10 primeiros clientes no
Brasil). Fonte: Carlos, 02/08/2026.

## O que já existe (barato, já ativo)

O motor de diagnóstico responde no idioma que a pessoa usar pra
escrever as respostas — capacidade nativa do modelo de IA, sem custo
extra, sem mudança de infraestrutura. Isso já ajuda até dentro do
Brasil (imigrante, estrangeiro, turista abrindo negócio aqui).

## O que "ir global de verdade" exige (caro, não iniciado)

- **Pagamento**: Mercado Pago é essencialmente Brasil/América Latina.
  Fora daqui, precisaria de outro processador (Stripe é o candidato
  óbvio) — integração nova do zero, replicando todo o trabalho de
  checkout/split/webhook já feito pro Mercado Pago.
- **Moeda**: preços em R$ não fazem sentido fora do Brasil — precisaria
  de conversão/precificação por região, decisão de negócio caso a caso.
- **Jurídico**: RFC-001 (sensibilidade de dados) foi fundamentado em
  LGPD. GDPR (Europa) e outras legislações têm requisitos próprios —
  não é ajuste de código, é orientação jurídica local por região.
- **Contexto de pesquisa de concorrentes**: Google Places funciona
  globalmente, mas a lógica de "o que conta como concorrente local" e
  as expectativas de mercado mudam por país/cultura de negócio.

## Por que gated

Isso equivale, em escopo, à frente B2B já registrada em
`docs/plano-frente-b2b.md` — não é extensão de feature, é abrir um
negócio em paralelo, com processador de pagamento, moeda e jurídico
próprios. Fazer isso agora dividiria foco exatamente no momento em que
o projeto mais precisa de foco (validar o modelo com o público atual).

## Se e quando isso avançar

Só depois do critério de sucesso do feature freeze atual (10 primeiros
clientes pagantes no Brasil, ver `docs/cronograma-mestre.md`). Ordem
sugerida: escolher 1 país/mercado por vez (não "todos de uma vez"),
resolver pagamento+moeda+jurídico desse mercado específico, só depois
generalizar.
