# ADR-CORE-004 — Reconciliação: Core Congelado vs. Visão Kernel/Business DNA

**Status**: Aceito (decidido pelo Claude atuando como Dev Master do AutoSetup
OS, sem veto de Carlos após comunicação explícita — ver DGV-001 sobre quem
aprova o quê).

**Data**: 2026-07-26

## Contexto

Duas linhas de trabalho arquitetural coexistiram sem reconciliação formal:

1. **Core congelado** (Architecture Freeze v1.0/v1.1, Architecture Baseline
   v1.1): 8 componentes — LENS, SAGE, ATLAS, PULSE, PATHS, WINDOW, WORKERS,
   HUB. Validado em produção conceitual por duas verticais completas
   (Agro, Hospedagem) e base de todo o roadmap de execução (APR-001,
   SPR-CORE-001, EBK 0.1).

2. **Visão "Kernel/Business DNA"**: um documento constitucional mais amplo
   e anterior, descrevendo Kernel, Business DNA, Executive Intelligence
   Layer (10 executivos de IA), Decision Engine, Digital Twin (8
   dimensões), Learning Engine, Sistema Nervoso Empresarial (80+ eventos),
   7 tipos de memória.

Uma auditoria de integridade (26/07/2026) expôs que essas duas visões
nunca foram reconciliadas por escrito, criando risco real de implementação
divergente — exatamente o tipo de deriva que DGV-001 existe para prevenir.

## Decisão

**A arquitetura oficial e implementável, a partir de agora, é o Core de 8
componentes congelado.** Todo código, PRD, ADR e sprint de execução parte
dele.

**A visão Kernel/Business DNA é classificada como Horizonte H4** (usando o
vocabulário já estabelecido de horizontes estratégicos — H0 a H4, certeza
decrescente, autonomia decrescente). Ela não é descartada, não compete com
o Core, e não é implementada nesta fase. Fica arquivada como inspiração de
longo prazo.

Mapeamento explícito (para não perder o valor conceitual do documento
mais amplo, só adiar sua implementação):

| Visão H4                          | Componente do Core mais próximo hoje       |
|------------------------------------|---------------------------------------------|
| Business DNA                       | Nenhum — conceito de H4, sem equivalente Classe E hoje |
| Executive Intelligence Layer        | SAGE (versão futura, muito mais autônoma)   |
| Decision Engine                     | SAGE (skills de recomendação já existentes) |
| Digital Twin                        | Nenhum — H4 puro                            |
| Learning Engine                     | ATLAS (memória) + PULSE (eventos), versão futura |
| Sistema Nervoso Empresarial         | PULSE (já existe, escopo menor)             |
| Memória Empresarial (7 tipos)        | ATLAS (versão futura, mais rica)            |

## Consequências

- Nenhum PRD ou implementação futura deve referenciar "Kernel", "Business
  DNA" ou "Workflow Engine" como se fossem componentes do Core atual —
  isso é terminologia de H4, não do presente. (Achado relacionado já
  registrado no parecer de RH: "Workflow Engine" → mapear para WORKERS.)
- Se e quando o projeto atingir maturidade suficiente para revisitar H4,
  isso exige um novo ADR próprio — este documento não pré-aprova nenhuma
  implementação futura de Business DNA/Digital Twin/etc., só reconhece
  que a visão existe e onde ela se conecta ao Core de hoje.
- Esta reconciliação foi comunicada a Carlos e não vetada antes da
  execução do EBK Task 0.1, que já assume o Core de 8 componentes como
  base. Se precisar ser revertida, isso também exige ADR próprio, não
  uma decisão implícita.
