// AUTOSETUP — apps/core/web/src/lib/radar.ts
// Motor de análise comercial de um estabelecimento real, escolhido pelo
// usuário num radar de proximidade (estilo "Uber"). Fonte: pedido de
// Carlos (30/07/2026) — ferramenta interna de prospecção: navegar
// negócios reais perto de um local, clicar num e ver oportunidade
// comercial como futuro cliente do AutoSetup.
//
// Diferença importante em relação ao /diagnostico: aqui NINGUÉM
// preencheu um formulário sobre o próprio negócio — é o AutoSetup
// avaliando um negócio de fora, a partir de dado público (Google
// Places + o que a IA encontrar pesquisando). Por isso o tom é sempre
// "oportunidade de abordagem", nunca afirmação como se fosse fato
// interno da empresa.

import type { NegocioProximo } from "./googlePlaces";

export interface AnaliseRadar {
  resumo: string;
  presencaDigital: string[];
  oportunidades: string[];
  abordagemSugerida: string;
}

function montarPrompt(negocio: NegocioProximo): string {
  return `Você está avaliando um negócio real como possível CLIENTE do AutoSetup (uma consultoria de presença digital pra pequenos negócios) — isso é prospecção comercial, não uma avaliação pedida pelo dono do negócio.

DADOS REAIS (do Google Places, não invente nada além disso):
- Nome: ${negocio.nome}
- Endereço: ${negocio.endereco ?? "não disponível"}
- Categoria: ${negocio.categoria ?? "não informada"}
- Nº de avaliações no Google: ${negocio.avaliacoes ?? "não disponível"}
- Nota média: ${negocio.nota ?? "não disponível"}

TAREFA: pesquise na web por esse negócio (nome + endereço) pra ver se ele tem site, Instagram, ou outra presença digital visível. Com base no que encontrar (ou não encontrar), avalie se esse negócio parece ser uma boa oportunidade comercial pro AutoSetup abordar — sinais de baixa presença digital, poucas avaliações pro tamanho do nicho, ausência de site, são sinais de oportunidade; presença já forte é sinal de baixa prioridade.

REGRA INEGOCIÁVEL: tudo que você afirmar sobre a presença digital real desse negócio precisa vir de busca real que você fez. Se não encontrar nada, diga isso explicitamente ("não foi possível confirmar presença digital própria") — nunca invente que ele tem ou não tem algo.

Tom: analítico, direto, como uma nota interna de prospecção — nunca fale como se estivesse se dirigindo ao dono do negócio (ele não pediu essa análise).

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "resumo": "1-2 frases sobre o negócio e por que ele é ou não uma boa oportunidade",
  "presencaDigital": ["achados reais sobre site/redes sociais/Google Business — ou a ausência confirmada deles"],
  "oportunidades": ["1 a 3 oportunidades comerciais concretas pro AutoSetup oferecer a esse negócio"],
  "abordagemSugerida": "uma frase prática de como abordar esse prospect, ex: pelo WhatsApp, mencionando algo específico"
}`;
}

export async function gerarAnaliseRadar(negocio: NegocioProximo): Promise<AnaliseRadar> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada — a análise precisa de pesquisa real na web.");
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
      input: montarPrompt(negocio),
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
    throw new Error("A Responses API não retornou texto de saída.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("O modelo não retornou JSON válido. Resposta bruta: " + raw.slice(0, 200));
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Formato de resposta inesperado.");
  }

  const p = parsed as Partial<AnaliseRadar>;
  return {
    resumo: p.resumo ?? "",
    presencaDigital: p.presencaDigital ?? [],
    oportunidades: p.oportunidades ?? [],
    abordagemSugerida: p.abordagemSugerida ?? "",
  };
}
