# AutoSetup — Banco de argumentos por nicho

Cole no Claude Code dentro do `autosetup-monorepo`. Pode rodar em paralelo com a Fase 1: não depende de login nem da tabela de empresas.

---

Você é o dev master do AutoSetup Digital. Hoje o botão "Gerar próxima mensagem" e o "Parecer de prioridade" em `/radar/meus-clientes` geram a abordagem só com a anotação do vendedor e o diagnóstico. Esta tarefa cria um banco de argumentos por nicho, com dados de fonte real, e injeta esse banco nesses dois geradores.

## Regra zero

Antes de construir, localize e me reporte: o endpoint do "Gerar próxima mensagem", o do "Parecer de prioridade", o prompt que cada um usa hoje e de onde vem o nicho do cliente (anotação, diagnóstico, Radar). Reaproveite tudo. Não mude o comportamento dos botões além de enriquecer o prompt.

## 1. Onde o banco fica

- Um arquivo versionado no repositório, em `packages/shared/argumentos/` (TypeScript tipado), não no banco de dados. Assim cada mudança passa por commit.
- Uma página `/admin/argumentos`, só leitura, para eu conferir o conteúdo de cada nicho.

## 2. Estrutura de cada nicho

```
nicho, sinonimos (para classificar), dor_principal, argumento_central,
argumentos_de_apoio[], provas[] (texto, fonte, ano, escopo),
objecoes[] (objecao, resposta), gancho_medalha, acao_principal_do_site
```

O campo `escopo` de cada prova é obrigatório e diz de onde vem o dado (ex.: "pesquisa com consumidores dos EUA"). A IA nunca pode apresentar como dado brasileiro algo que não é.

## 3. Provas gerais (valem para todos os nichos)

- 69% dos consumidores dizem que um negócio local precisa de site para ser confiável. Fonte: DreamHost, Local Business Trust Index 2026, pesquisa com mais de 1.200 consumidores dos EUA, novembro de 2025.
- 45% dizem que negócios sem site parecem menos "reais". Mesma fonte.
- 70% dizem ter mais chance de fazer negócio com quem tem site. Mesma fonte.
- 58% conferem o site com frequência para confirmar o que viram em redes sociais, no Google ou em IA. Mesma fonte.
- Entre menores de 25 anos, 72% consideram o site essencial para a credibilidade. Mesma fonte.

## 4. Argumentos gerais

- **Terreno próprio.** Instagram é alugado: a conta pode ser bloqueada ou hackeada, e o algoritmo decide quem vê. O site é do dono.
- **Conferência.** O cliente descobre pelo Instagram e confirma antes de comprar. Sem onde confirmar, ele vai para quem tem.
- **Google e IAs.** Respostas de buscadores e assistentes de IA são montadas a partir de páginas abertas, e boa parte do Instagram fica atrás do login. Marcar como `tipo: raciocinio`, nunca como dado medido. A IA deve apresentar como tendência, não como estatística.
- **Funciona 24 horas.** Responde preço, horário e como chegar, tirando essa carga do WhatsApp.

## 5. Nichos da primeira leva

**Barbearia e salão**
- Dor: agenda cheia de mensagens, horários vagos não preenchidos.
- Argumento central: o cliente agenda sozinho, sem depender de você responder no WhatsApp.
- Ação do site: agendar.

**Oficina mecânica**
- Dor: desconfiança do cliente com orçamento e serviço.
- Argumento central: mostrar processo, garantia e avaliações reais antes de o cliente deixar o carro.
- Ação do site: pedir orçamento.

**Odontologia e clínicas de saúde**
- Dor: paciente escolhe pela credibilidade e tem medo de errar.
- Argumento central: segurança. Equipe, estrutura e avaliações reais à vista.
- Ação do site: agendar avaliação.
- Restrição: nunca prometer resultado clínico nem usar antes e depois. Respeitar as regras de publicidade dos conselhos profissionais.

**Restaurante**
- Dor: perder cliente para quem mostra o cardápio com clareza.
- Argumento central: o cardápio é a vitrine.
- Prova: 36% dos consumidores priorizam ver o cardápio antes de escolher onde comer. Fonte: Chatmeter, 2025, escopo internacional.
- Ação do site: ver cardápio ou pedir.

**Pousada**
- Dor: comissão paga às plataformas de reserva em cada hóspede.
- Argumento central: reserva direta, sem comissão.
- Ação do site: reservar.
- Nota: não citar percentual de comissão sem fonte; perguntar ao dono quanto ele paga hoje e calcular com o número dele.

**Estética e bem-estar**
- Dor: cliente compara muito antes de marcar.
- Argumento central: mostrar o ambiente e os protocolos com profissionalismo.
- Ação do site: agendar.
- Restrição: nunca alegar emagrecimento ou resultado garantido.

## 6. Objeções (todas os nichos)

- "Já tenho Instagram." → É por lá que o cliente te descobre. O site é onde ele confirma que você é sério antes de fechar.
- "Meus clientes vêm por indicação." → Quem é indicado também pesquisa. A indicação abre a porta, o site confirma.
- "Não tenho tempo para cuidar de site." → A AutoSetup cuida. A hospedagem está incluída e você não precisa mexer em nada.
- "É caro." → Comparar com o valor de um único cliente novo por mês no ticket médio que o dono informar. Nunca inventar o ticket.

## 7. Gancho da medalha

Em todos os nichos, quando o negócio atinge o critério real da medalha: a abordagem abre com a conquista ("Sua [barbearia] está entre as mais bem avaliadas de [cidade] no Google") e só depois apresenta o site como a forma de mostrar isso a quem ainda não conhece. Sem critério atingido, não mencionar medalha.

## 8. Como os geradores usam o banco

- Classificar o nicho do cliente a partir de anotação, diagnóstico e dados do Radar, usando os sinônimos. Sem correspondência, usar só os argumentos gerais.
- Injetar no prompt: o argumento central do nicho, no máximo 2 provas, as objeções do nicho e o gancho da medalha se aplicável.
- Regras para a IA na mensagem gerada:
  - Uma única estatística por mensagem, sempre com a fonte em forma curta ("segundo pesquisa internacional de 2025").
  - Tom de conversa no WhatsApp, curto, sem parecer anúncio.
  - Se o vendedor anotou uma objeção, responder essa objeção primeiro.
  - Nunca inventar número, depoimento ou resultado.
- Registrar em uma tabela nova `argumentos_uso` (cliente, nicho, argumento e prova usados, data) para medirmos depois quais argumentos geram resposta.

## Entrega

Rodar typecheck e lint. Me mostrar 3 mensagens geradas como exemplo (barbearia com medalha, oficina com objeção "já tenho Instagram", pousada sem dados de comissão). Não fazer deploy sem a minha aprovação.
