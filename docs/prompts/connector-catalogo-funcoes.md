# AutoSetup Connector — Catálogo de funções e habilidades

Auditoria de todas as conversas sobre o Connector (17/08 a 03/10/2026).
Salve em `docs/prompts/connector-catalogo-funcoes.md` e peça ao Claude Code:
"Execute docs/prompts/connector-catalogo-funcoes.md".

Legenda de status (a confirmar no código pelo Claude Code):
- **NO AR**: funcionando em produção
- **NO CÓDIGO**: construído e commitado, ainda não publicado ou não testado em produção
- **PLANEJADO**: tem fase e prompt definidos em `connector-auditoria.md`
- **IDEIA**: discutido, sem prompt; viável sem bloqueio externo
- **BLOQUEADO**: depende de CNPJ, Meta, escala, consentimento de terceiros ou decisão estratégica

---

## A. Captura de dados (entrada)

| # | Função | Status | Origem |
|---|--------|--------|--------|
| A1 | Agente Windows (Go) que monitora só a pasta autorizada e envia planilhas alteradas | NO CÓDIGO (piloto físico nunca rodou) | 17/08 |
| A2 | Várias instâncias no mesmo PC (várias unidades/empresas num computador) | NO CÓDIGO | 18/08 |
| A3 | Instalador genérico (Inno Setup), instância "principal", sem prefill | NO CÓDIGO; upload ao R2 em andamento | 29/09 a 03/10 |
| A4 | Pareamento por código + geração de códigos pelo `/admin/connector` | NO CÓDIGO (está entre os 11 commits sem push) | 29/09 |
| A5 | Instalação remota: código e pasta pré-configurados, consentimento sempre ativo e presencial/digitado | NO CÓDIGO | 18/08 |
| A6 | Revogação (`/revogar`) | NO CÓDIGO; efetividade a verificar (Fase 1, S4) | 17/08 |
| A7 | Fonte Google Drive via conta de serviço | PLANEJADO (Fase 6) | 29/09 |
| A8 | Múltiplas pastas e tipos de arquivo por instância (roadmap V2) | IDEIA | 17/08 |
| A9 | OneDrive / Dropbox (V3) | IDEIA, depois do Drive | 17/08 |
| A10 | Integração com sistemas de gestão / PMS / ERP (V4) | BLOQUEADO por decisão: só sob demanda real de um cliente | 17/08 |
| A11 | Agente recebe comandos remotos (V5) | BLOQUEADO por decisão: o Carlos pediu para não assumir que é desejável | 17/08 |

## B. Interpretação (parsers)

| # | Função | Status | Origem |
|---|--------|--------|--------|
| B1 | Parser tabular (uma linha por registro) | NO AR / NO CÓDIGO | 17/08 |
| B2 | Parser de grid diário (ex-HospitalityGridParser → dailyGrid): espaços nas linhas, dias nas colunas, blocos com totais | NO CÓDIGO, 19 testes | 18 a 21/08 |
| B3 | Classificador estrutural (decide o parser pela estrutura, nunca pelo nome) | NO CÓDIGO | 18/08 |
| B4 | Princípio "não inventar dado" + confidence + referência à origem | NO CÓDIGO | 18/08 |
| B5 | `UNKNOWN_FORMAT` com motivo (ex.: planta baixa, despesas em texto livre) | NO CÓDIGO | 21/08 |
| B6 | Parser tabular "Data / Nº pessoas / Valor / Total" (caiu como UNKNOWN nos testes reais) | IDEIA, candidato prioritário | 21/08 |
| B7 | Fila de UNKNOWN_FORMAT visível no admin, para guiar novos parsers | PLANEJADO (Fase 4, O3) | 29/09 |
| B8 | Biblioteca de padrões de planilha entre clientes (só estrutura, nunca dado), para o próximo cliente parecido já ser reconhecido | IDEIA | 18/08 |
| B9 | Despesas em texto livre (aba "gastos") | IDEIA futura; hoje UNKNOWN de propósito | 21/08 |

## C. Pipeline e armazenamento

| # | Função | Status | Origem |
|---|--------|--------|--------|
| C1 | R2 (arquivo bruto) → Queue → D1 (dado estruturado) | NO CÓDIGO | 17/08 |
| C2 | Tabelas com nomes neutros (sem vocabulário de hospedagem) | PLANEJADO (Fase 5, G1) | 22/08, 29/09 |
| C3 | Debounce do Excel, fila offline com retry, deduplicação por hash | PLANEJADO (Fase 3) | 29/09 |
| C4 | Retenção mínima, exclusão ao revogar, versão dos termos no consentimento | PLANEJADO (Fase 4) | 29/09 |

## D. Operação e segurança

| # | Função | Status | Origem |
|---|--------|--------|--------|
| D1 | Alerta de erro por e-mail (Resend) | NO AR, mas com remetente de teste; falta verificar o domínio | 18/08 |
| D2 | Heartbeat ("visto por último"), versão do agente, aviso de desatualizado | PLANEJADO (Fase 3) | 29/09 |
| D3 | Códigos de pareamento aleatórios + rate limit; limites de upload; auth do admin; token protegido (DPAPI); agente sem seguir symlinks | PLANEJADO (Fase 2) | 29/09 |
| D4 | Página de download com SHA-256 e guia do aviso do Windows | PLANEJADO (Fase 4, C1) | 29/09 |
| D5 | Mover agente e instalador para `apps/connector-agent/` | PLANEJADO (E1) | 17/08, 29/09 |

