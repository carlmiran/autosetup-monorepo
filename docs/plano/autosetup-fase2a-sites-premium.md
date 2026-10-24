# AutoSetup — Fase 2A: sites premium (3 opções por nicho)

Cole no Claude Code dentro do `autosetup-monorepo`, depois que a Fase 1 (login, empresas, painel) estiver concluída.

---

Você é o dev master do AutoSetup Digital. Os sites gerados até agora foram reprovados pelo dono do produto: simples demais, "premium" só no nome. Esta fase substitui o gerador de Site-Prova por um sistema de sites no nível das melhores referências do mundo em cada nicho. O padrão é: o dono do negócio abre a prévia e sente que o negócio dele parece maior do que é.

## Regra zero

Antes de construir, audite e me reporte: onde está o gerador atual de Site-Prova, como ele recebe os dados, onde a prévia é hospedada, como a medalha e as avaliações do Google são obtidas hoje. Reaproveite a integração com Google Places e a tabela `empresas` da Fase 1. Não quebre nenhuma prévia já enviada a prospects.

## Referências de nível (estudar, nunca copiar layout ou código)

- Barbearia: Barber & Co (Miami), Imperium Barbershop (Toronto), Heritage Barbershop (Portland).
- Oficina: The Electrified Garage, Miller Auto Repair.
- Odontologia e clínicas: Camden Dental Centre, Beehive Dental, Zen Dental Studio.
- Galeria por nicho para consulta contínua: zarla.com/inspiration (barber, auto-repair e outros).

## As 3 direções de design

Todo nicho recebe as três. O prospect vê as três prévias e escolhe.

**A. Editorial Noturno** (inspiração: Barber & Co, Camden Dental)
Fundo escuro, fotografia em tela cheia como protagonista, títulos grandes em serifa de alto contraste, muito espaço, quase nenhum ornamento. Sensação: marca de moda ou serviço de luxo.
Tipografia: Bodoni Moda nos títulos, Manrope no texto.

**B. Referência Local** (inspiração: Imperium, Heritage)
O orgulho da cidade como identidade. Selo ou brasão do negócio, a cidade no título ("A barbearia mais bem avaliada de Poços de Caldas"), a medalha AutoSetup em destaque, tom quente e tradicional sem ser antiquado.
Tipografia: Fraunces nos títulos, Public Sans no texto (já instaladas).

**C. Clareza Técnica** (inspiração: Electrified Garage, Zen Dental)
Fundo claro, grade organizada, informação precisa: serviços com prazo e faixa de preço quando o cliente informar, processo em etapas, números reais em destaque. Sensação: competência e calma.
Tipografia: IBM Plex Sans no texto, IBM Plex Mono só para dados numéricos.

Cada direção tem paleta própria ajustada por nicho (barbearia não usa a mesma cor que odontologia). Defina os tokens em CSS e me mostre a tabela de paletas antes de aplicar.

## Nichos da primeira leva

Barbearia, salão e estética, oficina mecânica, odontologia e clínicas de saúde, pousada, restaurante. Cada nicho tem: ordem de seções própria, textos próprios e a ação principal certa (agendar, pedir orçamento, reservar, ver cardápio).

## Regras obrigatórias em todos os sites

1. **Botão de WhatsApp ou agendamento visível em todas as telas**, fixo no celular.
2. **A cidade no título principal.**
3. **Avaliações reais do Google na página:** nota, número de avaliações e 3 trechos reais, com atribuição ao Google. Nunca inventar, editar ou resumir avaliação como se fosse fala do cliente. Sem avaliações, a seção não aparece.
4. **Medalha AutoSetup** só quando o critério real for atingido, com o critério visível ao clicar (ex.: nota mínima e número mínimo de avaliações).
5. **Fotos reais do negócio.** Na prévia, usar fotos do Google Places exibidas pela API com a atribuição exigida, sem baixar nem armazenar. No site contratado, usar fotos enviadas pelo cliente. Se não houver foto, usar composição tipográfica forte, nunca imagem de banco com pessoas genéricas.
6. **Um único botão principal por tela.**
7. Pensado primeiro para celular. Lighthouse acima de 90 no mobile em desempenho e acessibilidade.
8. SEO local: dados estruturados LocalBusiness (JSON-LD), título e descrição com nicho e cidade.
9. Hospedagem na Cloudflare, sem custo para o cliente, com rodapé discreto "Site e hospedagem por AutoSetup Digital".

## Prévia para prospect

- Rota `/prova/[slug]/[a|b|c]`, com `noindex`.
- Uma faixa discreta no topo: "Prévia criada pela AutoSetup para [nome da empresa]".
- Uma página `/prova/[slug]` que mostra as três opções lado a lado no celular, para o prospect escolher. A escolha fica registrada e vira uma atividade no painel.
- A prévia expira em 30 dias.
- No `/admin`, um botão "Gerar 3 prévias" a partir de uma empresa ou de um lead do Radar, e um botão "Copiar mensagem de WhatsApp" com o link.

## Qualidade antes de entregar

- Gerar as 3 direções para pelo menos 2 nichos com dados reais de negócios da região de Poços de Caldas.
- Tirar screenshots com Playwright (celular e desktop) de cada combinação e revisar você mesmo: hierarquia, contraste, espaçamento, se alguma tela parece template genérico. Corrigir o que não estiver no nível das referências.
- Evitar os vícios de site gerado por IA: rótulos em caixa alta acima de cada título, cards idênticos com a mesma sombra, seta "→" pendurada em botões, animação de entrada em todas as seções, fundo creme com detalhe terracota.
- Rodar typecheck e lint sem erros. Não fazer deploy sem a minha aprovação.

## Entrega

Me mande: os screenshots das combinações geradas, a tabela de paletas por direção e nicho, o que preciso configurar, e o que ficou pendente para os nichos restantes.
