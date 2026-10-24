# AutoSetup AI Agency — Plano de Conclusão

Oct 9, 2026 · @Carlos Teodoro Miranda Filho

## Onde estamos (auditoria real de hoje)

Nenhuma das fases do SaaS foi executada: os prompts das Fases 1, 2A, 2B e do banco de argumentos existem, mas a produção não tem nenhuma tabela deles. O último deploy do app principal foi em 05/10, antes do prompt da Fase 1 (07/10).

| Item | Situação em produção | Evidência |
| --- | --- | --- |
| App principal (autosetup-monorepo) | No ar, último deploy 05/10/2026 | Lista de Workers |
| Workers Prospector e Licitações | Publicados em 14/08, nunca alimentados | 0 linhas em licitacao\_encontrada e radar\_pendentes |
| Worker Connector | Publicado em 18/08, sem piloto pareado | 0 linhas em connectors |
| Diagnóstico LENS | Funcionando, 8 leads no total | Último lead em 13/08/2026 |
| Pagamentos | 1 registro de teste, 0 aprovados | Tabela pagamentos |
| Prospects importados | 184 em clientes\_indicador, parados desde agosto | Bug do CSV: categoria salva no lugar do nome em 177 |
| Fase 1 (login, empresas, /app) | Não executada | Sem tabelas de usuário, sessão ou empresas |
| Fase 2A (sites premium) e Site-Prova | Não executada no banco | Sem tabela de sites ou prévias |
| Banco de argumentos | Não executado | Sem argumentos nem argumentos\_uso |
| Painel da agência + fila\_execucao | Não executado | Sem tabela fila\_execucao |
| Fase 2B (SAGE + Valentina) | Não executada | Depende da Fase 1 e da fila |

A conclusão prática: a base de venda (LENS, Radar, checkout, comissões) existe, mas a camada que transforma isso em agência operada por IA ainda não saiu do papel.

## Ordem de conclusão

São 7 etapas em duas trilhas, e a primeira venda real não espera a plataforma ficar pronta: assim que a Etapa 1 entrega 3 prévias, a abordagem começa enquanto as Etapas 3 a 6 seguem.

&#91;embedded content: ordem de conclusão · 7 etapas em 2 trilhas\]

A Etapa 0 vem antes de tudo porque corrige dados que as duas trilhas usam. Na trilha da plataforma, cada etapa depende da anterior: a fila precisa das empresas, e o SAGE escreve na fila.

## Contrato fixo de sessão (cole no topo de todo prompt)

Todo prompt de etapa começa com este bloco. Ele existe para evitar os três problemas já vividos: código gerado e nunca integrado, sessão paralela commitando sem coordenação e retrabalho que ignora o que já existe.

```markdown
# CONTRATO DE SESSÃO — AutoSetup (leia antes de qualquer código)

1. Rode `git pull` e `git log --oneline -20`. Se houver commit que você não reconhece, PARE e me mostre.
2. Leia antes de escrever: README, /docs (ADRs, DGV-001, checklist-entrega), `apps/core/web/app`, `packages/`, o schema D1 atual (`wrangler d1 execute autosetup-leads --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`).
3. Reaproveite o que existe: LLM Gateway (chame `connect()` antes de usar), tabelas leads/pagamentos/clientes_indicador/radar_*, rotas /admin/*, rate_limits, paleta ink #16140f / brass #b8863b / forest #2f4f3e, fontes Fraunces + Public Sans.
4. Nunca crie projeto, app ou banco novo fora do monorepo. Nunca crie segundo banco D1 sem me perguntar.
5. Segredos só como Secret no painel da Cloudflare. Nunca peça token no chat, nunca grave token em arquivo.
6. Migrations D1 versionadas em `migrations/NNNN_nome.sql`, aplicadas primeiro em `--local`, depois `--remote`.
7. Antes do deploy: typecheck, lint (eslint-plugin-boundaries), testes, e um teste real no D1 de produção (inserir, consultar, apagar o registro de teste).
8. Deploy via push na main (integração Git do Cloudflare Workers). Depois do deploy, abra a URL e confirme que a rota responde.
9. Ao terminar, escreva `docs/sessoes/AAAA-MM-DD-etapa-N.md`: o que mudou, tabelas criadas, secrets pendentes, o que ficou de fora e por quê.
10. Dúvida de arquitetura que mude o Core de 8 componentes: pare e pergunte (regra DGV-001: nenhuma decisão sobe de nível sozinha).
```

## Prompts de execução

Cada prompt vai para o Claude Code depois do contrato de sessão. Onde já existe um prompt entregue antes, anexe o arquivo original e cole só os ajustes abaixo: ele continua valendo, com as decisões tomadas depois dele.

