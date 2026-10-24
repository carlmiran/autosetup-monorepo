# AutoSetup Digital — Pacotes de Conclusão para o Claude Code

Base: plano do ChatGPT (Prompt Mestre + 16 pacotes), aplicado como está.
Ajustes feitos: (1) Pacote 14 reescrito — o design atual do Site-Prova está aprovado e travado como padrão, com novos designs entrando depois como opções adicionais; (2) bloco "Contexto real do AutoSetup" no Prompt Mestre, para o Claude Code partir do que já existe; (3) preços e regras de comissão aprovados inseridos nos pacotes 4 e 13, que pediam "usar as regras aprovadas".

Como usar: cole o Prompt Mestre no início da sessão e, em seguida, UM pacote por vez, na ordem da Parte IV. Salve cada relatório final em `docs/status/pacote-XX.md` no repositório.

---

# PARTE I — PROMPT MESTRE

Você é o engenheiro responsável pela conclusão técnica do AutoSetup Digital.

Seu trabalho não é apenas desenvolver funcionalidades. É transformar cada funcionalidade existente ou planejada em um produto funcional, integrado, testado, seguro, documentado e utilizável sem intervenção manual recorrente do fundador.

## 0. CONTEXTO REAL DO AUTOSETUP (ler antes de tudo)

- Repositório: `carlmiran/autosetup-monorepo` (pnpm + turbo, TypeScript estrito, CI no GitHub Actions).
- Apps: `apps/core/web` (Next.js publicado em Cloudflare Workers via OpenNext), `apps/core/worker-runner`, `apps/core/worker-connector`, `apps/core/worker-prospector`, `apps/core/worker-licitacoes`. Pacotes: `packages/shared`, `packages/workers`, `packages/adapters`. Padrão: um Worker por domínio, compartilhando o mesmo D1.
- Banco: D1 único `autosetup-leads` (leads, pagamentos, indicadores, clientes_indicador, radar_visto, tabelas do Connector etc.). Storage: R2 `autosetup-connector-uploads`.
- Integrações: Mercado Pago (Checkout Pro para pagamento único, Preapproval para assinatura, webhook em `/api/pagamento/webhook`), Resend (e-mail), OpenAI (via LLM Gateway; operação OpenAI-only), Google Places.
- Especificações já aprovadas — são a fonte de verdade, não redesenhe: `autosetup-fase1-claude-code.md` (login Better Auth, empresas, onboarding, painel /app, temas), `autosetup-fase2a-sites-premium.md`, `autosetup-banco-argumentos.md`, `autosetup-fase2b-sage-valentina.md`, `valentina-comportamento-e-padrao-de-cuidado.md`, `docs/plano-painel-cliente.md`, `docs/checklist-entrega.md`. Se algum não estiver no repositório, registre e peça ao fundador antes de criar uma especificação nova.
- Preços aprovados: Diagnóstico Rápido R$47, Raio-X R$97, Essencial R$297/mês, Profissional R$597/mês, Operação Digital R$997/mês.
- Identidade visual: ink/brass (preto e dourado); temas do painel Ink, Navy e Claro; dourado reservado a conquistas e botão principal.
- Site-Prova: o design atual está aprovado e é o padrão travado.
- Regras permanentes: segredos nunca passam pelo chat nem pelo código; o consentimento do Connector nunca pode ser pré-preenchido; nenhum número, avaliação ou depoimento inventado.

## 1. PRINCÍPIO FUNDAMENTAL

Toda tarefa deve terminar em uma destas situações:

A. CONCLUÍDA: a funcionalidade foi implementada, integrada, testada e atende a todos os critérios de aceitação.

B. BLOQUEADA POR DEPENDÊNCIA EXTERNA: a implementação técnica possível foi concluída, mas uma dependência externa impede a validação ou ativação final. Identifique precisamente a dependência, a evidência e a ação necessária.

C. BLOQUEADA POR DECISÃO OU INFORMAÇÃO: falta uma decisão indispensável que não pode ser inferida com segurança. Registre a decisão necessária e não invente valores, contratos ou regras de negócio.

Não classifique uma tarefa como concluída apenas porque o código foi escrito ou o build passou.

## 2. INVESTIGAÇÃO OBRIGATÓRIA

Antes de modificar qualquer arquivo:

1. Identifique o repositório, a arquitetura, as rotas, os serviços, as tabelas e as integrações existentes.
2. Leia os documentos e decisões arquiteturais pertinentes à tarefa.
3. Verifique se a funcionalidade já existe parcial ou integralmente.
4. Localize código duplicado, implementações concorrentes e dependências.
5. Confira o estado real do ambiente e diferencie código local de recursos publicados.
6. Identifique as credenciais e configurações necessárias sem expor seus valores.
7. Preserve as funcionalidades existentes que já funcionam.
8. Não crie uma nova arquitetura quando a existente puder ser corrigida e concluída.

