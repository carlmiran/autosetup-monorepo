# CRONOGRAMA MESTRE — AutoSetup v1.0 (corrigido)

**Nota de processo**: a estrutura em trilhos (A-Receita, B-Produto,
C-Ecossistema, D-Jurídico, E-Carlos) veio de uma proposta do Meta AI/
ChatGPT que Carlos trouxe. A organização por valor é boa e foi mantida.
Mas vários status estavam **incorretos** — o ChatGPT não tem acesso ao
código real nem ao banco de dados de produção, então presumiu estado
que não bate com a realidade. Este documento corrige isso com dado
verificado (consulta direta ao banco em 31/07/2026), substitui e passa
a ser a referência única — `docs/cronograma-pendencias-carlos.md` fica
como histórico, não mais atualizado separadamente.

---

## TRILHO A — Receita (Prioridade Máxima)

**Objetivo**: primeiro cliente pagante no menor prazo possível.

### A1 — Infraestrutura Comercial

- ✅ GitHub
- ✅ OpenAI API
- ✅ Cloudflare (Workers + D1) — **correção**: estava marcado como
  pendente na proposta original; está no ar desde 27/07, com deploy
  automático a cada push
- ❌ Supabase — **correção**: não é usado neste projeto. O banco real é
  Cloudflare D1 (SQLite serverless), já em produção. "Supabase" veio de
  uma visão antiga (Kernel/Business DNA, arquivada como Horizonte H4) e
  nunca foi adotado — remover do cronograma ativo.
- 🟡 Mercado Pago — checkout comum **funcionando e testado** (pagamento
  real chegou como "pendente" no banco); split de comissão pra
  indicadores construído mas **não validado** (ver Fase 0 do cronograma
  de pendências)
- ⬜ Domínio próprio
- ⬜ E-mail profissional

**Entrega**: plataforma acessível publicamente. **Status: feito.**

### A2 — Revenue Engine

- ✅ LENS (diagnóstico com pesquisa real, comparação de concorrentes,
  memória entre visitas, plano de 7 dias, PDF)
- ✅ Diagnóstico
- ✅ PDF
- 🟡 WhatsApp — **correção**: só o link manual "fale conosco" está
  ativo (`NEXT_PUBLIC_WHATSAPP_NUMERO`). Atendimento automatizado por
  IA **não existe** — bloqueado até verificação de negócio da Meta
  (Trilho D5), que por sua vez depende de CNPJ
- 🟡 Prospecção (Radar de Oportunidades) — código real construído
  (geolocalização + Google Places + análise de IA), mas depende de
  `GOOGLE_PLACES_API_KEY` ainda não confirmada como configurada
- ✅ Landing pública — **correção**: existe e está no ar (`/`)
- ✅ Página de vendas — **correção**: existe e está no ar (`/planos`)
- ✅ Checkout — **correção**: existe, testado com pagamento real
  (Mercado Pago, Checkout Pro)
- 🟡 Assinatura — API de Preapproval implementada (Essencial/Completo),
  não testada com pagamento real ainda (só o pagamento único foi
  confirmado)

**Entrega**: primeiro pagamento. **Status: infraestrutura pronta, ainda
sem conversão real confirmada (nenhum pagamento com status "aprovado"
ainda — ver painel abaixo).**

### A3 — Comercial

- ✅ Oferta oficial (Raio-X, Essencial, Completo)
- ✅ Preços definidos
- ✅ Planos definidos
- ⬜ Garantia — não definida
- ⬜ Onboarding pós-venda — não definido (o que acontece depois que
  alguém paga ainda não tem um fluxo formal)

### A4 — Escala

- ⬜ CRM — hoje é só a tabela `leads`/`pagamentos` no D1, sem interface
  de gestão
- ⬜ Pipeline
- ⬜ Funil formal
- ⬜ Follow-up automatizado
- ⬜ Remarketing

---

## TRILHO B — Produto

**Objetivo**: construir o melhor Sistema Operacional Cognitivo.

**Correção importante de expectativa**: nada abaixo além de LENS está
implementado como sistema rodando. São nomes de componentes da
arquitetura (ACR-001/ADR-CORE-004), não código.

### B1 — Fundação

- 🟡 HUB — existe só como conceito arquitetural (Organization/Partner),
  sem implementação
- ✅ LENS — o único componente do Core realmente implementado e em
  produção
