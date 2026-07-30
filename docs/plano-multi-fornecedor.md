# Plano de Longo Prazo — AutoSetup Multi-Fornecedor / Multi-Nicho

**Status**: Visão registrada, **nada implementado**. Horizonte de
produto (equivalente a H4/H5 no vocabulário do projeto) — não é
roadmap ativo. Fonte: Carlos, 30/07/2026.

## A ideia

Qualquer pessoa comum, usando o AutoSetup, poder indicar produtos e
serviços de terceiros no meio de uma conversa cotidiana — não só
diagnóstico/conteúdo do próprio AutoSetup — e ganhar comissão. Dois
tipos de indicação, com riscos completamente diferentes:

1. **Produtos financeiros**: seguro (carro, vida), empréstimo,
   financiamento.
2. **Serviços e produtos locais em geral**: eletricista, tratamento
   estético, hospedagem, manutenção, financiamento de carro (esse
   último também cai no grupo 1), qualquer nicho.

Um vendedor com carteira de clientes, ou mesmo alguém indicando pra
conhecidos, identifica uma necessidade (de empresa ou de pessoa física)
e faz a indicação através do AutoSetup, ganhando comissão via o mesmo
mecanismo de split que já foi desenhado pro programa de indicadores do
próprio AutoSetup.

## Por que os dois grupos NÃO podem ser tratados como a mesma decisão

### Grupo 1 — Produtos financeiros: bloqueado até regulação resolvida

Intermediar seguro no Brasil exige ser (ou operar sob) uma **corretora
de seguros registrada na SUSEP**. Intermediar empréstimo/financiamento
como atividade formal geralmente exige registro como **correspondente
bancário no Banco Central**. Isso é regulação com fiscalização real —
categoricamente diferente do cuidado "não virar fintech" que resolvemos
pro split de pagamento entre indicadores do próprio AutoSetup.

**Decisão registrada**: este grupo não deve ser construído sem antes
ter (a) orientação de advogado especializado em regulação financeira,
ou (b) parceria formal com uma corretora/correspondente já licenciado
que absorva essa responsabilidade. Não é "ir com cautela" — é "essa
peça exige alguém com licença antes de existir tecnicamente".

### Grupo 2 — Serviços/produtos locais em geral: viável, mas grande

Afiliação de serviço local (eletricista, estética, hospedagem,
manutenção) é prática de mercado comum, sem exigência de licença
especial. Tecnicamente possível de construir em cima da mesma
infraestrutura de indicação/split já existente.

Mas é uma expansão de escopo real: cada fornecedor tem sua própria
API/programa de afiliados, com regra própria de comissão e repasse —
não existe um jeito único de "conectar todos os fornecedores do Brasil"
de uma vez.

## Pré-requisito antes de qualquer parte disso avançar

O sistema de comissão do próprio AutoSetup (indicador → cliente do
AutoSetup) ainda **não foi validado com dinheiro real** — ver
`docs/plano-comissao-indicadores.md`. Expandir pra fornecedores
externos antes disso repete o padrão de "construir escopo novo antes de
validar o que já existe", já corrigido várias vezes nesta sessão.

## Ordem sugerida, se e quando isso avançar

1. Validar o split de comissão do próprio AutoSetup em sandbox
   (pendência já registrada).
2. Se avançar pro Grupo 2, começar com **um único fornecedor** de baixo
   risco e afinidade natural com o que o AutoSetup já discute (ex:
   hospedagem de site) — provar o modelo de ponta a ponta antes de
   multiplicar por "qualquer nicho, qualquer fornecedor".
3. Grupo 1 (financeiro) só entra em pauta depois de resolução jurídica
   específica — não é uma "fase 3" natural do roadmap técnico, é uma
   decisão de negócio separada que precisa vir de fora do código.

## Refinamento real (30/07/2026) — cenário de venda que simplifica o Grupo 2

Carlos descreveu o cenário real de abordagem comercial que já acontece
em conversas de vendedor com comerciante: o dono do estabelecimento
menciona precisar de um produto/serviço que o fornecedor atual não
atende mais. Pra não parecer "multi-produto"/oportunista, o vendedor
**não tenta virar fornecedor daquilo** — ele indica o AutoSetup como se
indicasse uma pessoa/consultor de confiança. O AutoSetup (equipe de
Carlos) então busca/negocia o fornecimento manualmente, e o vendedor
original recebe comissão pela indicação.

**Isso muda a arquitetura necessária pro Grupo 2 de forma importante**:
não precisa de integração com API de fornecedor nenhum pra começar — o
AutoSetup vira o **ponto único de contato pra qualquer necessidade não
atendida**, e o cumprimento (sourcing/negociação) é manual, feito pela
equipe, do mesmo jeito que já funciona o serviço pago de conteúdo hoje
(humano + IA, não automação). Isso reaproveita 100% da infraestrutura
de indicação já construída (`?ref=`, split de comissão) — só precisa de
um jeito genérico de capturar "fulano indicou um prospect que precisa
de X", sem catálogo de produto nem integração nova.

Isso reduz drasticamente o esforço/risco de uma primeira versão do
Grupo 2 — não depende mais de "provar o modelo com um fornecedor
específico" antes de generalizar; pode nascer já genérico, porque quem
resolve a necessidade específica é gente, não código.
