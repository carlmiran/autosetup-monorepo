# AutoSetup — Fase 2B: SAGE, fila de execução, Valentina e economia de IA

Cole no Claude Code dentro do `autosetup-monorepo`, depois que a Fase 1 (login, empresas, painel) estiver concluída. Coloque também no repositório o arquivo `valentina-comportamento-e-padrao-de-cuidado.md`: ele é a especificação de comportamento citada abaixo.

---

Você é o dev master do AutoSetup Digital. Esta fase faz o AutoSetup trabalhar sozinho por cada empresa: o SAGE decide as tarefas da semana, os WORKERS executam, o dono aprova, e a Valentina conversa com ele para aprender mais sobre o negócio. Tudo isso com custo de IA controlado, porque o AutoSetup precisa ter lucro em todos os planos.

## Regra zero

Antes de construir, audite e me reporte:
1. O LLM Gateway atual: o que ele já faz (troca de provedor, limite por IP) e onde fica.
2. Se a tabela `fila_execucao` planejada para o `/admin/painel` já existe.
3. Onde está o gerador de posts (`/entrega/gerar-post`) e o rastreamento de avaliações do Google.
4. Como a Fase 1 ficou: tabelas `empresas`, `atividades`, sessão de login.

Reaproveite tudo. Respeite a arquitetura do Core (LENS, SAGE, ATLAS, PULSE, PATHS, WINDOW, WORKERS, HUB): nada de componente novo fora desses oito.

## Parte 1 — Camada de economia de IA (construir primeiro)

Todo uso de IA do sistema passa por aqui, sem exceção.

1. **Cota por empresa.** Tabela `uso_ia` registrando cada chamada: empresa, finalidade (negocio, pessoal, sistema), modelo, tokens de entrada e saída, custo estimado em reais, data. Cada plano tem um limite mensal de créditos, configurável em um único arquivo. Ao chegar a 80%, o painel avisa. Ao chegar a 100%, as tarefas automáticas param e o dono vê como contratar créditos extras. Nunca cortar no meio de uma resposta.
2. **Modelo por tarefa.** O gateway escolhe o modelo pela finalidade: um modelo barato para classificar, confirmar, resumir e extrair dados; o modelo principal só para gerar entregas e conversar. A tabela de roteamento fica em um arquivo, fácil de mudar.
3. **Histórico resumido.** Conversas longas nunca reenviam o histórico inteiro. A cada poucas trocas, o sistema guarda um resumo curto e envia só o resumo mais as últimas mensagens.
4. **Cache de respostas.** Antes de chamar a IA, verificar se aquela pergunta (normalizada) já foi respondida para a mesma empresa. Se sim, devolver a resposta salva. Dúvidas comuns sobre o uso do sistema viram um FAQ fixo, respondido sem IA.
5. **Mídia salva.** Todo áudio e vídeo gerado é guardado no Cloudflare R2 com um identificador. O botão "ouvir de novo" ou "ver de novo" toca o arquivo salvo, sem custo.
6. **Checklist sem IA.** Planos do dia e passo a passo são gerados uma vez e salvos como checklist. Marcar "concluí" é só uma gravação no banco. A IA só é chamada de novo se o dono pedir ajuda em um passo.
7. **Painel de custos no admin.** Em `/admin/custos`: custo de IA por empresa no mês contra o valor do plano, com destaque para quem estiver com margem negativa.

## Parte 2 — SAGE e fila de execução

- Tabela `fila_execucao` (ou reaproveitar a existente): empresa, tipo de tarefa, descrição, status (planejada, em_execucao, aguardando_aprovacao, aprovada, entregue, recusada), resultado, criado_em, prazo.
- Uma vez por semana (cron do Cloudflare), o SAGE olha a memória de cada empresa ativa e os eventos da semana, e cria as tarefas: posts da semana, resposta sugerida para avaliações novas no Google, ajustes no site, campanha de data sazonal do nicho.
- Os WORKERS executam as tarefas e as deixam em "aguardando aprovação". Nada vai ao ar sem o "sim" do dono.
- No painel do dono, as tarefas aparecem como cartões de aprovação: aprovar, pedir ajuste em uma frase, ou recusar. Uma recusa vira aprendizado gravado na memória da empresa.
- A entrega dos posts continua pelo WhatsApp, em lotes espaçados, enquanto a publicação automática estiver bloqueada pelo CNPJ.
- Cada passo gera uma linha em `atividades`, para o feed "o que o AutoSetup fez por você".

## Parte 3 — Valentina

- Criar um único módulo de persona (ex.: `packages/shared/persona/valentina.ts`) a partir do arquivo `valentina-comportamento-e-padrao-de-cuidado.md`. Todo gerador que fala com o cliente usa esse módulo.
- **Conversa adaptativa** em `/app/conversa` (e um cartão "pergunta do dia" no painel):
  - Mapa de lacunas por nicho: o que o SAGE precisa saber de cada empresa (serviços, ticket médio, diferencial, público, horários, dúvidas frequentes dos clientes, praças atendidas). Guardar o que já se sabe em uma tabela `empresa_conhecimento` (campo, valor, origem, confiança, data).
  - Cada turno é uma única chamada, que devolve em JSON: a reação ao que o dono disse, a próxima pergunta e os dados extraídos.
  - Uma pergunta por mensagem, no máximo 5 por sessão. Aceita resposta por áudio, reaproveitando a transcrição já existente.
  - Quando uma resposta destrava algo (ex.: ticket médio → relatório em reais), mostrar isso na hora.
- **Modo pessoal:** quando o assunto não é o negócio, a chamada é marcada com finalidade "pessoal" na tabela `uso_ia`. O que for dito ali não entra em `empresa_conhecimento` nem em nada que outra pessoa veja.
- Casos de ofensa, sofrimento sério, cancelamento e cobrança geram um alerta no `/admin` para o Carlos, conforme a especificação.

## Parte 4 — Concorrência por praça

- Tabela `empresa_pracas`: empresa, cidade, origem da informação (cadastro, conversa).
- Para cada praça, buscar no Google Places os negócios do mesmo nicho e guardar os concorrentes por praça, separando três camadas: origem (cidade da empresa), praça (perto dos clientes distantes) e online.
- O relatório e o painel mostram a comparação por praça.
- Limitar o número de praças por plano, para manter as buscas dentro da cota gratuita do Google Places.
- A Valentina pergunta, quando fizer sentido: "O que faz seu cliente de [praça] comprar de você mesmo tendo opção perto?" A resposta vira o diferencial registrado da empresa naquela praça.

## Fica para a Fase 2C (não fazer agora)

- Radar de Rota: busca de compradores e concorrentes ao longo de um trajeto, prioridade por cidade e calendário de passagem.
- Perfil de vida do dono (opcional, com consentimento): horas disponíveis, metas pessoais e restrições de agenda, para o SAGE montar planos que caibam na vida real dele, seguindo o RFC-001.

## Entrega

- Typecheck e lint sem erros. Migrations testadas no D1 local antes de produção, com a minha aprovação.
- Demonstração com a AutoSetup Digital como empresa: uma semana de tarefas gerada pelo SAGE, três turnos da conversa da Valentina e o painel de custos mostrando o gasto real dessa demonstração.
- Conversas de teste listadas na seção "Como validar" da especificação da Valentina, para eu revisar antes do deploy.
- Me diga o custo estimado de IA por empresa por mês em cada plano, com base nos dados reais da demonstração.