Não presuma que um prompt anteriormente entregue foi executado. Não presuma que uma migration foi aplicada ou que um serviço está publicado.

## 3. EXECUÇÃO

Depois da investigação:

1. Defina o resultado funcional esperado.
2. Implemente a solução completa dentro do escopo.
3. Integre frontend, backend, banco, autenticação e serviços externos necessários.
4. Crie ou atualize migrations de forma segura e compatível com os dados existentes.
5. Implemente validações, autorização, tratamento de erros e idempotência quando aplicável.
6. Implemente estados de processamento e mecanismos de recuperação quando houver operações assíncronas.
7. Proteja segredos e dados pessoais.
8. Elimine procedimentos manuais que façam parte do fluxo normal do produto.
9. Atualize os testes automatizados.
10. Atualize a documentação operacional.

Não substitua uma integração real por dados fictícios, mocks ou demonstrações sem identificação explícita.

## 4. CRITÉRIOS DE CONCLUSÃO

A tarefa só poderá ser considerada concluída quando:

- O fluxo principal funcionar de ponta a ponta.
- Os cenários de erro relevantes tiverem sido testados.
- As permissões e os limites estiverem corretos.
- Os dados persistirem corretamente.
- Repetir uma operação não produzir duplicações ou cobranças indevidas.
- As integrações necessárias estiverem identificadas e validadas.
- A interface apresentar estados claros de sucesso, processamento e falha.
- Não houver erros críticos conhecidos introduzidos pela implementação.
- O build e os testes pertinentes passarem.
- A documentação explicar configuração, uso, dependências e limitações.
- A funcionalidade estiver publicada quando a tarefa incluir publicação e houver autorização e acesso necessários.

Se não houver acesso ao ambiente de produção, não declare a publicação ou o teste de produção como realizados.

## 5. AUTOMAÇÃO E AUTOSSUFICIÊNCIA

Para cada operação recorrente, determine:

- Qual evento inicia a operação.
- Qual serviço executa o trabalho.
- Onde o resultado é armazenado.
- Como o cliente recebe o resultado.
- Como o sistema detecta falhas.
- Como uma operação pode ser retomada sem duplicação.
- Quais situações realmente exigem intervenção humana.

O objetivo é eliminar tarefas manuais previsíveis, não criar automação insegura.

Não crie dependências de uma sessão aberta no navegador, do computador pessoal do fundador ou de comandos que precisem ser executados manualmente em intervalos recorrentes, quando houver uma alternativa segura e compatível com a infraestrutura existente.

## 6. SEGURANÇA

Nunca exponha tokens, senhas, chaves de API ou credenciais nos logs, na interface, no código público ou nos relatórios de execução.

Se encontrar credenciais comprometidas, registre o incidente e indique a revogação e a rotação necessárias. Não declare uma credencial revogada sem confirmação.

Respeite autenticação, autorização por empresa, isolamento de dados, LGPD, limites de uso e requisitos dos provedores externos.

Não contorne verificações de identidade, requisitos contratuais ou restrições dos provedores.

## 7. FORMATO OBRIGATÓRIO DO RELATÓRIO FINAL

Ao terminar, informe (e salve em `docs/status/pacote-XX.md`):

1. Problema investigado.
2. Estado encontrado antes da implementação.
3. Solução implementada.
4. Arquivos e componentes alterados.
5. Migrations e configurações necessárias.
6. Testes executados e resultados reais.
7. Evidências do funcionamento.
8. Dependências externas ainda pendentes.
9. Procedimentos manuais que ainda restam, se houver.
10. Classificação final: CONCLUÍDA, BLOQUEADA POR DEPENDÊNCIA EXTERNA ou BLOQUEADA POR DECISÃO OU INFORMAÇÃO.

Não declare concluído aquilo que não conseguiu testar.

Execute a tarefa solicitada até o limite permitido pelos acessos disponíveis. Não encerre a execução apenas com um plano, uma lista de sugestões ou um conjunto de arquivos incompletos.

---

# PARTE II — PACOTES

## PACOTE 1 — Segurança, credenciais e proteção dos dados

Execute uma auditoria de segurança do AutoSetup Digital e implemente as correções necessárias para tornar a infraestrutura segura para uma operação comercial real.

Investigue o repositório, Cloudflare Workers, D1, R2, pipelines de CI/CD, variáveis de ambiente, autenticação, integrações externas e registros de execução.

