# Plano — Painel do Cliente (WINDOW) + Upload de Documentos + Agregação Social

**Status**: Visão registrada, **nada implementado**. Fonte: Carlos,
30/07/2026 — "plugin baixável" pra inventário de recursos, upload de
demonstrações financeiras/orçamento de mídia/material publicitário,
análise recorrente, e algo "tipo Hootsuite" agregando redes sociais,
dando sensação de controle total do negócio.

Isso mapeia pro componente **WINDOW** (dashboard) do Core, que ainda
não existe implementado.

## Decisão de formato: nada de app baixável

"Plugin baixável" (extensão de navegador, app desktop) foi avaliado e
**descartado como formato** — é uma superfície de engenharia nova,
sem reaproveitar nada do stack atual (Next.js/Cloudflare Workers). Uma
página web comum já resolve upload de arquivo e painel, sem ninguém
precisar instalar nada. Recomendação: manter tudo dentro do site atual.

## Peças, por risco/esforço

### 1. Upload de demonstrações financeiras + análise — viável, sensível

Precisa de armazenamento de arquivo real (hoje só existe texto no D1) —
Cloudflare R2 resolveria, mesma família de serviço já usada (D1),
provavelmente sem conta nova. Dado financeiro de empresa merece cuidado
de consentimento parecido com o que já vale pra dado sensível (RFC-001,
hoje focado em RH, mas o princípio de "avisar antes de processar dado
sensível" se aplica aqui também).

### 2. Upload de material publicitário — viável, mais simples

Mesma infraestrutura de storage do item 1, menor sensibilidade de dado.

### 3. Análise recorrente / painel de controle — viável, é o degrau natural

Depois que os documentos existem no sistema, gerar diagnóstico
recorrente (mensal, por exemplo) é extensão direta do motor de
diagnóstico já construído — reaproveita o padrão de prompt/análise
honesta já em uso no LENS.

### 4. Agregação automática de redes sociais ("tipo Hootsuite") — bloqueado

Exige integração oficial com API do Instagram/Meta (Graph API),
sujeita a processo de aprovação do próprio Meta — já registrado
anteriormente nesta sessão como fora de escopo por depender de
aprovação externa, fora do nosso controle. Continua bloqueado pelo
mesmo motivo.

**Refinamento técnico (30/07/2026)**: as APIs específicas existem de
verdade — Instagram Graph API (Content Publishing: feed, carrossel,
Reels, Stories), Facebook Pages API, Threads API. Mas publicar em nome
de **múltiplos clientes diferentes** (o modelo necessário pro AutoSetup
oferecer isso como serviço) exige status de **Meta Tech Provider**, que
não é um passo técnico simples:

1. CNPJ + Business Manager verificado (mesmo bloqueio já registrado)
2. Virar Meta ISV primeiro (geralmente via um BSP)
3. Só depois aplicar pra Tech Provider, com aprovação direta da Meta
4. Auditoria real de segurança de dados, estabilidade técnica e
   conformidade — não é autodeclaração
5. Evoluir pro nível seguinte (Tech Partner) exige mínimo de 10 clientes
   e 2.500 conversas/dia — escala que o AutoSetup ainda não tem

Isso é um processo de meses, que só faz sentido depois de CNPJ +
verificação de negócio + base real de clientes pagantes existirem —
não uma tarefa técnica isolada.

## Recomendação de ordem, se avançar

1. Itens 1+2 (upload de documento + análise mais profunda) como
   **degrau acima do plano Completo** (R$797/mês) — cria a "sensação de
   controle" pedida sem depender de aprovação de terceiro.
2. Item 3 (painel/análise recorrente) nasce natural depois do item 1,
   reaproveitando o motor de diagnóstico existente.
3. Item 4 (redes sociais automáticas) fica arquivado até haver clareza
   sobre acesso à API do Meta — não é decisão só técnica.

## Pré-requisito real antes de qualquer parte avançar

Mesmo argumento já registrado nos outros planos de longo prazo desta
sessão: validar o que já está em produção (split de comissão em
sandbox, primeira venda real convertida) antes de somar mais uma frente
de engenharia nova.
