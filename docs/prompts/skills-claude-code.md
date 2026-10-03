# Skills do Claude Code para o AutoSetup

Salve em `docs/prompts/skills-claude-code.md` e peça ao Claude Code:
"Execute docs/prompts/skills-claude-code.md".

Skill = uma pasta `.claude/skills/<nome>/SKILL.md` dentro do repositório. O Claude Code lê o nome e a descrição de todas as skills em toda sessão, e o conteúdo completo de uma skill só quando a tarefa combina com ela. Assim, o que foi aprendido com erro vira procedimento, e cada sessão nova não recomeça do zero.

---

## As 8 skills, em ordem de prioridade

| # | Skill | Para quê | Origem (lição real) |
|---|-------|----------|---------------------|
| 1 | `deploy-producao` | Levar código ao ar sem quebrar nada | 29/09: Worker com nome divergente, push antes da migration, login do wrangler |
| 2 | `migration-d1` | Mudar o banco sem perder dado | 0003 era ADD COLUMN e a checagem por tabela não a detectaria; regra de nunca apagar |
| 3 | `privacidade-e-dados` | LGPD, consentimento, secrets, dado real fora do repo | Consentimento pré-preenchido em 18/08; nome de cliente no binário; leads reais em fixture |
| 4 | `executar-prompt-pack` | Executar os arquivos de `docs/prompts/` fase a fase | Bloco colado tratado como texto; fases misturadas |
| 5 | `connector-parser` | Adicionar ou ajustar parser de planilha | Grid diário, "não inventar dado", UNKNOWN_FORMAT |
| 6 | `connector-instalador` | Compilar agente e instalador e publicar no R2 | -buildvcs, instância principal, .exe fora do git, grep no binário |
| 7 | `chamada-llm` | Toda chamada de IA no produto | "Gateway não conectado", rate limit que bloqueou venda, custo da busca web |
| 8 | `mapa-de-dados` | Manter atualizado o mapa de tabelas, quem escreve, quem lê e a chave do cliente | Base do ATLAS; diagnóstico identifica por WhatsApp e pagamento por e-mail |

A skill do ATLAS (ler e gravar o contexto da empresa) fica para depois que o mapa de dados existir e o ATLAS mínimo for desenhado.

---

## Prompt para o Claude Code

