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

import { getActiveLLMProvider } from "@autosetup/adapter-llm";

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
}

export interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  oportunidades: string[];
  proximoPasso: string;
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

Responda ESTRITAMENTE em JSON válido, sem markdown, no formato:
{
  "resumo": "1-2 frases resumindo a situação atual, só com base no que foi informado",
  "pontosFavoraveis": ["1 a 3 pontos reais e específicos, baseados só nos dados acima"],
  "oportunidades": ["2 a 3 oportunidades concretas de melhoria de presença digital, específicas para o nicho e a dificuldade relatada — não genéricas"],
  "proximoPasso": "uma ação prática e específica que o dono poderia tomar essa semana"
}

Tom: parceiro e direto, nunca genérico, nunca prometendo resultado garantido (ex: nunca diga "vai triplicar suas vendas" — diga algo como "pode aumentar a chance de conversão de quem já busca por você").`;
}

export async function gerarDiagnostico(input: DiagnosticoInput): Promise<DiagnosticoResultado> {
  const provider = getActiveLLMProvider();
  const raw = await provider.complete(montarPrompt(input));

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

  return parsed as DiagnosticoResultado;
}
