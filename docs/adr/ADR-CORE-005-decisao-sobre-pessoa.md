# ADR-CORE-005 — Decisão Envolvendo Pessoa (variante rígida)

**Status**: Proposto (aguardando aprovação — mudança de princípio do
Core, mesmo nível de ACP-001)

**Data**: 29/07/2026

## Contexto

O princípio "SAGE recomenda, nunca decide" (ACP-001) foi desenhado
pensando em decisões comerciais — aceitar uma oportunidade, priorizar um
lead, sugerir um preço. Nesses casos, o pior cenário de a IA errar é
financeiro.

A vertical RH introduz um tipo de decisão categoricamente diferente:
decisões sobre **pessoas** — quem é chamado pra entrevista, quem é
aprovado, quem é desligado, quem recebe um feedback de desempenho. O
pior cenário de erro aqui não é financeiro, é humano: alguém perde uma
oportunidade de emprego, ou é avaliado injustamente, por causa de um
padrão que a IA aprendeu.

O princípio genérico "recomenda, não decide" não é suficiente sozinho
para esse contexto — precisa de reforços específicos.

## Decisão

Quando o sujeito de uma recomendação/análise do AutoSetup é uma **pessoa
física identificável** (candidato, funcionário), além de "recomenda,
não decide", valem as regras adicionais:

1. **Nunca ranking automático de pessoas sem revisão humana explícita
   antes de qualquer ação visível pro candidato/funcionário.** Um score
   ou ordenação gerado pela IA nunca pode, sozinho, resultar em rejeição
   automática ou avanço automático de alguém no processo.
2. **Explicabilidade obrigatória**: toda recomendação envolvendo pessoa
   precisa vir acompanhada dos fatores concretos que a geraram, em
   linguagem que um humano consiga auditar — nunca um "score: 72" sem
   justificativa.
3. **Proibição de proxy discriminatório**: o sistema não pode usar
   sinais que funcionem como proxy indireto de características
   protegidas (ex: CEP como proxy de raça/classe, nome como proxy de
   gênero/etnia) para nenhuma recomendação sobre pessoa — mesmo que o
   dado bruto nunca seja coletado diretamente (ver RFC-001).
4. **Direito de contestação**: qualquer pessoa avaliada pelo sistema
   (candidato ou funcionário) tem direito a saber que foi avaliada por
   IA e contestar o resultado — isso precisa ser um requisito de
   produto, não só um princípio abstrato.
5. **HUB não se aplica a pessoas da mesma forma que a Partners**: um
   funcionário/candidato não é uma "Organization" nem um "Partner" no
   modelo do Core — precisa de um tipo de entidade próprio (a definir no
   PRD do RH), evitando a tentação de forçar o modelo comercial existente
   em cima de gente.

## Consequências

- Qualquer feature de "score de candidato" ou "ranking de desempenho" no
  futuro PRD do RH precisa nascer já com essas 4 regras aplicadas, não
  como adendo posterior.
- Isso é mais lento e mais restritivo que o padrão comercial do resto do
  Core — é proposital. Velocidade nunca deve ser o critério aqui.
- Se um dia outra vertical tratar de pessoas fora do contexto comercial
  (ex: uma vertical de Saúde), este ADR se aplica a ela também, não só
  a RH.