- ⬜ WORKERS
- ⬜ PATHS
- ⬜ WINDOW
- ⬜ PULSE
- ⬜ ATLAS — **correção parcial**: existe uma peça mínima real de
  memória (busca de diagnóstico anterior por WhatsApp), não o
  componente completo
- ⬜ SAGE — não existe como agente; hoje cada funcionalidade é uma
  função isolada sem memória contínua nem decisão autônoma

### B2 — Cognitive OS

- ⬜ Business DNA, Executive Layer, Decision Engine, Learning Engine,
  Digital Twin — tudo Horizonte H4/H5 (visão de longo prazo arquivada
  em ADR-CORE-004), nada implementado

### B3 — Dashboard Vivo

- ⬜ Missões, Objetivos, Projetos, Hábitos, Alertas — nada implementado

---

## TRILHO C — Ecossistema

**Objetivo**: vantagem competitiva difícil de copiar.

### C1 — Marketplace

- ⬜ Parceiros, Representadas, Produtos, Serviços — visão documentada
  em `docs/plano-multi-fornecedor.md`, nada implementado. Produtos
  financeiros (seguro, empréstimo) explicitamente bloqueados por
  exigência de registro SUSEP/Banco Central — não é tarefa técnica

### C2 — Programa de Parceiros

- 🟡 Indicadores/afiliados — infraestrutura real construída (OAuth
  Mercado Pago, rastreamento `?ref=`), **não validada com dinheiro
  real** ainda

### C3 — Academia / C4 — Instituto

- ⬜ Nada implementado, sem plano documentado ainda

---

## TRILHO D — Jurídico e Operacional

Itens que não geram valor direto, mas destravam funcionalidades dos
outros trilhos. Detalhe completo em `docs/cronograma-pendencias-carlos.md`.

- **D1 — Domínio**: pendente
- **D2 — CNPJ**: pendente — bloqueia D3 (possivelmente) e D5 inteiro
- **D3 — Mercado Pago Marketplace**: Aplicação ainda não criada,
  CPF x CNPJ não confirmado com o suporte deles
- **D4 — Google Places**: conta Google Cloud ainda não confirmada
- **D5 — Meta** (Business Verification → ISV → Tech Provider): não
  iniciado, depende de D1+D2 primeiro. Tech Partner (nível seguinte)
  exige 10 clientes + 2.500 conversas/dia — fora de alcance por ora

---

## TRILHO E — Carlos (CEO)

Tarefas que só Carlos pode fazer. **Nota de correção**: a proposta
original tinha sobreposição entre Trilho D e E (ex: "abrir conta
Cloudflare" aparecia como pendente no painel de exemplo, mas Cloudflare
já está em uso desde 27/07). Corrigido: E lista só ações humanas puras
(reunião, decisão, conversa); D lista as credenciais/documentos
formais que essas ações produzem.

- ☐ Conversar com contador sobre CNPJ
- ☐ Confirmar CPF x CNPJ com suporte do Mercado Pago
- ☐ Registrar domínio
- ☐ Testar split de comissão em sandbox do Mercado Pago
- ☐ Validar cada nova funcionalidade que Claude entrega (ex: testar
  `/radar`, testar `/diagnostico` com `?ref=`)
- ☐ Aprovar documentos do Comitê (RFC-001, ADR-CORE-005 continuam como
  "Proposto", não "Aceito")
- ☐ Prospectar representadas (Doutor Irrigação e similares, se essa
  direção for adiante — ver Trilho C1)

---

## Painel — dados REAIS (consultados no banco de produção em 31/07/2026)

Nota importante: a proposta original do ChatGPT trazia números de
exemplo (Leads: 12, Diagnósticos: 4, etc.) — **eram inventados**, não
dado real. Abaixo está o dado de verdade, consultado agora:

```
TRILHO A (Receita)

Diagnósticos gerados: 6
Interesse "Sim" no fechamento: 1
Pagamentos iniciados: 1
Pagamentos aprovados: 0
Indicadores conectados: 0

TRILHO C (Ecossistema)

Entrevistas RH recebidas: 0
```

Nenhuma venda foi concluída ainda (o único pagamento iniciado segue
"pendente" — foi o teste de redirecionamento, não uma compra real). Não
existe hoje uma forma automática de ver esse painel sem eu consultar o
banco manualmente — construir isso de verdade é o item "Analytics",
ainda não priorizado.
