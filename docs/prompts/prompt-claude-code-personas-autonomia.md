# Prompt para o Claude Code — Personas, Escada de Autonomia e Rotina das 5h30

Você está no monorepo `carlmiran/autosetup-monorepo` (pnpm + turbo, TS estrito; `apps/core/{api,web,worker-runner}`, `packages/{shared,workers,adapters}`; produção no Cloudflare Workers + D1; LLM via Gateway existente, operação OpenAI-only). Implemente o **ADR-CORE-006** (anexo `ADR-CORE-006-personas-e-escada-de-autonomia.md`; copie-o para `docs/adr/` conferindo a numeração).

## Regra 0 — Auditar antes de construir (obrigatório)
Antes de escrever qualquer código, leia o repositório e me entregue um relatório curto com:
1. Se `fila_execucao` já existe (planejada com: id, tipo, cliente, descricao, status, criado_em) e se `/admin/painel` existe.
2. Estado da Fase 1 (Better Auth, tabela `empresas`, `/app`, feed "o que o AutoSetup fez por você").
3. Onde estão hoje: os leads da prospecção do Site-Prova, o banco de argumentos por nicho e `argumentos_uso`, e qualquer Executor de Anúncio de Produto ou kit de afiliado.
4. Como o Gateway é chamado (lembrete: `llmAdapter.connect()` antes de usar) e como o rate limiting atual funciona.

**Reaproveite tudo o que existir.** Estenda as tabelas, não as duplique. Se uma fonte de dados citada abaixo não existir, deixe essa parte desativada com um aviso no painel. Não crie uma fonte paralela.

## Passo 1 — Registro de personas e escada de autonomia

### Migrations D1
- `persona_perfis`: `id, slug (mel|valentina), nome, publico, escopo_memoria, voz_json, regras_json, autonomia_padrao (0-3), ativo, versao, atualizado_em`. Seed: Mel e Valentina, conforme o ADR §1 e §2.3.
- `autonomia_regras`: `id, persona_id, tipo_acao, nivel (0-3), orcamento_dia_centavos, promovido_por, promovido_em, justificativa`. Única por (persona_id, tipo_acao).
- Estender `fila_execucao` (ou criar, se não existir): `persona_id, empresa_id (nullable; AutoSetup = empresa nº 1), tipo_acao, nivel_aplicado, origem (cron|pulse|manual), payload_json, rascunho, fonte_dados_json, custo_estimado_centavos, status, motivo, criado_em, decidido_em, executado_em`.
  - status: `pendente_aprovacao | aprovado | rejeitado | editado_aprovado | executado | desfeito | bloqueado_regra | bloqueado_orcamento`
- `eventos_agente` (append-only, nunca UPDATE/DELETE): `id, fila_id, tipo_evento, detalhe_json, criado_em`.
- `config_agentes`: flag `agentes_pausados` + orçamento global diário.

### Regras em código (`packages/shared`)
- `TIPOS_TETO_NIVEL_1`: preço, desconto, contrato, cobrança, dinheiro, prazo comprometido, decisão sobre pessoa. `resolverNivel()` nunca retorna mais que 1 para esses tipos, qualquer que seja o banco.
- `validarSaidaPersona(saida, persona, fontes)`: validador pós-geração.
  - Números monetários, percentuais e quantidades que não estejam em `fonte_dados_json` → `bloqueado_regra`.
  - Mel: exigir #publi quando houver link de afiliado ou menção à AutoSetup.
  - Termos de promessa de ganho ("garantido", "renda certa", "você vai ganhar R$") → bloquear.
  - Estatística sem campo de fonte → bloquear.
  - Comece com regras determinísticas (regex + listas). Só use LLM no validador se a regra determinística não cobrir, e registre o custo.
- Orçamento: antes de gerar, checar o gasto do dia por (persona, tipo_acao) e o global → `bloqueado_orcamento`.
- Promoção de nível: **somente** via ação humana em `/admin/autonomia`, com justificativa obrigatória. A tela mostra a taxa de "aprovado sem edição" dos últimos 20 itens daquele tipo como evidência. Nada promove sozinho.

### Telas (WINDOW) — tema Ink padrão, visual de dashboard de tecnologia, nada de pergaminho/terracota
- `/admin/aprovar` — **mobile-first** (é a rotina diária do Carlos pelo celular): cards por item com persona, tipo, rascunho, fontes usadas e custo, mais os botões Aprovar / Editar e aprovar / Rejeitar (motivo opcional). Filtros por persona e tipo.
- `/admin/autonomia` — matriz persona × tipo_acao com nível atual, evidência e o botão de promover/rebaixar.
- `/admin/personas` — ver e editar perfil (cria nova `versao`).
- Interruptor geral visível no topo de `/admin/aprovar`.

## Passo 2 — Rotina das 5h30 (dogfooding da agência)

Cron Trigger do Worker às **08:30 UTC (05:30 BRT)**, todos os dias. Cada fonte gera itens no **nível 1** (pendente de aprovação). Nada é enviado ou publicado automaticamente.

1. **Abordagens do Site-Prova** (persona: Valentina; tipo: `rascunho_abordagem`). **Só de segunda a quinta**, nunca sexta, sábado ou domingo. Para os leads do dia da fonte existente, gerar a mensagem de WhatsApp usando o banco de argumentos do nicho (com fonte) e registrar em `argumentos_uso`. Após aprovar, o card mostra o botão wa.me com a mensagem. O disparo é manual pelo Carlos.
2. **Kit da Mel** (persona: Mel; tipo: `kit_afiliado`). Lê uma fila simples `mel_produtos_fila` (link + nicho, alimentada manualmente pelo Carlos em `/admin/aprovar`). Gera **só texto**: gancho, roteiro de 30–50 s no molde abertura → tela → fechamento, legenda, hashtags e #publi. Sem vídeo e sem raspagem nesta fase. Os dados do produto vêm do que o Carlos digitar ao cadastrar o link.
3. **Post da Valentina** (persona: Valentina; tipo: `post_conteudo`). Um post por dia a partir do banco de argumentos, alternando nichos com leads ativos (oficina, estética automotiva, lava-car). Proporção 70% dica e 30% história hipotética declarada.

Cada item gerado passa por `validarSaidaPersona` e pela checagem de orçamento antes de entrar na fila, e escreve em `eventos_agente`.

## Critérios de aceite
- [ ] Relatório da Regra 0 entregue antes do código.
- [ ] Migrations aplicadas em D1 local e produção; seed de Mel e Valentina.
- [ ] Teste: um tipo da lista de teto **nunca** resolve para nível > 1, mesmo com 3 no banco.
- [ ] Teste: saída com "fiz R$ 347" sem fonte → `bloqueado_regra`; kit da Mel sem #publi → `bloqueado_regra`.
- [ ] Teste: cron numa sexta não gera `rascunho_abordagem`.
- [ ] `eventos_agente` sem UPDATE/DELETE em nenhum caminho de código.
- [ ] `/admin/aprovar` utilizável em tela de 380 px; testado com Playwright sem erros de página.
- [ ] O interruptor geral pausa a geração e a execução.
- [ ] Rotas `/admin/*` protegidas pelo mesmo mecanismo já usado em `/admin/comissoes`.

## Não fazer nesta entrega
- Agente ou memória separados por persona.
- Envio automático por WhatsApp ou publicação automática em redes (bloqueados por CNPJ/Meta).
- Promoção automática de autonomia.
- Raspagem de marketplace, geração de vídeo, servidor MCP e gatilhos do PULSE para clientes (próximas entregas).
- Nova API paga ou nova assinatura.
