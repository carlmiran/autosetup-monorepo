// AUTOSETUP — apps/core/web/src/lib/entrevistaRh.ts
// Motor de síntese da entrevista de alimentação do AutoSetup RH.
// Fonte: pedido de Carlos (29/07/2026) — a Kelly (cliente zero / futura
// especialista de domínio) responde perguntas abertas sobre RH, e a IA
// organiza isso num documento estruturado que alimenta a construção
// real do produto. Regra de honestidade: a síntese só pode conter o que
// ela de fato disse, reorganizado — nunca conhecimento de RH genérico
// inventado e atribuído a ela.

import { completeViaGateway } from "@autosetup/adapter-llm";

export interface EntrevistaRhInput {
  nome: string;
  formacao?: string;
  fascinaRh: string;
  processosMalResolvidos: string;
  ferramentaIdeal: string;
  processoContratacaoIdeal?: string;
  errosComuns?: string;
  termosImportantes?: string;
  nuncaAutomatizar?: string;
  orgulho?: string;
}

export interface EntrevistaRhResultado {
  resumoExecutivo: string;
  doresIdentificadas: string[];
  requisitosDeProduto: string[];
  vocabularioDeDominio: string[];
  limitesEticos: string[];
}

function montarPrompt(input: EntrevistaRhInput): string {
  const linhas = [
    `- O que fascina em RH: "${input.fascinaRh}"`,
    `- Processos de RH mal resolvidos em pequenas empresas: "${input.processosMalResolvidos}"`,
    `- Como seria a ferramenta ideal: "${input.ferramentaIdeal}"`,
    input.processoContratacaoIdeal ? `- Processo de contratação ideal: "${input.processoContratacaoIdeal}"` : null,
    input.errosComuns ? `- Erros comuns observados: "${input.errosComuns}"` : null,
    input.termosImportantes ? `- Termos/vocabulário importante: "${input.termosImportantes}"` : null,
    input.nuncaAutomatizar ? `- O que nunca deveria ser automatizado: "${input.nuncaAutomatizar}"` : null,
    input.orgulho ? `- O que traria orgulho de ter construído: "${input.orgulho}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você está organizando uma entrevista real com uma especialista de domínio (RH), feita para alimentar a construção de um produto de RH pra pequenas empresas (AutoSetup RH). NUNCA invente conhecimento de RH genérico e atribua a ela — use SÓ o que está nas respostas abaixo, reorganizado e clarificado.

NOME: ${input.nome}
${input.formacao ? `FORMAÇÃO: ${input.formacao}` : ""}

RESPOSTAS DELA:
${linhas}

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "resumoExecutivo": "2-3 frases resumindo a contribuição dela, no que ela realmente disse",
  "doresIdentificadas": ["dores/problemas reais que ela apontou, cada um específico"],
  "requisitosDeProduto": ["requisitos concretos de produto que dá pra derivar do que ela disse — não invente requisito que ela não sugeriu"],
  "vocabularioDeDominio": ["termos/conceitos de RH que ela mencionou como importantes"],
  "limitesEticos": ["coisas que ela disse que nunca deveriam ser automatizadas ou precisam de cuidado ético"]
}`;
}

export async function gerarSinteseEntrevista(
  input: EntrevistaRhInput,
): Promise<EntrevistaRhResultado> {
  const resultado = await completeViaGateway(montarPrompt(input));

  let parsed: unknown;
  try {
    parsed = JSON.parse(resultado.text);
  } catch {
    throw new Error("O modelo não retornou JSON válido.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Formato de resposta inesperado.");
  }

  const p = parsed as Partial<EntrevistaRhResultado>;
  return {
    resumoExecutivo: p.resumoExecutivo ?? "",
    doresIdentificadas: p.doresIdentificadas ?? [],
    requisitosDeProduto: p.requisitosDeProduto ?? [],
    vocabularioDeDominio: p.vocabularioDeDominio ?? [],
    limitesEticos: p.limitesEticos ?? [],
  };
}