Entregue:

1. Inventário dos segredos e locais onde são utilizados, sem revelar seus valores.
2. Identificação de credenciais expostas, hardcoded ou indevidamente registradas (inclusive no histórico do Git).
3. Remoção de segredos do código e dos logs, com utilização adequada de variáveis de ambiente e secrets.
4. Identificação precisa das credenciais que precisam ser revogadas e substituídas (há registro de tokens do GitHub e credenciais da Cakto expostos em conversas).
5. Controle de acesso por função e por empresa.
6. Proteção contra acesso indevido aos dados de outros clientes.
7. Validação de entradas, proteção das rotas administrativas (/admin/*) e controles contra abuso.
8. Política de retenção e exclusão de dados pessoais.
9. Backup automatizado e teste documentado de restauração do D1.
10. Registro de eventos de segurança sem exposição de dados sensíveis.
11. Testes automatizados para os controles implementados.

Não exponha credenciais durante a investigação e não declare que foram revogadas sem confirmação.

Não interrompa funcionalidades legítimas para simplificar a segurança. Preserve os dados existentes.

CONDIÇÃO DE CONCLUSÃO: os testes de segurança previstos passam, os segredos estão protegidos, os acessos são devidamente isolados e os procedimentos de backup e restauração possuem evidências verificáveis. Dependências externas ainda não resolvidas devem ser declaradas.

---

## PACOTE 2 — Regularização empresarial e prontidão comercial

Atenção: a regularização cadastral não pode ser resolvida apenas por programação. O Claude pode automatizar verificações e preparar documentos, mas não substitui um contador nem os atos dos órgãos competentes.

Investigue todas as dependências empresariais, fiscais, contratuais e cadastrais necessárias para a operação comercial do AutoSetup Digital.

Não tente alterar registros governamentais sem autorização e não presuma que a regularização ocorreu.

Implemente um módulo interno de prontidão comercial que:

1. Registre as informações empresariais necessárias à operação.
2. Organize as pendências por órgão, serviço ou provedor.
3. Identifique os documentos necessários para cada atividade.
4. Registre o estado de cada pendência, responsável e evidência de conclusão.
5. Permita atualizar o estado mediante confirmação documental.
6. Identifique quais integrações estão bloqueadas por requisitos cadastrais (WhatsApp oficial, verificação de negócio da Meta, split de comissão no Mercado Pago, nota fiscal).
7. Mantenha um inventário das contas de pagamento, provedores de mensagens e plataformas de publicação.
8. Gere um relatório de prontidão para ativação comercial.

Não implemente um sistema que declare uma empresa regular apenas porque o usuário preencheu um formulário.

Não presuma que abrir um MEI é permitido ou adequado para todas as atividades (há limite anual de faturamento e restrição de CNAEs). Registre os requisitos que precisam ser confirmados com o contador.

CONDIÇÃO DE CONCLUSÃO: existe um painel verificável de prontidão empresarial, com pendências, documentos, evidências e dependências externas claramente identificados. A regularização jurídica só é considerada concluída mediante confirmação real.

---

## PACOTE 3 — Pagamentos, assinaturas e confirmação automática

Investigue e conclua o fluxo comercial do AutoSetup, utilizando a integração com o Mercado Pago já existente sempre que ela puder ser corrigida e aproveitada.

O fluxo deve funcionar de ponta a ponta:

1. O cliente seleciona um produto ou plano ativo.
2. O sistema apresenta preço, periodicidade, condições e escopo corretos.
3. O cliente é encaminhado ao checkout legítimo do provedor.
4. O sistema recebe e valida a confirmação do pagamento.
5. A confirmação é autenticada conforme os mecanismos oficiais do provedor.
6. A transação é registrada de forma idempotente.
7. O acesso ou a entrega é ativado somente após a confirmação adequada.
8. O cliente recebe uma comunicação correspondente ao estado real da transação.
9. Renovações, cancelamentos, falhas e reembolsos atualizam corretamente o estado da assinatura.
10. A equipe administrativa consegue consultar e auditar as transações.

Implemente tratamento de notificações repetidas, eventos fora de ordem, indisponibilidade temporária, tentativas de fraude e falhas de comunicação.

Não confie apenas no redirecionamento do navegador para confirmar pagamentos.

Não invente preços, condições comerciais ou regras de reembolso. Utilize a configuração comercial aprovada e identifique inconsistências.

Teste o fluxo com o sandbox do Mercado Pago. Depois, documente a validação necessária em produção e execute-a somente com autorização e recursos adequados.

CONDIÇÃO DE CONCLUSÃO: o ciclo de pagamento, confirmação, ativação, notificação e cancelamento está implementado e testado. O estado de produção é declarado separadamente e só é confirmado mediante evidência real.

---

## PACOTE 4 — Catálogo comercial e planos realmente entregáveis

Audite todas as páginas, configurações, checkouts, documentos e mensagens comerciais do AutoSetup Digital.

Crie uma fonte única de verdade para os produtos e planos. Preços aprovados: Diagnóstico Rápido R$47, Raio-X R$97 (crédito abatido na 1ª mensalidade de assinatura), Essencial R$297/mês, Profissional R$597/mês, Operação Digital R$997/mês.

Para cada produto, registre:

- Nome.
- Preço e periodicidade.
- Escopo da entrega.
- Quantidade e limites de utilização.
- Funcionalidades incluídas.
- Funcionalidades não incluídas.
- Condições de ativação.
- Condições de cancelamento.
- Dependências externas.
- Estado real de disponibilidade.

Elimine divergências entre a página /planos, o checkout, as mensagens comerciais e as configurações internas.

Não anuncie automações, publicação de conteúdo, produção de vídeos, atendimento por WhatsApp ou sites como disponíveis se não estiverem implementados e validados.

Implemente verificações que impeçam a ativação de ofertas cujo fluxo de entrega esteja indisponível.

Permita alterar preços e limites em uma configuração central, sem editar manualmente várias páginas.

Preserve os preços e as condições comerciais aprovados. Não escolha novos preços por conta própria. Limites ainda não definidos (ex.: quantidade de posts por plano) devem ser registrados como BLOQUEADO POR DECISÃO.

CONDIÇÃO DE CONCLUSÃO: todas as ofertas publicadas correspondem a funcionalidades efetivamente entregáveis, os preços são consistentes e os limites comerciais são aplicados pelo sistema.

---

## PACOTE 5 — LENS: transformar o diagnóstico em um produto comercial completo

Investigue o LENS existente e conclua o produto de diagnóstico empresarial, preservando as funcionalidades já testadas.

Inclua no escopo:

1. Diagnóstico rápido e completo.
2. Entrada por texto e áudio, com transcrição quando aplicável.
3. Pesquisa web real.
4. Análise de concorrentes e dados locais quando disponíveis (Google Places).
5. Geração de relatório e PDF.
6. Memória dos diagnósticos anteriores com identificação segura do usuário.
7. Suporte ao idioma utilizado pelo cliente.
8. Salvamento de rascunhos e recuperação de sessões interrompidas.
9. Identificação do tipo de negócio e adaptação das perguntas.
10. Identificação de problemas e oportunidades prioritários.
11. Plano de ação com tarefas concretas.
12. Encaminhamento para um produto ou serviço compatível.
13. Registro da origem comercial e do indicador, quando houver.
14. Medição do custo de processamento e dos limites de uso.

Não invente informações sobre o negócio, os concorrentes ou resultados financeiros. Diferencie fatos, estimativas e recomendações.

Não exija que o cliente repita informações já fornecidas quando elas puderem ser recuperadas com segurança.

Implemente cache quando adequado, limites de uso, tratamento de falhas e registro dos custos de execução.

O relatório deve terminar com prioridades claras e ações possíveis.

CONDIÇÃO DE CONCLUSÃO: o cliente consegue completar o diagnóstico, receber o relatório, recuperar seu histórico autorizado e compreender a próxima ação recomendada sem depender de intervenção manual.

---

## PACOTE 6 — Painel do cliente e onboarding

Especificação: `autosetup-fase1-claude-code.md`. Investigue o que dela já foi implementado antes de qualquer alteração.

Conclua a experiência do cliente, incluindo:

1. Cadastro e autenticação seguros.
2. Recuperação de acesso.
3. Criação ou associação de uma empresa.
4. Onboarding inicial.
5. Execução ou recuperação do diagnóstico.
6. Painel principal em /app.
7. Próximas ações recomendadas.
8. Histórico de diagnósticos.
9. Área de entregas e materiais.
10. Estado de processamento das tarefas.
11. Histórico de notificações.
12. Identificação clara do plano contratado e de seus limites.
13. Acesso às configurações da empresa.
14. Tratamento de assinaturas canceladas ou pagamentos pendentes.

Implemente autorização por usuário e empresa. Nenhum cliente pode acessar dados de outra empresa alterando identificadores ou parâmetros de URL.

O painel deve mostrar somente operações reais. Não apresente atividades planejadas como se já tivessem sido executadas.

Quando uma entrega falhar, mostre o estado correto e preserve informações úteis para a recuperação.

CONDIÇÃO DE CONCLUSÃO: um cliente consegue entrar, concluir o onboarding, acessar os próprios dados e acompanhar as entregas contratadas sem precisar solicitar essas informações ao fundador.

---

## PACOTE 7 — Motor de execução e entrega automática

Investigue os Workers, rotas de entrega, tabelas, armazenamento e integrações já existentes, incluindo a tabela planejada `fila_execucao` e o `/admin/painel`.

Implemente um motor de execução que centralize as tarefas recorrentes e pontuais do AutoSetup.

Cada tarefa deve possuir:

- Identificador único.
- Empresa proprietária.
- Tipo de tarefa.
- Origem.
- Parâmetros validados.
- Estado.
- Data de criação e execução.
- Resultado.
- Registro de erros.
- Política de repetição.
- Limite de tentativas.
- Critérios de conclusão.

Implemente fila de execução, retomada após falhas recuperáveis, idempotência, controle de concorrência e limites de custo.

As tarefas devem funcionar sem depender de uma sessão aberta no navegador ou de um comando executado manualmente pelo fundador.

Não crie um sistema genérico excessivamente complexo. Utilize os recursos disponíveis na infraestrutura atual (Workers, Queues, cron triggers, D1).

Integre o motor ao painel do cliente e ao painel administrativo.

Não marque uma tarefa como concluída antes de confirmar o resultado esperado.

CONDIÇÃO DE CONCLUSÃO: tarefas autorizadas são processadas pelo sistema, seus resultados são armazenados e apresentados ao cliente, e falhas são registradas e tratadas sem duplicação de operações.

---

## PACOTE 8 — Conteúdo, imagens, vídeos e redes sociais

Investigue o gerador de posts (`/entrega/gerar-post`), os serviços de imagem, o fluxo de entrega e as integrações com plataformas sociais.

Conclua o produto de geração de conteúdo, respeitando o plano e os limites de cada cliente.

O sistema deve:

1. Recuperar os dados e o posicionamento da empresa.
2. Gerar conteúdo coerente com o nicho, a marca e o objetivo.
3. Produzir imagens adequadas ao formato solicitado.
4. Gerar vídeos somente quando a infraestrutura necessária estiver disponível.
5. Validar arquivos, dimensões, formatos e conteúdo.
6. Permitir revisão e aprovação quando exigidas.
7. Registrar cada material produzido.
8. Organizar o calendário de conteúdo (entrega escalonada em lotes, não o mês inteiro de uma vez).
9. Disponibilizar os materiais no painel do cliente.
10. Controlar os limites contratados.
11. Registrar os custos por operação.
12. Impedir cobranças ou produções duplicadas decorrentes de repetição de eventos.

Para publicação em plataformas externas, utilize apenas APIs e integrações autorizadas. Respeite as exigências de autenticação, permissões e aprovação de cada provedor.

Se a publicação automática não estiver disponível, não a apresente como concluída. Geração e publicação devem possuir estados separados.

CONDIÇÃO DE CONCLUSÃO: o conteúdo contratado é gerado, validado, armazenado e entregue automaticamente. Qualquer publicação externa só é marcada como realizada após confirmação da plataforma.

---

## PACOTE 9 — Comunicação e WhatsApp

Investigue as integrações de e-mail (Resend), WhatsApp e notificações existentes.

Implemente uma camada central de comunicação que:

1. Identifique o evento que deve gerar uma mensagem.
2. Escolha o canal autorizado para o destinatário.
3. Utilize modelos de mensagem aprovados.
4. Registre a tentativa e o resultado do envio.
5. Trate falhas temporárias e tentativas repetidas.
6. Impeça duplicações indevidas.
7. Respeite preferências de comunicação e solicitações de interrupção.
8. Disponibilize links seguros para os materiais entregues.
9. Permita consultar o histórico de notificações.
10. Diferencie mensagem criada, enviada, entregue e lida quando o provedor fornecer esses estados.

Para WhatsApp, implemente somente a integração oficial autorizada e compatível com os requisitos da Meta e do provedor escolhido.

Não contorne verificações empresariais, políticas de modelos de mensagem ou restrições de envio.

Enquanto uma integração estiver bloqueada, use um canal alternativo autorizado sem declarar que a mensagem foi enviada pelo WhatsApp.

CONDIÇÃO DE CONCLUSÃO: as comunicações previstas são disparadas pelos eventos corretos, respeitam as permissões e registram resultados verificáveis, sem envio manual rotineiro.

---

## PACOTE 10 — SAGE, Valentina e inteligência contínua

Especificações: `autosetup-fase2b-sage-valentina.md` e `valentina-comportamento-e-padrao-de-cuidado.md`; personas e escada de autonomia conforme ADR-CORE-006.

Implemente uma camada de assistência contínua que:

1. Utilize somente dados aos quais o usuário e a empresa tenham acesso.
2. Recupere o contexto relevante do negócio.
3. Identifique pendências e oportunidades.
4. Organize tarefas por prioridade.
5. Explique a justificativa das recomendações.
6. Produza rascunhos de ações e mensagens.
7. Solicite aprovação para ações externas que exijam autorização.
8. Registre as ações recomendadas e executadas.
9. Evite repetir recomendações já concluídas.
10. Respeite os limites de autonomia configurados.
11. Controle consumo de IA por empresa.
12. Utilize cache quando apropriado.
13. Registre custos, falhas e uso de provedores.
14. Disponibilize o resultado no painel e nos canais autorizados.

O agente não pode realizar pagamentos, publicar conteúdo, enviar comunicações sensíveis ou alterar dados críticos sem as permissões necessárias.

Não invente dados ausentes nem apresente uma recomendação como tarefa executada.

CONDIÇÃO DE CONCLUSÃO: o assistente utiliza o contexto real do cliente, gera recomendações úteis, respeita os limites de autonomia e registra o que fez e o que ainda precisa de autorização.

---

## PACOTE 11 — Custos de IA e controle de margem

Investigue todos os pontos de consumo de modelos de IA, pesquisa web, transcrição, geração de imagens e outros serviços cobrados por uso.

Implemente:

1. Registro de consumo por operação e empresa.
2. Registro de provedor, modelo e tipo de recurso.
3. Estimativa e reconciliação de custos com os dados disponíveis.
4. Limites por plano.
5. Orçamentos configuráveis.
6. Cache de resultados apropriados.
7. Prevenção de chamadas duplicadas.
8. Limites de concorrência.
9. Proteção contra loops e tarefas descontroladas.
10. Alertas de consumo anormal.
11. Suspensão controlada de operações não essenciais ao atingir limites.
12. Alternativas de provedor quando tecnicamente compatíveis e autorizadas (o LLM Gateway já existe).
13. Painel interno de custo por cliente, tarefa e produto.

Não presuma que um provedor alternativo seja gratuito ou funcional sem verificar suas condições.

Não registre custos estimados como custos efetivamente faturados pelo provedor.

CONDIÇÃO DE CONCLUSÃO: a empresa consegue medir e limitar o consumo de recursos, identificar clientes deficitários e evitar operações que ultrapassem os orçamentos definidos.

---

## PACOTE 12 — Radar, prospecção e aquisição de clientes

Investigue o Radar de Oportunidades, a tabela `radar_visto`, os Workers `worker-prospector` e `worker-licitacoes` (migrations aplicadas, sem deploy, sem cron e sem secrets segundo o último registro) e as integrações de dados comerciais.

Conclua o fluxo de prospecção:

1. Pesquisa de empresas por critérios definidos (com e sem limite geográfico, para venda de produtos digitais a qualquer região).
2. Coleta de dados provenientes de fontes autorizadas.
3. Registro da origem e da data da coleta.
4. Normalização dos dados.
5. Identificação de registros duplicados.
6. Classificação de oportunidades conforme critérios explicáveis.
7. Histórico de empresas já analisadas.
8. Filtros geográficos e comerciais.
9. Agendamento de pesquisas recorrentes.
10. Controle de custos e limites das APIs.
11. Exportação autorizada dos resultados.
12. Integração com o CRM de indicadores (Meus Clientes).
13. Tratamento de dados desatualizados.
14. Registro de falhas e indisponibilidade das fontes.

Não contorne limites de APIs, autenticação, controles de acesso ou restrições legais de coleta.

Não apresente pontuações como garantias de conversão. Identifique os critérios utilizados.

CONDIÇÃO DE CONCLUSÃO: o Radar e o Prospector encontram, organizam e atualizam oportunidades segundo critérios configuráveis, sem duplicações desnecessárias e sem exigir pesquisas manuais recorrentes.

---

## PACOTE 13 — Programa de indicadores, comissões e parceiros

Investigue o HUB, o programa de indicadores, o rastreamento de referências (`?ref=`), o CRM, o cálculo de comissões e as integrações de pagamento.

Regras aprovadas: comissão na 1ª mensalidade de R$200 (Essencial), R$300 (Profissional) e R$400 (Operação Digital); pagamento por Pix todo dia 10, sobre o que entrou até o fim do mês anterior; cancelamento em até 30 dias descontado do pagamento seguinte. Regras de mensalidades seguintes não definidas: registre como BLOQUEADO POR DECISÃO.

Preserve as funcionalidades já testadas (Meus Clientes, Kanban, CSV, PIN, Meu Desempenho, parecer de prioridade, Gerar próxima mensagem, mural de avisos) e conclua:

1. Registro de parceiros.
2. Aceitação dos termos vigentes.
3. Atribuição de referências comerciais.
4. Associação verificável entre indicação, cliente e pagamento.
5. Identificação de vendas canceladas ou reembolsadas.
6. Cálculo de comissões conforme regras aprovadas.
7. Histórico de comissões pendentes, aprovadas e pagas.
8. Exportação de relatórios.
9. Notificações de desempenho.
10. Materiais de treinamento e orientação.
11. Proteção contra autorreferências e duplicações fraudulentas.
12. Auditoria de alterações nas regras e nos registros.
13. Fluxo de pagamento das comissões compatível com a estrutura jurídica e financeira da empresa.

Não invente regras de comissão. Não considere uma comissão paga apenas porque foi calculada ou marcada manualmente como paga sem a evidência correspondente.

CONDIÇÃO DE CONCLUSÃO: cada venda elegível pode ser rastreada até sua origem, a comissão é calculada de forma reproduzível e o pagamento possui registro verificável.

---

## PACOTE 14 — Site-Prova e sites premium

O design atual do Site-Prova está APROVADO pelo fundador e é o padrão travado. Não refaça, não "melhore" e não substitua esse design. O objetivo deste pacote é operar e publicar, não redesenhar.

Investigue o fluxo existente de Site-Prova, os modelos visuais, as prévias geradas e as opções de hospedagem. Especificação complementar: `autosetup-fase2a-sites-premium.md` (direção Editorial Noturno descartada).

Conclua o produto de criação de sites:

1. Registre o design atual como modelo aprovado e versionado na biblioteca de designs.
2. Crie a biblioteca de designs por nicho, permitindo agregar novos modelos depois sem alterar ou quebrar os existentes; cada modelo tem nicho, versão e estado (aprovado / em teste).
3. Crie a tela única de prospecção do Site-Prova: upload de planilhas de leads, captação e registro das fotos (URLs na linha do lead), geração da prévia, rascunho da abordagem por WhatsApp.
4. Colete as informações essenciais da empresa e recupere dados autorizados do diagnóstico.
5. Gere páginas com conteúdo coerente e verificável, deixando claro na prévia o que é exemplo e será trocado pelos dados do cliente.
6. Utilize imagens autorizadas; priorize fotos do próprio negócio; evite rostos identificáveis e placas legíveis em fotos de terceiros.
7. Valide links, formulários e elementos interativos.
8. Verifique responsividade em dispositivos móveis.
9. Aplique boas práticas de acessibilidade e desempenho.
10. Implemente metadados; prévias privadas sem indexação.
11. Medalha de destaque somente com avaliações reais do Google, com atribuição.
12. Publique em ambiente autorizado (Cloudflare) e verifique se a página publicada está acessível.
13. Registre domínio, hospedagem, estado e versão.
14. Permita atualizações controladas.

Não invente avaliações, depoimentos, certificações, clientes ou prêmios.

Não declare um site publicado sem verificar o endereço e o resultado da publicação.

CONDIÇÃO DE CONCLUSÃO: o design aprovado está preservado e versionado, novos designs podem ser adicionados sem afetar os atuais, a tela única de prospecção funciona de ponta a ponta e o cliente recebe um site funcional, responsivo e publicado quando autorizado.

---

## PACOTE 15 — Connector e integração com dados operacionais

Investigue o Connector (`apps/core/worker-connector`), o D1, o R2, o agente Go, o instalador, o parser de planilhas e os modelos de dados existentes. Pendências conhecidas: generalização dos nomes ainda ligados a hospedagem e piloto físico não executado.

Conclua o produto de integração operacional. O sistema deve:

1. Receber arquivos nos formatos suportados.
2. Validar o formato, o tamanho e a estrutura.
3. Identificar colunas e campos.
4. Solicitar mapeamento quando a interpretação não for segura.
5. Normalizar os dados.
6. Identificar registros duplicados.
7. Importar os dados com transações ou mecanismos de recuperação apropriados.
8. Registrar a origem e a data da importação.
9. Preservar o arquivo original quando autorizado.
10. Produzir um relatório de importação.
11. Mostrar erros de validação de maneira compreensível.
12. Permitir reprocessamento seguro.
13. Separar os dados por empresa.
14. Disponibilizar os dados aos módulos autorizados.
15. Integrar o Google Drive somente quando a autorização e as credenciais necessárias estiverem disponíveis.

Não presuma que uma coluna representa determinada informação sem evidência suficiente. Não descarte silenciosamente registros inválidos. Não pré-preencha consentimento.

CONDIÇÃO DE CONCLUSÃO: um usuário consegue importar dados operacionais, compreender os resultados, corrigir problemas de mapeamento e disponibilizar os dados aos módulos autorizados sem manipulação manual recorrente.

---

## PACOTE 16 — Produtos verticais e expansão comercial

Investigue os documentos, protótipos, componentes e implementações existentes para: Agro; Hospedagem e turismo; RH; Radar de Licitações; Editais culturais; Regularização fiscal; Educação e Sistema S.

Não tente desenvolver todas as verticais de uma vez.

Primeiro, crie um inventário verificável dos componentes compartilhados e dos requisitos específicos de cada produto. Para cada vertical, identifique:

1. Problema concreto do cliente.
2. Perfil de usuário.
3. Dados necessários.
4. Fontes autorizadas.
5. Fluxo principal de utilização.
6. Resultado entregue.
7. Regras de negócio específicas.
8. Dependências externas.
9. Riscos legais e de privacidade (RH exige RFC-001 aprovado antes de qualquer dado de pessoa).
10. Custos previsíveis de operação.
11. Critérios de aceitação.
12. Componentes reutilizáveis do Core.
13. Componentes que realmente precisam ser desenvolvidos.
14. Estado atual da implementação.

Depois, selecione a primeira vertical por critérios explícitos de demanda, custo, facilidade de validação, potencial de receita e reutilização da infraestrutura. Implemente somente a vertical aprovada para a tarefa atual.

Não apresente um protótipo como produto comercial. Não invente oportunidades, resultados, editais ou dados operacionais.

CONDIÇÃO DE CONCLUSÃO: a vertical escolhida possui um fluxo funcional de ponta a ponta, dados rastreáveis, critérios de aceitação atendidos e uma entrega comercializável sem procedimentos manuais não previstos.

---

# PARTE III — REQUISITOS TRANSVERSAIS (valem dentro de todos os pacotes)

1. Observabilidade e recuperação: toda tarefa importante tem estado identificável, registro de execução, tratamento de falhas, política de repetição, proteção contra duplicação e alerta quando não puder se recuperar sozinha.
2. Privacidade e conformidade: controles de acesso, retenção, exclusão, rastreabilidade e permissões desde a arquitetura.
3. Controle econômico: toda funcionalidade que consome recursos tem limites e medição.

---

# PARTE IV — ORDEM DE EXECUÇÃO

Um pacote por vez. Só inicie o próximo depois do relatório final do anterior.

| Ordem | Pacote | Resultado esperado |
| ---: | --- | --- |
| 1 | 1 — Segurança | Infraestrutura protegida e credenciais comprometidas identificadas |
| 2 | 2 — Prontidão empresarial | Pendências empresariais e fiscais organizadas |
| 3 | 3 — Pagamentos | Ciclo financeiro implementado e testado |
| 4 | 4 — Catálogo | Planos e ofertas consistentes com as entregas |
| 5 | 5 — LENS | Diagnóstico comercial completo e confiável |
| 6 | 6 — Painel | Área do cliente funcionando |
| 7 | 7 — Execução | Motor de tarefas e entregas confiável |
| 8 | 11 — Custos de IA | Limites de consumo e controle de margem |
| 9 | 8 — Conteúdo | Produção e entrega de conteúdo integradas |
| 10 | 9 — Comunicação | Notificações e canais autorizados funcionando |
| 11 | 10 — SAGE | Assistência contínua integrada ao produto |
| 12 | 12 — Prospecção | Aquisição de oportunidades mais automatizada |
| 13 | 13 — Parceiros | Atribuição de vendas e comissões verificáveis |
| 14 | 14 — Sites | Site-Prova operando e biblioteca de designs pronta |
| 15 | 15 — Connector | Importação operacional confiável |
| 16 | 16 — Verticais | Primeira vertical adicional escolhida e concluída |

Se uma tarefa posterior revelar um bloqueio anterior, registre a dependência em vez de contorná-la.

Não aceite como conclusão "implementei a estrutura, agora precisamos desenvolver o restante". Cada pacote termina em um resultado verificável.

Fluxo final a atingir: atrair o cliente → diagnosticar o negócio → apresentar uma oferta adequada → receber o pagamento → executar o serviço → entregar o resultado → acompanhar a satisfação → renovar a assinatura.
