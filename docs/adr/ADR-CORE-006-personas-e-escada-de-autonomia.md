# ADR-CORE-006 — Personas como perfis do SAGE e Escada de Autonomia

**Status:** Aceito (14/10/2026) · **Decisor:** Claude (dev master, governança de 10/10/2026), a pedido de Carlos
**Número provisório:** conferir sequência em `docs/adr/` antes de commitar
**Relaciona-se com:** ADR-CORE-004 (Core de 8 componentes), ADR-CORE-005 (decisão sobre pessoa), DGV-001 (nenhuma decisão sobe de nível automaticamente), Princípios #24–28, modelo de publicação C do Knowledge-to-Action

---

## 1. Contexto

A AutoSetup passou a operar com personas de IA: **Mel** (B2C, lifestyle, afiliados), **Valentina** (B2B, consultora, rosto do SAGE para empresas). Também estão previstos outros avatares: a treinadora do sistema, a qualificadora de indicadores e o avatar do fundador para cursos.

Com IA agêntica, essas personas deixam de apenas falar em vídeo e passam a **agir**: preparar abordagens, gerar kits de afiliado, publicar, responder e reagir a eventos. Há dois riscos:

1. **Fragmentação.** Cada persona vira um agente com memória e modelo próprios. Isso multiplica o custo, quebra o Core congelado e faz uma persona contradizer a outra.
2. **Autonomia sem critério.** Ou tudo exige aprovação manual, o que não escala para uma agência de um homem só, ou tudo roda sozinho, o que gera risco de marca, legal e financeiro.

## 2. Decisão

### 2.1 Uma mente, vários rostos
- O **SAGE continua sendo o agente único** (ADR-CORE-004 intacto, nenhum componente novo).
- Cada persona é um **perfil de persona** armazenado no **ATLAS**: voz, público, canais, regras invioláveis e nível de autonomia padrão.
- A execução segue nos **WORKERS**, os gatilhos vêm do **PULSE** e a visibilidade fica no **WINDOW**.
- Personas **não têm memória própria**. Elas leem a memória do ATLAS filtrada pelo seu escopo (Mel não vê dados de empresas clientes; Valentina não vê dados pessoais de afiliados).

### 2.2 Escada de autonomia (por tipo de ação)

| Nível | Nome | Comportamento |
|---|---|---|
| 0 | Sugere | Gera recomendação e não produz artefato executável |
| 1 | Prepara | Gera o artefato pronto e espera aprovação humana |
| 2 | Age e avisa | Executa, registra e notifica, com desfazer disponível por janela definida |
| 3 | Age no orçamento | Executa sozinho dentro de um orçamento diário por tipo de ação |

- A autonomia é definida por **(persona, tipo de ação)**, não por persona inteira.
- **Promoção de nível é sempre ato humano explícito** (DGV-001). O sistema mostra a evidência (taxa de aprovação sem edição nos últimos N itens), mas nunca se promove sozinho.
- **Teto rígido no nível 1**, garantido em código e não em configuração, para ações que envolvem: preço, desconto, contrato, cobrança, dinheiro, compromisso de prazo, e qualquer decisão sobre uma pessoa (ADR-CORE-005).

### 2.3 Regras invioláveis de toda persona (validadas após a geração)
1. Nenhum número de venda, comissão, faturamento ou resultado de cliente que não venha de fonte real registrada. Hipóteses só se forem declaradas como hipóteses.
2. Publicidade marcada: a Mel marca #publi em todo conteúdo com link de afiliado ou que leve à AutoSetup; a Valentina marca fora do perfil oficial da AutoSetup.
3. Se perguntada, a persona confirma que é uma persona virtual. Nunca nega.
4. Nenhuma estatística sem fonte.
5. Nenhuma promessa de ganho ou resultado.

Uma saída que viola regra vai para `bloqueado_regra` com o motivo e nunca é executada, qualquer que seja o nível.

### 2.4 Travas de operação
- Todo ato do agente gera um **evento append-only**, que alimenta o feed "o que o AutoSetup fez por você" e a auditoria.
- **Orçamento** diário por tipo de ação e global, e a ação que estoura fica em `bloqueado_orcamento`.
- **Interruptor geral** (`agentes_pausados`) que congela toda execução nos níveis 2 e 3.

## 3. Consequências

**Positivas:** uma memória única; custo previsível; novas personas entram por cadastro, sem código novo; a autonomia cresce com evidência; o feed vira prova de valor para o cliente.

**Custos:** o validador pós-geração adiciona latência e alguma chamada extra; o painel de aprovação precisa ser bom no celular, porque vira a rotina diária do fundador.

## 4. Alternativas rejeitadas
- **Agente separado por persona:** viola ADR-CORE-004, duplica custo e memória.
- **Autonomia por persona inteira:** granular demais para baixo (trava tudo) ou para cima (libera ação de risco).
- **Promoção automática por taxa de aprovação:** viola DGV-001.

## 5. Implementação inicial
Ver `prompt-claude-code-personas-autonomia.md`: registro de personas, escada de autonomia sobre a `fila_execucao`, e a rotina das 5h30 (dogfooding da agência).