## E. Entrega de valor ao cliente (consumo dos dados)

| # | Função | Status | Origem |
|---|--------|--------|--------|
| E1 | Resumo automático por conector (totais, comparação de períodos, picos, lacunas) | PLANEJADO (Fase 5, A1). É o gargalo nº 1 | 29/09 |
| E2 | LENS / Raio-X usando dado real do Connector | PLANEJADO (Fase 5) | 18/08 |
| E3 | Alerta proativo já com a conclusão ("X ficou vazio 5 dias → considere avisar parceiros") | IDEIA (depende de E1) | 18/08 |
| E4 | Post pronto gerado a partir de um evento real (dia fraco → post de promoção junto com o alerta) | IDEIA; liga dois módulos que já existem (`/entrega/gerar-post`) | 18/08 |
| E5 | "Zero dashboard": o dono pergunta por áudio e recebe resposta com dado real | Pela web: IDEIA (Whisper já existe). Pelo WhatsApp: BLOQUEADO (CNPJ/Meta) | 18/08 |
| E6 | Simulação "e se" (ex.: baixar preço 10% no fim de semana) usando o histórico do próprio cliente | IDEIA (exige meses de histórico) | 18/08 |
| E7 | Meus Clientes do empresário alimentado pelas planilhas (quem sumiu, frequência) | PLANEJADO no produto (16/09), sem prompt | 16/09, 29/09 |
| E8 | Cruzamento com calendário e sazonalidade (PULSE) | IDEIA / visão | 18/08 |

## F. Rede entre clientes (precisa de escala)

| # | Função | Status |
|---|--------|--------|
| F1 | Benchmark anônimo entre clientes do mesmo nicho | BLOQUEADO (escala + anonimização) |
| F2 | Alerta preditivo por padrão agregado | BLOQUEADO (mesma base do F1) |
| F3 | Troca de vagas/encaixe entre parceiros | BLOQUEADO (CNPJ + decisão estratégica) |
| F4 | Reconhecer cliente recorrente via rede de parceiros | BLOQUEADO (dado de terceiro, precisa de RFC de consentimento) |
| F5 | IA de atendimento ao cliente final | BLOQUEADO (WhatsApp/CNPJ/Meta + consentimento) |
| F6 | Mercado de serviços locais entre verticais | BLOQUEADO (escala) |

## G. Papel na arquitetura

| # | Diretriz | Status |
|---|----------|--------|
| G1 | Connector genérico: qualquer nicho, nenhum nome de cliente real | DECIDIDO (29/09), regra no CLAUDE.md |
| G2 | Consentimento nunca pré-preenchido; só configuração pode vir pronta | DECIDIDO (18/08) |
| G3 | Connector = infraestrutura do Core; produtos leem só dado estruturado por API interna | PROPOSTA (29/09), aguarda o Carlos |
| G4 | Consentimento por finalidade (cada produto novo que usa o dado precisa estar coberto) | PROPOSTA (29/09) |
| G5 | Family Care não compartilha banco, bucket nem credenciais | PROPOSTA (29/09) |
| G6 | Identidade única da empresa (ATLAS) ligando Connector, diagnóstico e pagamento | PLANEJADO (mapa de dados primeiro) |

---

## Prompt para o Claude Code

```
Execute o catálogo de funções do Connector. Regras do CLAUDE.md valem. NÃO implemente
nenhuma função nova nesta tarefa: é verificação e organização.

1. Para cada item das seções A a E (e G1, G2), verifique no código e no D1 (--remote,
   só leitura) o status real. Corrija o status quando o catálogo estiver errado,
   com evidência (arquivo:linha, tabela, rota). Itens F e G3 a G6 ficam como estão.

2. Crie docs/connector/catalogo.md com o catálogo corrigido: uma tabela por seção,
   colunas # | função | status | evidência | fase/prompt que a cobre.
   Nenhum nome de cliente real.

3. Em docs/prompts/connector-auditoria.md, depois da Fase 6, acrescente a
   "Fase 7 — Entrega de valor ampliada", com pré-requisito Fase 5 concluída,
   cobrindo só os itens IDEIA viáveis sem bloqueio externo, nesta ordem:
   B6 parser tabular Data/Nº pessoas/Valor/Total (com fixtures sintéticas de 2 nichos),
   E3 alerta proativo com conclusão (só número real; a IA explica, não inventa),
   E4 post gerado a partir do evento (reaproveitar a geração de post existente;
      o post vai para revisão, nunca é enviado sozinho),
   E5 pergunta por áudio pela web (reaproveitar o Whisper do diagnóstico),
   B8 biblioteca de padrões estruturais (sem nenhum dado de célula),
   A8 múltiplas pastas por instância.
   Para cada um: objetivo, onde mexe, testes, e o que fica fora.
   Itens BLOQUEADOS não entram em fase nenhuma.

4. Commit: "docs: catálogo de funções do Connector + Fase 7". Sem push.
5. Relatório: lista dos status que você corrigiu, com o antes e o depois.
```

---

## Ordem geral do Connector depois disto

Fase 0 (fechando) → push → Fase 1 (auditoria) → Fase 2 (segurança) → Fase 3 (confiabilidade) → Fase 4 (LGPD) → Fase 5 (resumo + LENS) → Fase 6 (Google Drive) → Fase 7 (entrega de valor ampliada).