### Etapa 0 — Higiene e reativação (1 sessão)

Antes de abrir a sessão, faça você mesmo: revogue no GitHub todos os tokens antigos colados em chats (Settings → Developer settings → Tokens) e gere um novo só para o Claude Code.

```markdown
ETAPA 0 — Higiene e reativação. Escopo fechado, sem features novas.

1. Bug do import CSV em /radar/meus-clientes: em 177 de 184 linhas de clientes_indicador o campo nome recebeu a categoria do negócio. Corrija a heurística de detecção de coluna (nome do negócio tem prioridade sobre categoria; categoria vai para notas). Escreva migration de reparo: onde nome = categoria e houver o nome real nas notas ou no CSV de origem, recupere; onde não houver, marque nome como "[revisar] <categoria>" sem apagar nada. Me mostre a contagem antes e depois.
2. Workers autosetup-worker-prospector e autosetup-worker-licitacoes estão publicados e nunca rodaram (0 linhas). Leia o código, descubra por que não há dado (cron ausente? secret ausente? tabela errada?), corrija e configure cron triggers no wrangler.toml. Respeite o crédito gratuito do Google Places (limite diário no próprio Worker).
3. Liste os secrets que o código espera e os que existem (GOOGLE_PLACES_API_KEY, RESEND_API_KEY, NOTIFICATION_EMAIL, MERCADOPAGO_ACCESS_TOKEN, webhook). Entregue uma checklist do que eu preciso configurar no painel, sem pedir os valores.
4. Confirme que o webhook /api/pagamento/webhook responde 200 a uma notificação de teste.

Pronto quando: 184 registros com nome legível ou marcado para revisão, os dois Workers gravando ao menos 1 linha real, checklist de secrets entregue.
```

### Etapa 1 — Site-Prova vendável (modo entrega, 2 a 3 sessões)

Primeiro, fora do Claude Code: use o Claude Design para fechar os modelos visuais de 1 nicho piloto (oficina) nas duas direções que sobreviveram, Clareza Técnica e Referência Local. Só passe para o código quando você olhar e disser que venderia. Exporte o HTML aprovado para `design/site-prova/oficina/`.

```markdown
ETAPA 1 — Site-Prova. Anexo: autosetup-fase2a-sites-premium.md (prompt original). Aplique com estes ajustes, que valem sobre o original:

- Direções: apenas Clareza Técnica e Referência Local. Editorial Noturno foi descartado.
- Base visual: os HTMLs aprovados em design/site-prova/<nicho>/ são a referência. Transforme-os em templates com slots; não redesenhe.
- Prévia completa do modelo, com faixa visível "Prévia: textos e fotos marcados são exemplo e serão trocados pelos seus ao contratar".
- Medalha de destaque com dado real do Google Places (nota, nº de avaliações, cidade), com atribuição. Ela é o motivo do contato na abordagem.
- Avaliações sempre reais e atribuídas. Fotos: Google Places na prévia; banco (Unsplash/Pexels) só com licença verificada e curadoria de cor e cena coerente com o template.
- Hospedagem da prévia no próprio Worker (rota /p/<slug>), sem custo, com noindex.
- Fluxo: Radar ou meus-clientes → botão "Gerar Site-Prova" → revisão minha em /admin/site-prova (aprovar, editar texto, trocar foto) → link pronto + mensagem de abordagem para WhatsApp (copiar, nunca enviar sozinho).
- Tabela site_previas (id, cliente_indicador_id, nicho, direcao, slug, dados_json, status, criado_em).

Pronto quando: eu gero, reviso e abro no celular 3 prévias reais de oficinas da lista, nas duas direções.
```

### Etapa 2 — Banco de argumentos (1 sessão)

```markdown
ETAPA 2 — Banco de argumentos. Anexo: autosetup-banco-argumentos.md. Ajustes:

- Comece por oficina (nicho do Site-Prova), depois barbearia, clínicas, restaurante, pousada, estética.
- A mensagem de abordagem do Site-Prova também consome o banco, além de "Gerar próxima mensagem" e "Parecer de prioridade".
- Toda estatística com fonte e escopo; sem fonte, não entra. Registre em argumentos_uso qual argumento foi enviado e se houve resposta.
```

### Etapa 3 — Fase 1 do SaaS (2 sessões)

```markdown
ETAPA 3 — Fase 1. Anexo: autosetup-fase1-claude-code.md. Ajustes:

- Better Auth no mesmo D1 autosetup-leads (não crie banco novo).
- Tabela empresas distinta de leads e de clientes_indicador; ao criar empresa a partir de um prospect, guarde a referência ao registro de origem.
- AutoSetup Digital é a empresa nº 1 e precisa estar operando no /app ao final.
- Temas Ink (padrão), Navy e Claro. Dourado só em conquistas e botão principal. Nada de pergaminho ou terracota.
- O feed "o que o AutoSetup fez por você" deve ler da fila_execucao quando ela existir; por ora, deixe a interface pronta para essa fonte.
```

