// AUTOSETUP — apps/core/web/src/lib/diagnostico.ts
//
// Motor de Diagnóstico (LENS). Fonte arquitetural: LENS (Core), Constitutional
// Principle #24-25 (Honestidade em Demonstrações / Princípio da Realidade).
//
// REGRA INEGOCIÁVEL: o diagnóstico é gerado só a partir dos dados que a
// PRÓPRIA PESSOA informa no formulário. Nunca inventamos avaliações,
// nunca afirmamos "encontramos X seguidores" sem o dado ter vindo do
// usuário. O prompt abaixo instrui o modelo explicitamente a não
// inventar fatos — e o parser rejeita resposta se o modelo tentar.

import { completeViaGateway } from "@autosetup/adapter-llm";

export interface DiagnosticoInput {
  nomeNegocio: string;
  cidade: string;
  nicho: string;
  temSite: boolean;
  temInstagram: boolean;
  temGoogleBusiness: boolean;
  numeroAvaliacoesGoogle: number | null;
  notaMediaGoogle: number | null;
  maiorDificuldade: string;
  /** Perguntas mais profundas — opcionais, texto digitado OU transcrito
   * de áudio (a pessoa pode ter respondido por voz). Pedido de Carlos:
   * revelar dores reais do dia a dia, não só presença digital. */
  rotinaDiaria?: string;
  oQueAtrapalha?: string;
  sobrecarga?: string;
  /** Pedido de Carlos (28/07/2026): visão do dono sobre como o negócio
   * está indo hoje, e a meta de ganhos/estrutura quando "plenamente
   * desenvolvido" — dá pra medir a distância entre onde está e onde
   * quer chegar, o que é o que realmente vende. */
  visaoNegocio?: string;
  metaFinanceira?: string;
  /** Sugeridos por análise externa, incorporados após avaliação
   * (28/07/2026): tamanho real da operação, canais de atendimento,
   * ferramentas já usadas, e a dor financeira concreta (perda de
   * vendas por demora/desorganização) — evita a IA sugerir solução
   * desproporcional ao tamanho real do negócio. */
  tamanhoEquipe?: string;
  canaisAtendimento?: string;
  ferramentasAtuais?: string;
  perdaFinanceira?: string;
  /** Opcionais — se informados, habilitam a pesquisa real na web (ver
   * gerarDiagnosticoComPesquisa). Nunca obrigatórios. */
  linkInstagram?: string;
  linkGoogleBusiness?: string;
  /** Perguntas geradas dinamicamente a partir do nicho informado (ver
   * /api/perguntas-nicho), respondidas pela pessoa. Medem envolvimento
   * real com o "estado da arte" do nicho — física e digitalmente —
   * não presença digital genérica (isso já é coberto em outro lugar). */
  perguntasNicho?: { pergunta: string; resposta: string }[];
}

export interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  /** O que a PESQUISA REAL encontrou na web — sempre separado do que o
   * dono informou, nunca misturado. Vazio se a pesquisa não achou nada
   * verificável, e o resultado diz isso explicitamente, não inventa. */
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
  /** Só preenchido se visaoNegocio e/ou metaFinanceira foram informados
   * — a distância entre "onde está" e "onde quer chegar", em texto. */
  distanciaAteAMeta?: string;
  /** Plano de 7 dias — sempre gerado, ação concreta por dia, calibrada
   * aos dados reais respondidos (nicho, dificuldade, canais, ferramentas).
   * "conteudoSugerido" só aparece nos dias que envolvem post/conteúdo —
   * é roteiro/legenda em TEXTO, nunca uma imagem pronta (isso é serviço
   * pago, mediado por humano — ver PainelServicoPago no front). */
  planoSeteDias: { dia: number; acao: string; conteudoSugerido?: string }[];
  /** Comparação real com concorrentes — só preenchido no fluxo com
   * pesquisa (precisa de web_search real). Nunca inventa concorrente
   * ou dado que não veio de busca de verdade. */
  comparacaoConcorrentes?: {
    concorrentes: { nome: string; destaque: string }[];
    posicionamento: string;
  } | null;
  /** Qual provider/modo respondeu de verdade — observabilidade real,
   * não é exibido ao prospect, mas fica no log. */
  geradoPor: string;
}

