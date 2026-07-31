# Plano — Comissão de Indicadores via Split de Pagamento

**Status**: Código construído, **não validado com dinheiro real**.
Precisa de teste em sandbox antes de qualquer indicador real usar.

## O que foi construído (30/07/2026)

Fonte: Carlos pediu uma forma de indicadores ganharem comissão por
trazer clientes ao AutoSetup, sem o AutoSetup se tornar intermediário
financeiro (não segurar/repassar dinheiro de terceiro manualmente,
evitar virar "fintech").

- `indicadores` (D1): codigo, mp_user_id (conta Mercado Pago conectada), conectado_em
- `/indicadores/entrar`: pessoa escolhe um código, é redirecionada pro
  Mercado Pago pra autorizar a própria conta (OAuth)
- `/api/indicadores/conectar` + `/api/indicadores/callback`: fluxo real
  de OAuth do Mercado Pago — troca o `code` por `user_id`, salva a
  ligação
- `/api/pagamento/criar-checkout`: se o `?ref=` da compra corresponde a
  um indicador com conta conectada, calcula 20% de comissão e inclui
  `marketplace_fee` na criação da Preferência

## Válido pra todos os nichos

O rastreamento por `?ref=` não depende de nicho — funciona igual pra
qualquer prospect que o indicador trouxer, abordando presencialmente
(usando o Radar de Oportunidades) ou mandando o link do diagnóstico por
WhatsApp/digital.

## ⚠️ Incerteza técnica real — não usar com dinheiro real ainda

A mecânica exata do `marketplace_fee` do Mercado Pago pra rotear
comissão a um **terceiro dinâmico** (indicador diferente a cada venda,
não uma conta fixa do dono da aplicação) tem nuance que não consegui
confirmar com 100% de certeza só pela documentação — existe a
possibilidade real de que:

1. `marketplace_fee` vá pra conta fixa dona do `client_id` (Carlos),
   não pro indicador dinâmico — nesse caso o modelo certo seria
   inverso: criar a Preferência com o token do INDICADOR, e Carlos
   receber via `marketplace_fee`.
2. Ou que funcione exatamente como implementado.

**Antes de qualquer indicador real usar isso**: Carlos precisa testar
no ambiente de sandbox do Mercado Pago (contas de teste, cartão de
teste) e confirmar que o dinheiro realmente cai na conta certa. Não é
seguro presumir que está certo só porque o código roda sem erro — erro
de rota de dinheiro não aparece como erro de API, aparece como
"o pagamento funcionou, mas foi pra conta errada".

## Pendências

1. Confirmar com o Mercado Pago (suporte ou teste) se o recurso de
   split/marketplace exige CNPJ — Carlos ainda está em CPF.
2. Criar a "Aplicação" no painel de desenvolvedores do Mercado Pago
   (tipo marketplace), gerar `MERCADOPAGO_CLIENT_ID` e
   `MERCADOPAGO_CLIENT_SECRET`, colar no painel da Cloudflare — nunca
   em chat.
3. Testar o fluxo completo em sandbox antes de divulgar `/indicadores/entrar`
   pra qualquer pessoa real.
4. Split ainda não aplicado nas assinaturas mensais (Essencial/Completo)
   — só no pagamento único (Raio-X) por enquanto. Extender pra
   assinaturas é trabalho futuro, depois de validar o caminho simples.
5. Percentual de comissão (hoje 20%, fixo no código) é decisão de
   negócio de Carlos — fácil de ajustar depois de validado.

## Mapeamento técnico (31/07/2026) — respondendo checklist trazido por Carlos

País: Brasil. Tipo de checkout: **Checkout Pro** (`/checkout/preferences`
pro pagamento único, Preapproval API pras assinaturas).

| Ponto | Resposta |
|---|---|
| Modelo do repasse | Comissão de indicado/afiliado — sempre 1 fornecedor (Carlos) + no máximo 1 indicador por venda, nunca múltiplos recebedores |
| Quem são os recebedores | Cada indicador conecta a própria conta MP via OAuth (já implementado). Armazenamos só `mp_user_id` — nunca CPF/CNPJ do indicador |
| Regra do split | Percentual fixo (20%, hardcoded em `PERCENTUAL_COMISSAO`), calculado sobre o valor cheio do plano — sem desconto/frete no modelo |
| Conciliação | `external_reference` (`plano:email:timestamp`) + tabela `pagamentos` própria relacionando venda → indicador |

**Duas lacunas reais que esse mapeamento expôs, ainda não resolvidas
no código**:

6. **Responsabilidade pela tarifa do Mercado Pago** — quem absorve a
   taxa deles (Carlos, indicador, ou dividido)? Decisão de negócio
   ainda não tomada, código não trata isso hoje.
7. **Estorno/chargeback não reverte o split** — se uma venda com
   comissão for cancelada, o dinheiro já dividido não volta
   automaticamente. Buraco real, precisa de solução antes de produção
   com volume.