### Etapa 4 — Painel da agência e fila de execução (1 a 2 sessões)

```markdown
ETAPA 4 — /admin/painel + fila_execucao. Este é o centro da agência de um homem só.

1. Tabela fila_execucao (id, empresa_id, tipo, origem, descricao, payload_json, status, aprovacao, criado_em, atualizado_em, executado_por). Status: pendente, aprovado, em_execucao, concluido, falhou. executado_por: humano, claude_chrome, worker.
2. Módulos que passam a escrever na fila: Radar e Prospector (novo prospect qualificado), Site-Prova (prévia para revisar), entrega de posts (lote a gerar e lote a enviar), Licitações (edital compatível), follow-up atrasado de clientes_indicador.
3. /admin/painel no padrão de /admin/comissoes e /admin/clientes, tema Ink: colunas por status, filtro por tipo e empresa, botão aprovar e marcar concluído.
4. Modo Claude in Chrome: cada tarefa tem uma visão "instrução" em texto limpo (o que fazer, em qual aba, o que marcar ao terminar), para o Claude in Chrome ler, executar em outra aba e voltar. O gate de aprovação humana é obrigatório para qualquer envio externo.
5. Contadores do topo: tarefas hoje, aprovadas aguardando, concluídas na semana, pagamentos aprovados no mês.

Pronto quando: as tarefas de pelo menos 3 módulos aparecem sozinhas no painel e eu concluo uma pelo Claude in Chrome.
```

### Etapa 5 — Fase 2B: SAGE e Valentina (2 a 3 sessões)

```markdown
ETAPA 5 — Fase 2B. Anexos: autosetup-fase2b-sage-valentina.md e valentina-comportamento-e-padrao-de-cuidado.md. Ajustes:

- O SAGE escreve as tarefas semanais de cada empresa na fila_execucao da Etapa 4; não crie fila paralela.
- Valentina no /app: uma pergunta por vez, escolhida pelo que falta saber da empresa, substituindo o formulário longo para empresas logadas.
- Camada de economia obrigatória: cota por empresa, cache de respostas repetidas, checklist sem nova chamada, mídia gerada salva e reproduzível sem custo. Mostre o custo estimado por empresa no /admin/empresas.
- Teste completo com a AutoSetup Digital como empresa nº 1 antes de qualquer cliente.
```

### Etapa 6 — Fase 2C: Radar de Rota e concorrência por mercado atendido (1 a 2 sessões)

```markdown
ETAPA 6 — Radar de Rota. Ainda não há prompt anterior; este é o primeiro.

- Concorrência mapeada pelo mercado atendido, não só pelo endereço: a empresa declara cidades onde vende (ex.: Águas da Prata → Belo Horizonte).
- Para cada cidade da rota: concorrentes do mesmo ramo e potenciais clientes (Google Places, dentro do limite diário).
- Saída: mapa da rota no /app e tarefas na fila (ex.: "3 concorrentes em BH sem site: argumento de posicionamento").
- Reaproveite o adaptador Google Places e o Modo Remoto (Text Search) já desenhado para o Prospector.
```

## Frentes paralelas e o que fica fora deste plano

As demais frentes continuam andando, como você decidiu, mas não entram na sequência do Claude Code: elas não dependem destas etapas, e misturá-las no mesmo repositório agora atrasaria o caminho até o primeiro Cliente Fundador.

- **Abordagem real:** começa assim que a Etapa 1 entregar as 3 primeiras prévias, sem esperar as Etapas 2 a 6. Use poucos contatos por dia, com aprovação manual de cada envio.
- **Mel, Valentina em vídeo e lives:** seguem fora do monorepo e entram no /app pela Fase 2B (vídeos nos marcos) quando ela existir.
- **Infoprodutos, CRF, AURA, 5 pilares EUA, Family Care e Agro:** são projetos separados, com integração posterior via API, pelo padrão modular já adotado.
- **Continua bloqueado por CNPJ ou Meta:** WhatsApp automatizado (envio sozinho), postagem automática para clientes terceiros e comissão automática via split. O plano contorna isso com envio aprovado por você e entrega de posts pelo cliente.

Decisões em aberto, que só você toma:

- [ ] Domínio próprio da AutoSetup para as prévias (hoje ficariam em workers.dev).
- [ ] Perfil de vida do dono alimentando o SAGE: entra na Etapa 6 ou depois?
- [ ] Aviso de cota para assuntos pessoais com a Valentina: mostrar ou não ao cliente.
