# AutoSetup — Fase 1: login, empresas, onboarding e painel

Cole este texto inteiro no Claude Code, dentro da pasta do `autosetup-monorepo`.

---

Você é o dev master do AutoSetup Digital. Objetivo desta fase: transformar o AutoSetup de um conjunto de páginas soltas num SaaS de verdade, em que o dono de um pequeno negócio faz login, cadastra a empresa e passa a ter um painel próprio que trabalha por ele.

## Regra zero: ler antes de construir

Antes de escrever qualquer código, audite o repositório e me entregue um relatório curto com:

1. A lista de rotas que existem hoje em `apps/core/web` (públicas e `/admin/*`).
2. Todas as tabelas do D1 `autosetup-leads` e as migrations existentes.
3. Como o código acessa o D1 hoje (binding, helper, adapter).
4. Como as páginas `/admin/*` são protegidas hoje.
5. Onde está a função que gera o diagnóstico do LENS e o helper que normaliza WhatsApp (comparação pelos últimos 11 dígitos).

Reaproveite tudo o que já existe. Não reescreva o diagnóstico, o checkout do Mercado Pago, o Radar nem o Meus Clientes. Nenhuma rota pública atual pode quebrar.

## 1. Login

- Use o Better Auth, com as tabelas dele gravadas no mesmo D1.
- Comece com e-mail e senha. Deixe o link mágico por e-mail preparado, mas desligado até existir `RESEND_API_KEY`.
- A sessão vale para todas as rotas `/app/*`.
- Superadmin: os e-mails listados em `ADMIN_EMAILS` (variável de ambiente) têm acesso a `/admin/*`. Mantenha a proteção atual das páginas admin funcionando em paralelo até eu confirmar a troca.
- Secrets novos (`BETTER_AUTH_SECRET`, `ADMIN_EMAILS`) vão só no painel do Cloudflare. Nunca peça para eu colar segredo no chat. Me diga exatamente quais criar.

## 2. Tabelas novas (migration aditiva)

- `empresas`: id, nome, nicho, cidade, whatsapp, instagram_url, google_url, site_url, tema (ink, navy ou claro), plano, status (onboarding, ativa, pausada), lead_id de origem, criado_em.
- `empresa_membros`: empresa_id, user_id, papel (dono ou equipe).
- `atividades`: empresa_id, tipo, titulo, detalhe, criado_em. Alimenta o feed "o que o AutoSetup fez por você".
- Adicione `empresa_id` opcional (nullable) nas tabelas que já existem e que pertencem a um cliente: leads, pagamentos, e a fila de execução, se já existir. Não apague nem renomeie coluna nenhuma.
- Teste a migration primeiro no D1 local. Só aplique no D1 de produção depois de me mostrar o resultado e eu aprovar.

## 3. Onboarding em uma tela: `/app/comecar`

- Campos: nome da empresa, nicho, cidade, WhatsApp, Instagram e Google (os dois opcionais). Aceite texto ou áudio, reaproveitando a gravação e a transcrição que o diagnóstico já usa.
- Ao salvar: cria a empresa, vincula o usuário como dono, procura um lead antigo pelo WhatsApp normalizado e vincula se achar, e dispara o diagnóstico do LENS que já existe.
- Enquanto o diagnóstico roda, a tela mostra o que está acontecendo em linguagem simples ("Procurando sua empresa no Google", "Comparando com 2 concorrentes da sua cidade"). Nunca uma tela vazia ou um spinner mudo.
- Cada etapa concluída vira uma linha em `atividades`.

## 4. Painel da empresa: `/app`

Público: dono de pequeno negócio, pouca familiaridade digital, usando o celular entre um atendimento e outro. Desenhe para o celular primeiro.

Estrutura, de cima para baixo:

1. **Próxima ação.** Um único card principal dizendo o que fazer agora, com um botão. Exemplo: "Seu diagnóstico está pronto. Ver o que encontramos."
2. **O que o AutoSetup fez por você.** Feed vindo de `atividades`, com hora relativa.
3. **Resultados em linguagem de dono.** Nota no Google, número de avaliações e variação desde o cadastro. Usar o Google Places que já está integrado. Se a chave não estiver configurada, mostrar o que fazer em vez de quebrar.
4. **Áreas do negócio:** Diagnóstico e plano de 7 dias, Posts da semana, Site, Medalha, Vídeo de boas-vindas, Assinatura. As que ainda não estão prontas aparecem com um texto honesto ("Chega na próxima etapa"), nunca com dado inventado.

Textos: voz ativa, frases simples, o nome da pessoa e da empresa sempre que fizer sentido. Erros dizem o que aconteceu e como resolver.

## 5. Sistema de temas

Implemente com tokens CSS em `:root` e `[data-theme]` no `<html>`. A escolha é salva na empresa e pode ser trocada em `/app/aparencia`.

| Token | Ink (padrão) | Navy | Claro |
|---|---|---|---|
| fundo | #16140f | #0f1b2d | #f6f7f8 |
| superfície | #1f1c16 | #16263d | #ffffff |
| texto | #f2efe8 | #eef2f7 | #16140f |
| texto secundário | #a39d90 | #9fb0c6 | #5c5a55 |
| destaque (brass) | #b8863b | #c99a45 | #9a6f2c |
| conquista (gold) | #d9a84e | #e0b45c | #b8863b |
| sucesso (forest) | #3f6b55 | #3f7a5f | #2f4f3e |

Regras de design:

- O dourado é escasso. Ele aparece só no botão principal e em conquistas (medalha, nota subindo, mês completo). Nunca como decoração.
- Tipografia: mantenha Fraunces só nos títulos grandes e Public Sans em toda a interface, ambas já instaladas via @fontsource. Números com algarismos tabulares.
- Hierarquia real: o card de próxima ação é visivelmente diferente dos demais. Não use o mesmo card, a mesma sombra e o mesmo raio para tudo.
- Evite rótulos em caixa alta, setas "→" penduradas no texto dos botões e animação de entrada em cada seção. Um único momento de movimento: quando uma conquista aparece.
- Contraste acessível nos três temas, foco de teclado visível, respeitar `prefers-reduced-motion`.
- Visual de dashboard de tecnologia e negócio. Nada de pergaminho, creme ou terracota.

## 6. Painel do superadmin: `/admin/empresas`

Lista de todas as empresas com status, plano, data de cadastro e última atividade, com link para abrir o painel de cada uma em modo leitura. Linkar a partir das páginas admin que já existem.

## 7. Empresa número 1

Crie a AutoSetup Digital como primeira empresa, com o meu usuário como dono. Ela é o caso de demonstração real que vai aparecer nos vídeos.

## 8. Entrega

- Rodar install, typecheck e lint sem erros.
- Testar o fluxo completo no local: criar conta, cadastrar empresa, gerar diagnóstico, ver o painel, trocar de tema.
- Não fazer deploy nem migration em produção sem a minha aprovação.
- No fim, me entregue: o que foi feito, o que eu preciso configurar no Cloudflare (com os nomes exatos), o que ficou pendente e qual é a Fase 2 recomendada.

Fase 2 prevista (não fazer agora): site premium vinculado à empresa, posts da semana no painel, assinatura do Mercado Pago ligada à empresa, vídeo de boas-vindas da Valentina com o nome do cliente na tela.
