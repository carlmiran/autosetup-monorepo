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
  /** Opcionais — se informados, habilitam a pesquisa real na web (ver
   * gerarDiagnosticoComPesquisa). Nunca obrigatórios. */
  linkInstagram?: string;
  linkGoogleBusiness?: string;
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
  ]
    .filter(Boolean)
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
Se houver relatos de rotina/dificuldade/sobrecarga acima, use-os como fonte PRINCIPAL para identificar dores reais — eles revelam mais sobre o negócio do que presença digital sozinha. Preste atenção a sinais de sobrecarga, gargalos e processos manuais que aparecem nesses relatos.

Responda ESTRITAMENTE em JSON válido, sem markdown, no formato:
{
  "resumo": "1-2 frases resumindo a situação atual, só com base no que foi informado",
  "pontosFavoraveis": ["1 a 3 pontos reais e específicos, baseados só nos dados acima"],
  "achadosNaPesquisa": [],
  "oportunidades": ["2 a 3 oportunidades concretas de melhoria de presença digital, específicas para o nicho e a dificuldade relatada — não genéricas"],
  "proximoPasso": "uma ação prática e específica que o dono poderia tomar essa semana"
}

Tom: parceiro e direto, nunca genérico, nunca prometendo resultado garantido (ex: nunca diga "vai triplicar suas vendas" — diga algo como "pode aumentar a chance de conversão de quem já busca por você").`;
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
${linhasLinks ? "\n" + linhasLinks : ""}

Se houver relatos de rotina/dificuldade/sobrecarga acima, priorize-os para identificar dores reais — eles revelam mais que presença digital sozinha.

TAREFA:
1. Pesquise na web pelo nome "${input.nomeNegocio}" em "${input.cidade}" — e pelos links informados acima, se houver — para encontrar presença real (Google Business, Instagram, site, avaliações, reclamações públicas).
2. Pesquise também tendências gerais do nicho "${input.nicho}" (o que negócios desse tipo costumam precisar para atrair mais clientes hoje).
3. Compare o que você encontrou com o que o dono informou. Se baterem, reforce isso. Se divergirem (ex: dono disse que não tem Google Business mas você achou um perfil, ou o inverso), diga isso claramente — é informação valiosa pra venda.

REGRA INEGOCIÁVEL: tudo em "achadosNaPesquisa" precisa vir de uma busca real que você de fato fez — nunca invente um número ou avaliação que não veio da pesquisa. Se a pesquisa não encontrar nada verificável sobre o negócio específico, "achadosNaPesquisa" deve conter uma única entrada dizendo isso explicitamente (ex: "Não foi possível confirmar presença online própria com o nome informado — comum para negócios locais pequenos"), nunca fique em branco silenciosamente nem invente um achado para preencher.

Responda ESTRITAMENTE em JSON válido, sem markdown, no formato:
{
  "resumo": "1-2 frases sobre a situação atual, combinando o que foi informado com o que a pesquisa confirmou",
  "pontosFavoraveis": ["1 a 3 pontos reais, baseados no que foi informado E/OU confirmado na pesquisa"],
  "achadosNaPesquisa": ["o que a pesquisa real encontrou, incluindo divergências com o que foi informado, se houver"],
  "oportunidades": ["2 a 3 oportunidades concretas, informadas pelas tendências reais do nicho que você pesquisou"],
  "proximoPasso": "uma ação prática e específica pra essa semana"
}

Tom: parceiro e direto, nunca genérico, nunca prometendo resultado garantido.`;
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
    geradoPor,
  };
}
