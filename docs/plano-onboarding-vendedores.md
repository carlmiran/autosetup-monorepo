# Plano — Contratação e Onboarding Formal de Vendedores/Indicadores

**Status**: Visão registrada, **nada implementado**. Gated atrás de (a)
validar o sistema informal de indicação já construído, e (b) revisão
jurídica real do contrato — não é decisão que o código pode tomar
sozinho. Fonte: proposta do Gemini trazida por Carlos, 02/08/2026.

## A proposta

Formalizar a relação com vendedores/indicadores como prestação de
serviço PJ-PJ (contrato de representação comercial) ou autônomo (RPA),
com pipeline automatizado: formulário de dados → geração de contrato →
assinatura digital (ZapSign/Clicksign) → liberação de acesso.

## Por que não avança agora

1. **O sistema mais simples ainda não foi validado.** O programa de
   indicação informal (`?ref=`, split de comissão via Mercado Pago) tem
   **0 indicadores conectados** até hoje, e o próprio split **não foi
   testado com dinheiro real em sandbox** (pendência já registrada em
   `docs/plano-comissao-indicadores.md`). Automatizar um pipeline de
   contratação formal antes de validar o modelo mais simples repete o
   padrão de "automatizar antes de validar" já corrigido várias vezes
   nesta sessão.
2. **Coleta de dado sensível real** (CNH, RG, dado bancário) exige o
   mesmo rigor já aplicado no RFC-001 (sensibilidade de dados) — que
   hoje cobre a vertical RH, não esse caso. Precisaria de extensão
   explícita, não presumida.
3. **Geração/assinatura de contrato não deve ser automatizada sem
   revisão jurídica real da minuta primeiro** — nisso concordo
   integralmente com a recomendação do próprio Gemini. Isso não é
   decisão técnica, precisa vir de advogado/contador antes de qualquer
   automação.

## Decisão em aberto, não respondida por Claude

Modelo de remuneração dos vendedores (comissão pura, bônus por meta,
etc.) — decisão de negócio exclusiva de Carlos, não é algo que a IA
decide ou sugere no lugar dele.

## Se e quando avançar

1. Validar o split de comissão informal em sandbox primeiro.
2. Ter a minuta de contrato revisada por advogado/contador.
3. Só então considerar automatizar coleta de dados + assinatura —
   começando pela peça mais simples (formulário + armazenamento seguro
   dos documentos), não pelo pipeline completo de uma vez.
