// AUTOSETUP — apps/core/web/src/lib/gerarParecer.ts
// Preenche as "lacunas" entre o diagnóstico real do cliente e as
// anotações do vendedor sobre ele, e devolve UM parecer de prioridade
// — o mesmo tipo de coisa que Claude faz com Carlos quando aponta que
// "CNPJ é o bloqueio real" em vez de listar 10 pendências soltas.
// Fonte: pedido de Carlos (11/08/2026).
//
// REGRA DE HONESTIDADE: só usa o que está de fato no diagnóstico
// salvo e nas anotações do vendedor — nunca infere problema que
// nenhum dos dois mencionou.

import { completeViaGateway } from "@autosetup/adapter-llm";

export interface DadosParecer {
  nomeNegocio: string;
  nicho: string;
  maiorDificuldade: string;
  diagnosticoResumo: string;
  notasVendedor?: string;
}

export interface Parecer {
  prioridade: string;
  porQue: string;
  mensagemPronta: string;
}

function montarPrompt(dados: DadosParecer): string {
  return `Você é um consultor experiente que já viu o diagnóstico de negócio de "${dados.nomeNegocio}" (nicho: ${dados.nicho}) e agora tem também as anotações reais de quem está acompanhando esse cliente de perto.

DIAGNÓSTICO JÁ GERADO (resumo real, salvo no sistema):
"${dados.diagnosticoResumo}"

MAIOR DIFICULDADE QUE O PRÓPRIO DONO RELATOU:
"${dados.maiorDificuldade}"

${dados.notasVendedor ? `ANOTAÇÕES REAIS DE QUEM ESTÁ ACOMPANHANDO ESSE CLIENTE:\n"${dados.notasVendedor}"` : "Nenhuma anotação adicional do vendedor sobre esse cliente ainda."}

TAREFA: cruze essas duas fontes (o diagnóstico e as anotações) e identifique UMA ÚNICA prioridade — a coisa mais urgente que esse negócio precisa resolver agora, não uma lista. Pense como alguém dizendo pra um amigo "olha, de tudo que vi, isso aqui é o que mais importa resolver primeiro" — direto, sem rodeio.

REGRA INEGOCIÁVEL: só use o que está de fato escrito no diagnóstico e nas anotações acima. Nunca invente um problema que nenhum dos dois mencionou.

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "prioridade": "a UMA prioridade, em poucas palavras",
  "porQue": "1-2 frases explicando por que essa é a prioridade real, citando o que embasa isso (diagnóstico e/ou anotação)",
  "mensagemPronta": "uma mensagem curta, pronta pra mandar pro cliente por WhatsApp, terminando perguntando se ele quer resolver isso agora"
}`;
}

export async function gerarParecer(dados: DadosParecer): Promise<Parecer> {
  const resultado = await completeViaGateway(montarPrompt(dados));

  let parsed: unknown;
  try {
    parsed = JSON.parse(resultado.text);
  } catch {
    throw new Error("O modelo não retornou JSON válido.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Formato de resposta inesperado.");
  }

  const p = parsed as Partial<Parecer>;
  return {
    prioridade: p.prioridade ?? "",
    porQue: p.porQue ?? "",
    mensagemPronta: p.mensagemPronta ?? "",
  };
}