```
Crie as skills de projeto do AutoSetup em .claude/skills/<nome>/SKILL.md, seguindo a
especificação de cada uma abaixo.

Regras de escrita:
- Frontmatter YAML com name e description. A description diz O QUE a skill faz e
  QUANDO usar, em português, com os termos que o Carlos usa ("subir", "deploy",
  "push", "migration", "banco", "planilha", "instalador" etc.). Seja insistente:
  "use sempre que...", para a skill não deixar de ser acionada.
- Corpo com menos de 200 linhas: passos numerados, regras, e uma seção
  "Erros que já aconteceram" com as lições reais listadas.
- Verifique cada caminho, comando, nome de Worker, banco e bucket contra o repo
  real. NÃO invente. Se algo da especificação não bater com o repo, use o que é real
  e me diga a diferença.
- Não duplique o CLAUDE.md: aponte para ele quando a regra já estiver lá.
- Scripts repetitivos (ex.: tabela de testes de produção) podem ir em
  .claude/skills/<nome>/scripts/, funcionando no shell que você usa nesta máquina
  Windows.
- Nenhum segredo, nenhum nome de cliente real, nenhum dado real dentro das skills.

Depois de criar:
1. Para cada skill, escreva 2 pedidos de exemplo que deveriam acioná-la e 1 que NÃO
   deveria, e diga qual skill você usaria em cada um. Ajuste as descriptions até
   acertar.
2. Adicione ao CLAUDE.md uma seção curta "Skills do projeto" listando as 8 e quando usar.
3. Commit (um commit para todas as skills, um para o CLAUDE.md). Sem push.
4. Relatório: tabela skill | arquivos criados | diferenças encontradas em relação à especificação.

=====================================================================
1. deploy-producao
Quando: qualquer pedido de subir, publicar, fazer deploy ou push, ou de testar produção.
Passos:
 a. git status limpo; git log origin/main..main --oneline e mostrar o que vai sair.
 b. Para cada mudança, listar pré-requisitos: migrations, secrets, bindings, arquivos no R2.
 c. Migrations ANTES do push (usar a skill migration-d1).
 d. Secrets: nunca ler, pedir ou imprimir. Dizer ao Carlos o nome do secret e em qual
    Worker cadastrar (pelo painel da Cloudflare, no Worker que serve produção).
 e. O push é sempre do Carlos (git push origin main). Nunca fazer push.
 f. Depois do build verde: rodar a tabela de testes de produção (curl com status,
    content-type e tamanho), comparar com o esperado e listar falha + causa provável.
 g. Workers com deploy separado (worker-connector, radar, prospector) NÃO sobem com o
    push do web: avisar e dar o comando wrangler deploy da pasta certa.
Erros que já aconteceram:
 - "name" do wrangler.jsonc do web divergia do Worker em produção (autosetup-monorepo)
   e um secret put iria para o Worker errado.
 - Rota nova em produção respondendo 404 porque o push não tinha sido feito.
 - wrangler sem login: o comando com ! não rodou porque havia ">" na frente.
   Login pelo PowerShell: npx wrangler login.

2. migration-d1
Quando: criar ou alterar tabela/coluna, rodar migration, consultar o banco de produção.
Regras:
 - Numeração sequencial em migrations/, incremental: CREATE TABLE IF NOT EXISTS,
   ADD COLUMN, nunca DROP/DELETE/UPDATE em massa sem aprovação explícita do Carlos.
 - Antes de aplicar: verificar se já foi aplicada. Para tabela nova: sqlite_master.
   Para ADD COLUMN: PRAGMA table_info ou o "sql" da tabela em sqlite_master
   (LIKE no nome da tabela NÃO detecta coluna nova).
 - Testar local primeiro, depois --remote no banco certo (confirmar o nome no repo).
 - Renomear tabela: criar a nova, copiar, trocar leitura e escrita, manter a antiga até
   aprovação.
 - Registrar no doc de rastreabilidade do projeto (se existir) o que mudou e quando.

3. privacidade-e-dados
Quando: consentimento, termos, dados de cliente, fixtures, logs, secrets, exportação,
exclusão, qualquer tela que colete dado pessoal.
Regras:
 - Consentimento nunca é pré-preenchido nem automático. Gravar timestamp e versão dos termos.
 - Consentimento por FINALIDADE: usar dado do Connector num produto novo exige
   finalidade nova ou consentimento atualizado.
 - Fixtures e testes só com dados fictícios. Nada de nomes, telefones, e-mails ou
   negócios reais. Antes de commitar fixture, procurar padrões de telefone/e-mail.
 - Nenhum nome de cliente real em código, comentário, doc ou binário.
 - Logs sem dado pessoal e sem conteúdo de planilha.
 - Retenção mínima: bruto no R2 é apagado depois de processado.
 - Family Care (dados de saúde) nunca usa banco, bucket ou credenciais do AutoSetup Core.
 - Secrets: nunca ler, pedir ou imprimir. Se um valor aparecer por acidente, avisar
   para trocar.

4. executar-prompt-pack
Quando: o Carlos pede para executar um arquivo de docs/prompts/ ou uma "Fase N".
Passos:
 a. Ler o arquivo inteiro e as regras gerais dele.
 b. Dizer qual fase vai executar e o que ela muda. Se houver pré-requisito de fase
    anterior não cumprido, parar e avisar.
 c. Executar só aquela fase. Commit por item. Sem push.
 d. Terminar com relatório em tabela (item | feito | evidência | pendência para o
    Carlos) e parar.
 e. Blocos de texto que o Carlos colar começando com instrução ("Faça", "Execute",
    "Cole") são pedidos, não material de referência.

5. connector-parser
Quando: planilha nova, formato não reconhecido, UNKNOWN_FORMAT, parser, classificador.
Regras:
 - O parser nunca inventa dado. Na dúvida, UNKNOWN_FORMAT com motivo.
 - Novo parser entra no registro de parsers e no classificador, sem quebrar os existentes.
 - Classificação por estrutura, nunca por nome de arquivo, aba ou cliente.
 - Toda saída leva confidence e referência à origem (aba/linha/célula).
 - Testes: fixture sintética de pelo menos 2 nichos diferentes + caso negativo que deve
   continuar UNKNOWN. Rodar a suíte de regressão inteira.
Erros que já aconteceram: falso positivo de mês, data serial do Excel, linha de total
virando pessoa "0", cabeçalho virando espaço, planta baixa (não é dado de negócio).

6. connector-instalador
Quando: compilar o agente Go, gerar instalador, publicar download.
Passos:
 a. Agente: GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -buildvcs=false.
 b. Procurar nomes de cliente real no binário (grep) = 0.
 c. Instalador Inno Setup com instância "principal" por padrão, sem prefill de código
    de pareamento nem consentimento.
 d. Informar tamanho e SHA-256.
 e. Upload para o R2 no caminho servido por /downloads. .exe NUNCA no git (*.exe no .gitignore).
 f. Atualizar SHA-256 e tamanho na página de download, se ela mostrar esses dados.

7. chamada-llm
Quando: criar ou alterar qualquer chamada de IA no produto (diagnóstico, posts,
resumo, parecer, transcrição).
Regras:
 - Usar o gateway/adaptador existente do repo. Chamar connect() antes de usar.
 - Timeout explícito e mensagem clara para o usuário quando falhar ou demorar.
 - Rate limit por rota, calibrado para não bloquear uso legítimo numa venda
   (o limite de 5/hora já bloqueou o Carlos na frente de um cliente).
 - Números só calculados de dado real. A IA explica, nunca inventa número,
   prova social ou urgência.
 - Estimar e comentar no código o custo por chamada (busca web é o item mais caro).
 - Responder no idioma do usuário.
 - Rascunho do usuário salvo localmente antes de chamar a IA, para nunca perder o que ele preencheu.

8. mapa-de-dados
Quando: o Carlos pergunta onde fica um dado, como os produtos se integram, ou antes
de criar tabela ou produto novo. Também ao final de qualquer fase que crie tabela.
Saída: docs/mapa-de-dados.md com uma tabela por banco:
 tabela | produto que escreve | produto que lê | chave que identifica o cliente
 (WhatsApp, e-mail, código, property_id...) | dado pessoal? | retenção
E uma seção "Costuras soltas": tabelas que falam do mesmo cliente sem uma chave comum.
Sempre a partir do código e do schema real, nunca de memória.
```

---

## Depois (você)

1. Revise o commit das skills: `git show --stat HEAD~1`.
2. Faça o push quando quiser. As skills não mexem em produção.
3. Em sessões novas, teste pedindo algo como "vamos subir o que fizemos hoje" e veja se ele segue o `deploy-producao` sem você precisar lembrar os passos.
