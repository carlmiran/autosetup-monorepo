# Plano — Frente B2B / Automação Conversacional Empresarial

**Status**: Visão registrada, **nada implementado**, explicitamente
**não é próxima prioridade**. Fonte: Carlos, 31/07/2026 — a partir de
uma vaga de emprego real (plataforma "Grace", perfil de analista de
automação conversacional B2B).

## A ideia

Hoje o AutoSetup atende **pequeno negócio local** (barbearia, estética,
oficina) — dono que preenche um diagnóstico, paga um plano, recebe
conteúdo/acompanhamento. A vaga que Carlos trouxe descreve um perfil
completamente diferente: alguém que constrói fluxo conversacional,
integra com ERP/CRM, dispara campanha de WhatsApp, dentro de uma
**empresa que vende automação pra outras empresas** (B2B, ciclo de
venda longo, comprador é outra empresa, não pessoa física dona de
negócio local).

Carlos perguntou se o AutoSetup poderia "um dia" atender esse mesmo
tipo de profissional/mercado, e depois confirmou: quer abrir essa
frente **sem abandonar** o público atual.

## Por que isso é uma frente nova de verdade, não uma extensão

Diferente das outras visões documentadas nesta sessão (vídeo, painel do
cliente, marketplace multi-fornecedor), que são **features** pro mesmo
público, isso é **um segundo mercado inteiro**: comprador diferente
(empresa, não pessoa física local), ciclo de venda diferente (mais
longo, com homologação formal), exigência técnica diferente (integração
enterprise com ERP/CRM em vez de diagnóstico self-service).

## Decisão de dev master: gated atrás da validação atual

Isso não entra em construção até o critério de sucesso do feature
freeze atual ser atingido: **10 primeiros clientes pagantes do público
atual**, com aprendizado documentado (ver `docs/cronograma-mestre.md`).
Motivo: abrir uma frente B2B agora — antes de sequer ter a primeira
venda aprovada no público mais simples — dividiria atenção exatamente
no momento em que o projeto mais precisa de foco.

## Se e quando isso avançar

- Não seria "adaptar" o AutoSetup atual — seria uma oferta/produto
  separado, reaproveitando peças técnicas já construídas (motor de
  diagnóstico, Gateway de IA, padrão de integração) mas com fluxo
  comercial e público-alvo próprios.
- O perfil da vaga (fluxo conversacional, integração ERP/CRM,
  homologação, campanhas de WhatsApp) é, na prática, uma boa descrição
  do que o **futuro time interno do AutoSetup** vai precisar saber
  fazer quando SAGE e o atendimento de WhatsApp automatizado existirem
  de verdade — vale mais como referência de perfil de contratação
  futura do que como mercado a perseguir agora.
