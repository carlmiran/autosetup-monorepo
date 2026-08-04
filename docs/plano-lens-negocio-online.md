# Plano — LENS pra Negócios Online (e-commerce, SaaS)

**Status**: Design técnico registrado, **nada implementado**. Gated
atrás da validação atual (10 primeiros clientes do público físico
local). Fonte: Carlos, 02/08/2026 — identificou corretamente que o
sistema hoje depende do Google Places, que é sobre lugar físico, e não
serve pra analisar negócio 100% online.

## Limitação real identificada

Google Places (Nearby Search e Text Search) modela negócio com
endereço, avaliação geolocalizada, presença em mapa. E-commerce e SaaS
não têm isso — "concorrente" nesse mundo é outra loja/produto que
aparece buscando na web, não algo "perto" de nada.

## Desenho técnico

1. **Bifurcação de tipo de negócio**, logo no início do formulário:
   físico vs. 100% online (e-commerce, SaaS, infoproduto).
2. **Campos condicionais pro caminho online**: sai endereço/cidade como
   localização e avaliações do Google Business; entra nome da
   loja/produto, plataforma usada (Shopify, loja própria, WooCommerce,
   app), ticket médio ou MRR (assinatura recorrente, pra SaaS), B2C ou
   B2B.
3. **Comparação com concorrentes muda de mecanismo, mantém o
   princípio**: em vez de Google Places, usa a mesma pesquisa real na
   web (`web_search`, já implementada) buscando "loja online de
   [categoria] Brasil" ou "SaaS de [categoria] concorrentes" — mesma
   regra de honestidade (só cita concorrente real encontrado, nunca
   inventa).
4. **O resto do motor não muda**: plano de 7 dias, cálculo de impacto
   financeiro real (com ticket médio/MRR informado), motor de
   honestidade — tudo isso já funciona sem alteração.

## Por que gated, apesar de ser mais barato que "ir global"

Não exige processador de pagamento novo, moeda nova, nem base jurídica
nova — mais barato que `docs/plano-lens-global.md`. Mas ainda é abrir
um **tipo de cliente novo** (dono de e-commerce/SaaS é um público
diferente do dono de negócio físico local que está sendo validado
agora). Mesma disciplina do resto do backlog: não constrói escopo novo
antes de bater o critério de sucesso do freeze atual.

## Quando avançar

Depois de bater os 10 primeiros clientes pagantes do público atual —
mesma trava de `docs/cronograma-mestre.md`. Prioridade relativa dentro
do backlog: mais barato e mais alinhado ao público que já construir CRM
(`docs/backlog-inspirado-gohighlevel.md`), mas ainda atrás de qualquer
melhoria que ajude a converter o público físico atual.
