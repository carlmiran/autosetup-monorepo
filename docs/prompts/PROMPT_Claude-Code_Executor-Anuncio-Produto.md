# Prompt para Claude Code — Executor de Anúncio de Produto (AutoSetup)

> Substitui o prompt "TikTok Ads Studio Pro". Não é um app novo: é um executor dentro do monorepo existente.
> Versão 3 · 05/10/2026 (v3: motor de regras agnóstico de programa — funciona para qualquer afiliação) · Escopo: Etapas 1–2 (custo ~zero) + agendador de créditos gratuitos (Etapa 3, modo assistido)

---

## 0. LEIA ANTES DE ESCREVER QUALQUER CÓDIGO

Você está no repositório `carlmiran/autosetup-monorepo`. Antes de criar arquivos:

1. `git pull` — já houve sessão paralela commitando sem coordenação.
2. Leia a estrutura existente: `apps/core/{api,web,worker-runner}`, `packages/{shared,workers,adapters}`, regras do `eslint-plugin-boundaries`.
3. Leia como o LLM Gateway é usado hoje (procure `llmAdapter.connect()`; já houve bug real por chamar o Gateway sem `connect()`).
4. Leia a rota `/entrega/gerar-post` (geração de imagem via OpenAI `gpt-image-1`, já em produção). Reaproveite, não duplique.
5. Leia o rate limiting das rotas de IA e aplique o mesmo padrão nas rotas novas.

**Restrições fixas (não negociáveis):**
- Runtime: Cloudflare Workers + D1. Sem Postgres, Redis, S3, Temporal, FastAPI, Fastify.
- LLM: via LLM Gateway existente, operação OpenAI-only. Não usar SDK da Anthropic nem modelos `claude-3-5-*`.
- Segredos: só via Secrets do painel Cloudflare. Nunca pedir chave no chat, nunca commitar `.env`.
- Arquitetura: isto é extensão do **ContentGenerationWorker** (decisão de 15/09/2026), não componente novo. Core de 8 componentes congelado (ADR-CORE-004).
- Workers **não roda FFmpeg**. Montagem de vídeo fica fora do Worker (ver §4).
- Custo: nenhuma API paga por geração de vídeo nesta versão. Vídeo pago só entra em versão futura, disparado por pedido de assinante.

---

## 1. ETAPA 1 — Análise de produto (rota `/api/anuncio/analisar`)

**Input:** imagem do produto (upload) + contexto opcional em texto/áudio (reaproveitar transcrição Whisper existente) + três campos obrigatórios perguntados ANTES de qualquer geração:
- `modelo_venda`: `proprio` | `afiliado` (com `programa_id` apontando para `programas_afiliado`, e `oferta_id` opcional — ver §1.5). Programa ainda não cadastrado → dispara o fluxo de cadastro do §1.5 antes de seguir.
- `origem_imagem`: `propria` | `fornecedor_autorizado` | `anuncio_de_terceiro` (ex.: foto do anúncio do vendedor no marketplace).
- `tipo_imagem_entrada`: `packshot` (fundo neutro) | `lifestyle` (produto já em cenário) — detectar por visão e pedir confirmação.

**Output (`ProductAnalysis`, JSON validado com zod em `packages/shared`):**
`categoria` (taxonomia fixa: MOVEIS, VESTUARIO, FERRAMENTAS, ELETRONICOS, CASA_E_DECORACAO, BELEZA_E_CUIDADOS, FITNESS_ESPORTES, PETS, COZINHA, AUTOMOTIVO, DIGITAL_PRODUTOS), `subcategoria`, `atributos_visuais[]`, `cores_dominantes[]`, `publico_alvo{}`, `dores_resolvidas[]`, `beneficios_principais[]`, `cenarios_uso[]`, `palavras_chave[]`, `tom_de_voz`, `claims_de_produto[]`.

