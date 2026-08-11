// AUTOSETUP — apps/core/web/src/lib/gerarParecer.ts
// Preenche as "lacunas" entre o diagnóstico real do cliente e as
// anotações do vendedor sobre ele, e devolve uma SEQUÊNCIA de
// prioridades — a primeira é mostrada agora, as seguintes só aparecem
// depois que a anterior for marcada como resolvida de verdade. Mesmo
// tipo de coisa que Claude faz com Carlos ao apontar um bloqueio real
// de cada vez, não uma lista de 10 pendências soltas.
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

export interface ItemParecer {
  prioridade: string;
  porQue: string;
  oQueDestrava: string;
  mensagemPronta: string;
}

function montarPrompt(dados: DadosParecer): string {
  return `Você é um consultor experiente que já viu o diagnóstico de negócio de "${dados.nomeNegocio}" (nicho: ${dados.nicho}) e agora tem também as anotações reais de quem está acompanhando esse cliente de perto.

DIAGNÓSTICO JÁ GERADO (resumo real, salvo no sistema):
"${dados.diagnosticoResumo}"

MAIOR DIFICULDADE QUE O PRÓPRIO DONO RELATOU:
"${dados.maiorDificuldade}"

${dados.notasVendedor ? `ANOTAÇÕES REAIS DE QUEM ESTÁ ACOMPANHANDO ESSE CLIENTE:\n"${dados.notasVendedor}"` : "Nenhuma anotação adicional do vendedor sobre esse cliente ainda."}

TAREFA: cruze essas duas fontes (o diagnóstico e as anotações) e monte uma SEQUÊNCIA de até 3 prioridades, na ordem em que fazem sentido resolver — cada uma só faz sentido depois da anterior estar resolvida. Pense como alguém dizendo pra um amigo "primeiro resolve isso, porque sem isso o resto não adianta — depois disso resolvido, aí sim parte pro próximo".

REGRA INEGOCIÁVEL: só use o que está de fato escrito no diagnóstico e nas anotações acima. Nunca invente um problema que nenhum dos dois mencionou. Se só der pra identificar 1 ou 2 prioridades reais (não force uma terceira artificial), retorne só essas.

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "itens": [
    {
      "prioridade": "a prioridade desse passo, em poucas palavras",
      "porQue": "1-2 frases explicando por que essa é a prioridade real nesse momento, citando o que embasa isso",
      "oQueDestrava": "1 frase — o que fica possível/melhor no negócio assim que essa prioridade for resolvida de verdade",
      "mensagemPronta": "uma mensagem curta, pronta pra mandar pro cliente por WhatsApp, terminando perguntando se ele quer resolver isso agora"
    }
  ]
}`;
}

export async function gerarParecer(dados: DadosParecer): Promise<ItemParecer[]> {
  const resultado = await completeViaGateway(montarPrompt(dados));

  let parsed: unknown;
  try {
    parsed = JSON.parse(resultado.text);
  } catch {
    throw new Error("O modelo não retornou JSON válido.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("itens" in parsed) ||
    !Array.isArray((parsed as { itens: unknown }).itens)
  ) {
    throw new Error("Formato de resposta inesperado.");
  }

  const itens = (parsed as { itens: Partial<ItemParecer>[] }).itens;
  return itens.map((i) => ({
    prioridade: i.prioridade ?? "",
    porQue: i.porQue ?? "",
    oQueDestrava: i.oQueDestrava ?? "",
    mensagemPronta: i.mensagemPronta ?? "",
  }));
}