function linhasContextoProfundo(input: DiagnosticoInput): string {
  return [
    input.rotinaDiaria ? `- Como é a rotina/dia a dia (relato do dono): "${input.rotinaDiaria}"` : null,
    input.oQueAtrapalha ? `- O que atrapalha o bom fluxo do dia (relato do dono): "${input.oQueAtrapalha}"` : null,
    input.sobrecarga
      ? `- O que sobrecarrega / o que faz pensar que precisa de mais uma pessoa ajudando (relato do dono): "${input.sobrecarga}"`
      : null,
    input.visaoNegocio
      ? `- Visão do dono sobre como o negócio está indo hoje / satisfação com os rendimentos: "${input.visaoNegocio}"`
      : null,
    input.metaFinanceira
      ? `- Meta de ganhos/estrutura quando o negócio estiver plenamente desenvolvido (relato do dono): "${input.metaFinanceira}"`
      : null,
    input.tamanhoEquipe ? `- Tamanho da equipe / volume de atendimento (relato do dono): "${input.tamanhoEquipe}"` : null,
    input.canaisAtendimento
      ? `- Canais por onde os clientes chegam hoje (relato do dono): "${input.canaisAtendimento}"`
      : null,
    input.ferramentasAtuais
      ? `- Ferramentas/sistemas que já usa hoje (relato do dono): "${input.ferramentasAtuais}"`
      : null,
    input.perdaFinanceira
      ? `- Sente que perde vendas/clientes por demora ou desorganização (relato do dono): "${input.perdaFinanceira}"`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function linhasPerguntasNicho(input: DiagnosticoInput): string {
  if (!input.perguntasNicho || input.perguntasNicho.length === 0) return "";
  return input.perguntasNicho
    .map((qa) => `- Pergunta específica do nicho "${qa.pergunta}" → resposta do dono: "${qa.resposta}"`)
    .join("\n");
}

function montarPrompt(input: DiagnosticoInput): string {
  return `Você é um consultor de presença digital analisando UM negócio real, a partir SOMENTE dos dados que o dono informou abaixo. Nunca invente números, avaliações, seguidores ou fatos que não estejam listados aqui. Se um dado não foi informado, não presuma nada sobre ele — apenas não o mencione ou diga explicitamente "não informado".

DADOS REAIS INFORMADOS PELO DONO DO NEGÓCIO:
- Nome do negócio: ${input.nomeNegocio}
- Cidade: ${input.cidade}
- Nicho: ${input.nicho}
- Tem site próprio: ${input.temSite ? "sim" : "não"}
- Tem Instagram ativo: ${input.temInstagram ? "sim" : "não"}
- Tem perfil no Google Business: ${input.temGoogleBusiness ? "sim" : "não"}
- Número de avaliações no Google: ${input.numeroAvaliacoesGoogle ?? "não informado"}
- Nota média no Google: ${input.notaMediaGoogle ?? "não informado"}
- Maior dificuldade relatada pelo dono: "${input.maiorDificuldade}"
${linhasContextoProfundo(input) ? "\n" + linhasContextoProfundo(input) + "\n" : ""}
${linhasPerguntasNicho(input) ? "\nEnvolvimento com o estado da arte do nicho:\n" + linhasPerguntasNicho(input) + "\n" : ""}
Se houver "envolvimento com o estado da arte do nicho" acima, use isso pra avaliar o quanto essa pessoa está atualizada/imersa no próprio mercado — se o envolvimento for baixo, uma oportunidade real é aumentar presença nos círculos do nicho (eventos, comunidades, referências); se for alto, uma oportunidade é transformar essa autoridade real em conteúdo/prova social, já que ela existe mas pode não estar sendo comunicada.

Se houver relatos de rotina/dificuldade/sobrecarga acima, use-os como fonte PRINCIPAL para identificar dores reais — eles revelam mais sobre o negócio do que presença digital sozinha. Preste atenção a sinais de sobrecarga, gargalos e processos manuais que aparecem nesses relatos. Se houver "tamanho da equipe" informado, calibre as oportunidades sugeridas ao tamanho real do negócio — nunca sugira solução desproporcional (ex: não recomende automação complexa de nível empresarial pra quem trabalha sozinho).

Se houver "visão do negócio hoje" e/ou "meta de ganhos/estrutura" acima, calcule a distância entre os dois em uma frase honesta (nunca prometendo que vai bater a meta) e preencha "distanciaAteAMeta". Se nenhum dos dois foi informado, retorne "distanciaAteAMeta": null.

Monte também um PLANO DE 7 DIAS, com uma ação concreta por dia, calibrada
especificamente aos dados que essa pessoa informou (nicho, dificuldade,
canais que já usa, ferramentas, o que sobrecarrega) — nunca genérico tipo
"poste mais nas redes". Pelo menos 2 dos 7 dias devem envolver produção de
conteúdo (post ou carrossel); nesses dias, preencha "conteudoSugerido" com
um roteiro em TEXTO (tema + ideia de legenda, 2-3 frases) — nunca uma
imagem, isso não existe neste fluxo. Nos outros dias, "conteudoSugerido"
fica ausente/null. Nunca prometa resultado numérico garantido em nenhum
dia do plano.

Responda ESTRITAMENTE em JSON válido, sem markdown, no formato:
{
  "resumo": "1-2 frases resumindo a situação atual, só com base no que foi informado",
  "pontosFavoraveis": ["1 a 3 pontos reais e específicos, baseados só nos dados acima"],
  "achadosNaPesquisa": [],
  "oportunidades": ["2 a 3 oportunidades concretas de melhoria de presença digital, específicas para o nicho e a dificuldade relatada — não genéricas"],
  "proximoPasso": "uma ação prática e específica que o dono poderia tomar essa semana",
  "distanciaAteAMeta": null,
  "planoSeteDias": [
    { "dia": 1, "acao": "...", "conteudoSugerido": null },
    { "dia": 2, "acao": "...", "conteudoSugerido": null },
    { "dia": 3, "acao": "...", "conteudoSugerido": null },
    { "dia": 4, "acao": "...", "conteudoSugerido": null },
    { "dia": 5, "acao": "...", "conteudoSugerido": null },
    { "dia": 6, "acao": "...", "conteudoSugerido": null },
    { "dia": 7, "acao": "...", "conteudoSugerido": null }
  ]
}

Tom: parceiro e direto, nunca genérico, nunca prometendo resultado garantido (ex: nunca diga "vai triplicar suas vendas" — diga algo como "pode aumentar a chance de conversão de quem já busca por você").

SEJA SUCINTO: frases curtas, sem floreio, sem repetir a mesma ideia de forma diferente. Cada frase precisa carregar informação nova.

UNIÃO/PARCERIA: em pelo menos um ponto do texto (no resumo ou no próximo passo, onde soar natural), mencione o nome do negócio "${input.nomeNegocio}" junto com "AutoSetup" na mesma frase — reforça a sensação de time, de estar junto, não de robô falando sozinho. Só quando soar natural, nunca forçado.

INTENÇÃO DE COPY DE VENDAS (sem perder honestidade): sempre que fizer sentido, conecte um achado a como o AutoSetup resolveria aquilo especificamente — não como propaganda genérica ("nossa solução é incrível"), mas mostrando o caminho concreto (ex: "isso é exatamente o tipo de gargalo que some quando alguém organiza esse fluxo pra você"). NUNCA invente urgência falsa, número fabricado, ou prova social que não existe — isso quebra a confiança e derruba a venda em vez de ajudar.`;
}

function montarPromptComPesquisa(input: DiagnosticoInput): string {
  const linhasLinks = [
    input.linkInstagram ? `- Instagram informado pelo dono: ${input.linkInstagram}` : null,
    input.linkGoogleBusiness ? `- Google Business/Maps informado pelo dono: ${input.linkGoogleBusiness}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você é um consultor de presença digital com acesso a busca real na web. Analise UM negócio real.

DADOS INFORMADOS PELO DONO DO NEGÓCIO (trate como ponto de partida, não como verdade absoluta):
- Nome do negócio: ${input.nomeNegocio}
- Cidade: ${input.cidade}
- Nicho: ${input.nicho}
- Tem site próprio: ${input.temSite ? "sim" : "não"}
- Tem Instagram ativo: ${input.temInstagram ? "sim" : "não"}
- Tem perfil no Google Business: ${input.temGoogleBusiness ? "sim" : "não"}
- Número de avaliações no Google (segundo o dono): ${input.numeroAvaliacoesGoogle ?? "não informado"}
- Nota média no Google (segundo o dono): ${input.notaMediaGoogle ?? "não informado"}
- Maior dificuldade relatada pelo dono: "${input.maiorDificuldade}"
${linhasContextoProfundo(input) ? "\n" + linhasContextoProfundo(input) : ""}
${linhasPerguntasNicho(input) ? "\nEnvolvimento com o estado da arte do nicho:\n" + linhasPerguntasNicho(input) : ""}
${linhasLinks ? "\n" + linhasLinks : ""}

Se houver "envolvimento com o estado da arte do nicho" acima, use isso pra avaliar se a pessoa está atualizada/imersa no próprio mercado, e calibre oportunidades a partir disso.

Se houver relatos de rotina/dificuldade/sobrecarga acima, priorize-os para identificar dores reais — eles revelam mais que presença digital sozinha. Se houver "tamanho da equipe" informado, calibre as oportunidades sugeridas ao tamanho real do negócio — nunca sugira solução desproporcional (ex: não recomende automação complexa de nível empresarial pra quem trabalha sozinho).

TAREFA:
1. Pesquise na web pelo nome "${input.nomeNegocio}" em "${input.cidade}" — e pelos links informados acima, se houver — para encontrar presença real (Google Business, Instagram, site, avaliações, reclamações públicas).
2. Pesquise também tendências gerais do nicho "${input.nicho}" (o que negócios desse tipo costumam precisar para atrair mais clientes hoje).
3. Pesquise e identifique até 2 concorrentes REAIS do mesmo nicho "${input.nicho}" na cidade "${input.cidade}" (ou região próxima, se a cidade for pequena) — negócios que você de fato encontrou na busca, com sinais reais (nº de avaliações, nota, presença digital). Compare a posição do negócio analisado com eles: onde está mais preparado, onde está atrás. Seja honesto e específico (ex: "seu concorrente X tem 80 avaliações no Google contra as suas 12 — isso é o que mais pesa hoje na hora de alguém escolher"). Preencha "comparacaoConcorrentes".
4. Compare o que você encontrou com o que o dono informou. Se baterem, reforce isso. Se divergirem (ex: dono disse que não tem Google Business mas você achou um perfil, ou o inverso), diga isso claramente — é informação valiosa pra venda.

REGRA INEGOCIÁVEL PRA CONCORRENTES: só inclua concorrentes que você realmente encontrou na busca, com nome e sinal real (não invente nome de empresa nem número). Se não encontrar 2 concorrentes claros com presença digital forte, retorne "comparacaoConcorrentes": null e mencione a falta de concorrência digital forte como um achado em "achadosNaPesquisa" (pode ser uma oportunidade: pouca concorrência online = espaço pra dominar).

REGRA INEGOCIÁVEL: tudo em "achadosNaPesquisa" precisa vir de uma busca real que você de fato fez — nunca invente um número ou avaliação que não veio da pesquisa. Se a pesquisa não encontrar nada verificável sobre o negócio específico, "achadosNaPesquisa" deve conter uma única entrada dizendo isso explicitamente (ex: "Não foi possível confirmar presença online própria com o nome informado — comum para negócios locais pequenos"), nunca fique em branco silenciosamente nem invente um achado para preencher.

Se houver "visão do negócio hoje" e/ou "meta de ganhos/estrutura" acima, calcule a distância entre os dois em uma frase honesta (nunca prometendo que vai bater a meta) e preencha "distanciaAteAMeta". Se nenhum dos dois foi informado, retorne "distanciaAteAMeta": null.

Monte também um PLANO DE 7 DIAS, com uma ação concreta por dia, calibrada
especificamente aos dados que essa pessoa informou (nicho, dificuldade,
canais que já usa, ferramentas, o que sobrecarrega) — nunca genérico tipo
"poste mais nas redes". Pelo menos 2 dos 7 dias devem envolver produção de
conteúdo (post ou carrossel); nesses dias, preencha "conteudoSugerido" com
um roteiro em TEXTO (tema + ideia de legenda, 2-3 frases) — nunca uma
imagem, isso não existe neste fluxo. Nos outros dias, "conteudoSugerido"
fica ausente/null. Nunca prometa resultado numérico garantido em nenhum
dia do plano.

Responda ESTRITAMENTE em JSON válido, sem markdown, no formato:
{
  "resumo": "1-2 frases sobre a situação atual, combinando o que foi informado com o que a pesquisa confirmou",
  "pontosFavoraveis": ["1 a 3 pontos reais, baseados no que foi informado E/OU confirmado na pesquisa"],
  "achadosNaPesquisa": ["o que a pesquisa real encontrou, incluindo divergências com o que foi informado, se houver"],
  "oportunidades": ["2 a 3 oportunidades concretas, informadas pelas tendências reais do nicho que você pesquisou"],
  "proximoPasso": "uma ação prática e específica pra essa semana",
  "distanciaAteAMeta": null,
  "planoSeteDias": [
    { "dia": 1, "acao": "...", "conteudoSugerido": null },
    { "dia": 2, "acao": "...", "conteudoSugerido": null },
    { "dia": 3, "acao": "...", "conteudoSugerido": null },
    { "dia": 4, "acao": "...", "conteudoSugerido": null },
    { "dia": 5, "acao": "...", "conteudoSugerido": null },
    { "dia": 6, "acao": "...", "conteudoSugerido": null },
    { "dia": 7, "acao": "...", "conteudoSugerido": null }
  ],
  "comparacaoConcorrentes": {
    "concorrentes": [
      { "nome": "...", "destaque": "o que diferencia esse concorrente, com dado real da busca" }
    ],
    "posicionamento": "1-2 frases honestas sobre onde o negócio analisado está em relação a eles, e o que mais pesa pra melhorar essa posição"
  }
}

Tom: parceiro e direto, nunca genérico, nunca prometendo resultado garantido.

SEJA SUCINTO: frases curtas, sem floreio, sem repetir a mesma ideia de forma diferente.

UNIÃO/PARCERIA: em pelo menos um ponto do texto, mencione o nome do negócio "${input.nomeNegocio}" junto com "AutoSetup" na mesma frase — reforça sensação de time. Só quando soar natural.

INTENÇÃO DE COPY DE VENDAS (sem perder honestidade): conecte achados a como o AutoSetup resolveria aquilo especificamente, de forma concreta, nunca como propaganda genérica. NUNCA invente urgência falsa ou prova social inexistente.`;
}

export async function gerarDiagnostico(input: DiagnosticoInput): Promise<DiagnosticoResultado> {
  const gatewayResult = await completeViaGateway(montarPrompt(input));
  return parsearResultado(gatewayResult.text, gatewayResult.usedProvider);
}

/** Versão com pesquisa real na web — usa a Responses API da OpenAI
 * diretamente (não passa pelo Gateway multi-provider, porque o
 * web_search hospedado é uma capacidade específica da OpenAI, não algo
 * que generaliza pros outros providers do Gateway). Exige só
 * OPENAI_API_KEY, a mesma chave já configurada — nenhuma chave nova. */
export async function gerarDiagnosticoComPesquisa(
  input: DiagnosticoInput,
): Promise<DiagnosticoResultado> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada — pesquisa real precisa dela.");
  }

  const model = process.env.OPENAI_SEARCH_MODEL || "gpt-4o";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      tools: [{ type: "web_search" }],
      input: montarPromptComPesquisa(input),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Responses API retornou ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };

  const mensagem = data.output?.find((item) => item.type === "message");
  const parteTexto = mensagem?.content?.find((part) => part.type === "output_text");
  const raw = parteTexto?.text;

  if (!raw) {
    throw new Error("A Responses API não retornou texto de saída (resposta bruta indisponível).");
  }

  return parsearResultado(raw, `openai:${model}:web_search`);
}

function parsearResultado(raw: string, geradoPor: string): DiagnosticoResultado {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("O modelo não retornou JSON válido. Resposta bruta: " + raw.slice(0, 200));
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("resumo" in parsed) ||
    !("pontosFavoraveis" in parsed) ||
    !("oportunidades" in parsed) ||
    !("proximoPasso" in parsed)
  ) {
    throw new Error("JSON retornado não tem o formato esperado de DiagnosticoResultado.");
  }

  const p = parsed as Partial<DiagnosticoResultado>;
  return {
    resumo: p.resumo ?? "",
    pontosFavoraveis: p.pontosFavoraveis ?? [],
    achadosNaPesquisa: p.achadosNaPesquisa ?? [],
    oportunidades: p.oportunidades ?? [],
    proximoPasso: p.proximoPasso ?? "",
    distanciaAteAMeta: p.distanciaAteAMeta || undefined,
    planoSeteDias: Array.isArray(p.planoSeteDias) ? p.planoSeteDias : [],
    comparacaoConcorrentes: p.comparacaoConcorrentes ?? null,
    geradoPor,
  };
}
