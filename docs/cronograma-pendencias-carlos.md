# Cronograma de Pendências de Carlos — consolidado

**Propósito**: juntar todo item que só Carlos pode fazer (conta, decisão,
documento, cartão), espalhado em vários documentos de planejamento, num
lugar só, em ordem lógica. Claude usa este documento pra acompanhar e
cobrar. Atualizar sempre que um item for resolvido ou um novo aparecer.

---

## Fase 0 — Pode fazer agora, sem depender de nada

- [ ] **Confirmar domínio próprio** (ex: autosetup.com.br) — hoje o site
  roda em `workers.dev`, pesa na credibilidade e é pré-requisito pra
  verificação de negócio da Meta mais adiante.
- [ ] **Confirmar com o suporte do Mercado Pago** se o recurso de
  split/marketplace (comissão de indicadores) exige CNPJ, ou se
  funciona com CPF.
- [ ] **Criar a "Aplicação" tipo marketplace** no painel de
  desenvolvedores do Mercado Pago, gerar `MERCADOPAGO_CLIENT_ID` e
  `MERCADOPAGO_CLIENT_SECRET`, colar no painel da Cloudflare (nunca em
  chat).
- [ ] **Testar o split de comissão em sandbox** do Mercado Pago (conta
  de teste, cartão de teste) e confirmar com Claude que o dinheiro cai
  na conta certa — antes de divulgar `/indicadores/entrar` pra qualquer
  pessoa real.
- [ ] **Google Cloud + Places API**: criar conta (exige cartão, mesmo
  pra cota grátis), ativar "Places API (New)", gerar
  `GOOGLE_PLACES_API_KEY`, colar no painel da Cloudflare — destrava a
  comparação com concorrentes mais precisa e o Radar de Oportunidades.

## Fase 1 — CNPJ (bloqueia as duas frentes grandes abaixo)

- [ ] **Abrir CNPJ (ou MEI como caminho mais rápido)** com o contador —
  hoje tudo opera em CPF. Isso é pré-requisito confirmado pra:
  - Verificação de negócio da Meta (WhatsApp Business API, redes sociais)
  - Possivelmente o split de pagamento do Mercado Pago (ver Fase 0)

## Fase 2 — Depois do CNPJ: caminho da Meta (processo de meses, não tarefa isolada)

- [ ] Verificação de negócio no Meta Business Manager — precisa de CNPJ,
  comprovante de endereço comercial, documento do representante legal,
  site/marca condizente com o CNPJ (por isso o domínio próprio importa).
- [ ] Registrar número de telefone dedicado (não pode ser o número já
  usado no WhatsApp comum) — o chip novo que você já comprou serve pra
  isso.
- [ ] Aprovação do nome de exibição (3-7 dias úteis).
- [ ] Depois da verificação: virar **Meta ISV**, depois aplicar pra
  **Tech Provider** (auditoria real da Meta, não autodeclaração).
- [ ] **Tech Partner** (nível seguinte) só depois de ter 10 clientes e
  2.500 conversas/dia — não é meta de curto prazo, é consequência
  natural de crescimento.

## Já resolvido (histórico, não precisa refazer)

- [x] `OPENAI_API_KEY` configurada
- [x] `NEXT_PUBLIC_WHATSAPP_NUMERO` configurado
- [x] `MERCADOPAGO_ACCESS_TOKEN` configurado e testado (checkout comum
  funcionando, confirmado com pagamento real pendente no banco)
- [x] Webhook de pagamento configurado no painel do Mercado Pago
- [x] Repositório conectado ao Cloudflare, deploy automático funcionando

## Não é pendência de Carlos agora (decisão consciente de esperar)

- Orçamento de teste pra geração de vídeo (Kling) — Carlos decidiu só
  planejar por enquanto, sem gastar.
- Upload de documentos financeiros / painel do cliente — aguardando
  validação do que já está em produção primeiro.
