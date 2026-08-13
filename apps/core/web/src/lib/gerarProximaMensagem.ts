// AUTOSETUP — apps/core/web/src/lib/gerarProximaMensagem.ts
// Resolve o gargalo real relatado por Carlos (13/08/2026): pra
// continuar uma abordagem, ele saía do AutoSetup, colava a conversa
// manual no ChatGPT/Gemini pra pedir argumentação e fechamento. Isso
// gera a próxima mensagem sugerida usando o que já existe — as
// anotações do vendedor sobre o cliente, e o diagnóstico real quando
// houver — sem exigir diagnóstico pronto (diferente do "parecer de
// prioridade em sequência", que só funciona com diagnóstico casado).
//
// REGRA DE HONESTIDADE: nunca inventa urgência falsa, nunca promete o
// que o AutoSetup não faz, nunca finge saber algo que não está nas
// anotações. Se as anotações forem vazias, sugere uma mensagem de
// abertura genérica e honesta, não finge contexto que não existe.

import { completeViaGateway } from "@autosetup/adapter-llm";

export interface DadosProximaMensagem {
  nomeCliente: string;
  notasVendedor?: string;
  diagnosticoResumo?: string;
}

export interface ProximaMensagem {
  contexto: string;
  mensagemSugerida: string;
}

function montarPrompt(dados: DadosProximaMensagem): string {
  return `Você está ajudando um vendedor/indicador do AutoSetup a continuar uma conversa de venda com "${dados.nomeCliente}".

${
  dados.notasVendedor
    ? `ANOTAÇÕES REAIS DO VENDEDOR SOBRE ESSE CLIENTE (histórico da conversa até agora):\n"${dados.notasVendedor}"`
    : "Nenhuma anotação registrada ainda — essa seria a primeira abordagem."
}

${dados.diagnosticoResumo ? `DIAGNÓSTICO REAL JÁ GERADO PRA ESSE NEGÓCIO:\n"${dados.diagnosticoResumo}"` : ""}

TAREFA: sugira a PRÓXIMA mensagem que o vendedor deveria mandar agora, continuando a conversa de onde ela está (baseado nas anotações). Se não houver anotação nenhuma, sugira uma mensagem de abertura simples e honesta (mesmo estilo do Manual do Indicador do AutoSetup: soar como alguém avisando um conhecido de algo útil, não discurso de vendedor).

REGRAS INEGOCIÁVEIS:
- Nunca invente urgência falsa ("só hoje", "última vaga") ou prova social que não existe.
- Nunca prometa o que o AutoSetup não faz (atendimento automático por WhatsApp, postagem automática em rede social — isso não existe ainda).
- Se as anotações não derem contexto suficiente pra saber o que dizer, seja honesto sobre isso na explicação, não invente.

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "contexto": "1 frase explicando em que ponto a conversa está e por que essa é a próxima mensagem certa",
  "mensagemSugerida": "a mensagem pronta pra mandar, curta, natural, pronta pra copiar e colar no WhatsApp"
}`;
}

export async function gerarProximaMensagem(dados: DadosProximaMensagem): Promise<ProximaMensagem> {
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

  const p = parsed as Partial<ProximaMensagem>;
  return {
    contexto: p.contexto ?? "",
    mensagemSugerida: p.mensagemSugerida ?? "",
  };
}