**Regras:**
- Vision via Gateway (modelo com visão disponível na conta OpenAI).
- Cache por hash SHA-256 da imagem em D1 — mesma imagem não gera nova chamada.
- `claims_de_produto` alimenta o **Método de Verificação de Autenticidade de Produto**: claim de saúde/eficácia sai marcado `requer_verificacao: true`, nunca vai direto para roteiro.
- **Gate de canal:** decidido pelo Motor de Regras de Afiliação (§1.5), nunca por `if` de plataforma no código.
- **`origem_imagem = anuncio_de_terceiro`:** nunca usar a foto como peça final paga; usar apenas como referência de fidelidade. Exibir aviso de direito de imagem.
- **Autenticidade (afiliado):** imagem de anúncio de terceiro pode ser render 3D/IA. Exigir conferência com fotos reais de compradores (avaliações) antes de gerar; divergência relevante → bloquear (não anunciar o que o produto não é).
- **`tipo_imagem_entrada = lifestyle`:** marcar `ambiente_ja_resolvido: true` e oferecer rota barata primeiro: animar a própria imagem (Ken Burns + texto) em vez de gerar cenários novos.
- Persistir em tabela D1 `anuncio_produtos` (migration nova).

## 1.5 MOTOR DE REGRAS DE AFILIAÇÃO (agnóstico de programa)

Requisito: o executor tem que funcionar para **qualquer** programa de afiliado (marketplace, infoproduto, SaaS, programa direto de marca, local). Nenhuma regra de plataforma vai hard-coded; tudo é dado.

**Hierarquia de regras (a mais específica vence, mas nunca afrouxa a regra legal):**
1. `regras_legais_categoria` — independe de programa (ex.: suplemento/cosmético/medicamento → claims regulados; apostas, financeiro, bebida alcoólica → restrições próprias de publicidade). Sempre aplicada.
2. `programas_afiliado` — termos gerais do programa.
3. `ofertas_afiliado` — regras de um vendedor/produtor/oferta específica dentro do programa (em plataformas de infoproduto, por exemplo, o produtor costuma definir se o afiliado pode anunciar e onde).
4. `proprio` = perfil sem restrição de programa (só regra legal).

**Schema da política (mesmo formato nos níveis 2 e 3, JSON validado com zod):**
```
trafego_pago:        { permitido: sim|nao|condicional|desconhecido, canais_permitidos[], canais_proibidos[] }
uso_marca:           { nome_no_perfil, logo, bidding_em_marca }
uso_imagens:         { imagens_do_anuncio: sim|nao|desconhecido, criativo_gerado_por_ia: sim|nao|desconhecido }
canais_organicos:    { proibidos[] }          # ex.: grupos de WhatsApp, spam, páginas oficiais da marca
divulgacao_obrigatoria: texto_minimo
cupons:              { permitido, apenas_oficiais }
claims_restritos[]
comissao:            { tipo, valor, janela_cookie_dias }   # informativo
fonte:               { url_ou_texto, trecho_citado, verificado_em, verificado_por }
```

**Regra de ouro:** campo `desconhecido` = tratado como **mais restritivo**. Política com `verificado_em` > 90 dias → reverificação antes de liberar `paid_ad`.

**Fluxo de cadastro de programa/oferta novo:**
1. Usuário cola o link ou o texto dos termos do programa (ou da página da oferta).
2. LLM extrai para o schema acima, citando o trecho exato de cada campo preenchido; o que não estiver nos termos fica `desconhecido` (proibido inventar).
3. Humano revisa e confirma campo a campo → só então a política fica `ativa`.
4. Seeds iniciais (Shopee, Mercado Livre, Amazon, TikTok Shop, plataformas de infoproduto) entram como `rascunho`, com todos os campos não confirmados em `desconhecido` — viram `ativa` só depois do fluxo acima.

**Saída do motor para o resto do pipeline:** `perfis_saida_permitidos[]` (`paid_ad`, `affiliate_organic`, …), `canais_permitidos[]`, `texto_divulgacao`, `claims_bloqueados[]`, `motivo` legível (exibido ao usuário). Etapas 2–5 só leem essa saída.

## 2. ETAPA 2 — Roteiros (rota `/api/anuncio/roteiros`)

**Input:** `ProductAnalysis` + `objetivo` (CONVERSAO | CONSIDERACAO | RECONHECIMENTO) + `duracoes` (padrão `[15, 30, 60]`).

**Output:** 5 variações, cada uma com hook `{texto, visual, audio}`, problema, valor `{texto, bullets[]}`, prova, CTA, legenda (≤150 chars), hashtags por plataforma (TikTok ≤5, Instagram ≤30, YouTube ≤3), e **lista de cenas** com `duracao_s` somando exatamente a duração alvo.

**Regras:**
- Cada variação usa um ângulo de hook diferente: pergunta, afirmação, história, estatística, comando.
- PT-BR coloquial; proibidos clichês ("descubra o segredo", "você não vai acreditar").
- Nunca inventar prova social, número ou depoimento (Princípio da Realidade). Sem dado real → prova vira demonstração de uso.
- Mestre longo + cortes: 60s é hipótese, não regra. Sempre gerar versões 15s e 30s.
- Cada cena traz `prompt_visual` pronto para o motor de imagem/vídeo (ver §3).
- Persistir em `anuncio_roteiros`.

## 3. ETAPA 3 — Agendador de Créditos Gratuitos (modo assistido)

Objetivo: produzir os fragmentos de vídeo de uma peça ao longo de vários dias, usando cotas diárias gratuitas, **sem API paga**.

**Fatos de plataforma que moldam o design (verificados em 05/10/2026, rever periodicamente):**
- Leonardo free: 150 tokens/dia, sem acúmulo; gerações públicas; Leonardo é dono dos assets; vídeo só em alguns modelos, **sem upload de imagem própria como start frame** e com marca d'água.
- API do Leonardo é cobrança separada (PAYG), sem acesso aos tokens diários do app web.
- Consequência: cota gratuita web **não serve para anúncio de produto de cliente** (produto não pode ser start frame, sai público e com marca d'água). Serve para B-roll, cenas sem o produto, conteúdo próprio/dark channel.

**Implementar:**
- Tabela D1 `fila_fragmentos`: `peca_id`, `cena_id`, `prompt`, `motor_sugerido`, `elegivel_free` (bool), `status` (pendente|gerado|aprovado|falhou), `asset_url`, `gerado_em`, `motor_usado`.
- Tabela D1 `motores_cota`: `motor`, `cota_diaria_estimada`, `custo_estimado_por_fragmento`, `restricoes` (JSON: `start_frame_upload`, `marca_dagua`, `publico`, `propriedade_assets`), `reset_utc`.
- Classificador de cena: cena **com o produto** → `elegivel_free: false` (vai para geração de imagem por referência via `gpt-image-1` + animação Ken Burns no FFmpeg, ou fila paga futura). Cena **sem o produto** → `elegivel_free: true`.
- Rota `/admin/fila-diaria`: mostra, para hoje, quais fragmentos cabem na cota de cada motor; botão "copiar prompt"; campo para colar URL/subir o arquivo gerado; aprovação humana por fragmento.
- Peça só vai para montagem quando 100% dos fragmentos estão `aprovado`.
- **Proibido:** automatizar login no app web, criar múltiplas contas para multiplicar cota, ou contornar marca d'água.

## 4. MONTAGEM (fora do Worker)

Reaproveitar o contrato JSON do Video Editor Agent da CRF e o executor FFmpeg existente. Adicionar:
- Dois novos `output_profile` (além de `campaign_clip` e `rewards_native` do CRF-SPEC-001):
  - `paid_ad` — anúncio pago; só se `modelo_venda = proprio` ou programa de afiliado com `trafego_pago_permitido = true`.
  - `affiliate_organic` — post orgânico com link/cesta de afiliado (Reels, TikTok, Shorts, influenciadora IA); divulgação "#publi / link de afiliado" obrigatória.
  - Nenhum dos dois é elegível a Creator Rewards.
- Safe zones por plataforma (TikTok topo 130/fundo 480; Reels 180/420; Shorts 150/320; Stories 250/350) — valores a confirmar nas specs oficiais antes de usar em produção.
- Enquanto não há VPS: script local (Carlos roda na própria máquina) que baixa os fragmentos aprovados e monta.

## 5. EXPORTAÇÃO

- Só quando o gate de canal permitir anúncio pago: JSON da campanha + CSV. Caso contrário, exportar pacote orgânico (vídeos + legendas + hashtags + link de afiliado). **Antes de gerar o CSV, buscar o template oficial de bulk upload do TikTok Ads Manager** — não inventar colunas.
- Sem publicação via API (Marketing API do TikTok exige verificação de negócio). O cliente sobe manualmente.

## 6. ENTREGÁVEIS POR ETAPA

Para cada etapa: migration D1, rota, tipos zod em `packages/shared`, testes (Vitest) com mocks do Gateway, CI verde, commit descritivo, e uma nota em `docs/` com custo estimado por execução.

## 7. ORDEM

Etapa 1 → Etapa 2 → Etapa 3 (fila + painel) → Montagem. Pare ao fim de cada etapa e mostre input → output real antes de seguir. Em ambiguidade, pergunte.
