// AUTOSETUP — apps/core/web/src/app/api/perguntas-nicho/route.ts
// Gera perguntas específicas do nicho informado, pra medir envolvimento
// REAL da pessoa com o estado da arte do próprio mercado — física e
// digitalmente, não presença digital genérica (isso já é perguntado em
// outro lugar do formulário). Fonte: pedido de Carlos (28/07/2026),
// exemplo dado: nicho "organização de eventos" → perguntar se a pessoa
// frequenta/produz eventos, não só se posta no Instagram.

import { NextResponse } from "next/server";
import { llmAdapter, completeViaGateway } from "@autosetup/adapter-llm";

const SUPPORTED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "CEREBRAS_API_KEY",
] as const;

function montarPrompt(nicho: string): string {
  return `Gere exatamente 2 perguntas curtas em português, específicas para o nicho de negócio "${nicho}", que meçam o quanto a pessoa está REALMENTE envolvida e atualizada com o estado da arte desse mercado — cobrindo tanto participação física/presencial quanto digital.

Exemplo de calibração (não copie, é só o padrão de profundidade): pro nicho "organização de eventos", uma pergunta boa seria "Você tem frequentado ou participado da produção de eventos recentemente?" — porque testa envolvimento real com o próprio ramo, não só se a pessoa posta nas redes.

NÃO pergunte sobre presença digital genérica (site, Instagram, Google Business) — isso já é perguntado em outra parte do formulário. Foque em conhecimento, imersão e atualização real no nicho específico.

Responda ESTRITAMENTE em JSON válido, sem markdown:
{
  "perguntas": [
    { "pergunta": "...", "ajuda": "frase curta explicando o porquê da pergunta, tom parceiro" },
    { "pergunta": "...", "ajuda": "..." }
  ]
}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { nicho?: string };
  const nicho = body.nicho?.trim();

  if (!nicho) {
    return NextResponse.json({ error: "Informe o nicho primeiro." }, { status: 400 });
  }

  const hasAnyProvider = SUPPORTED_KEYS.some((key) => Boolean(process.env[key]));
  if (!hasAnyProvider) {
    return NextResponse.json(
      { error: "Nenhum provider de LLM configurado neste ambiente." },
      { status: 503 },
    );
  }

  try {
    await llmAdapter.connect(process.env);
    const resultado = await completeViaGateway(montarPrompt(nicho));
    let parsed: unknown;
    try {
      parsed = JSON.parse(resultado.text);
    } catch {
      throw new Error("Resposta do modelo não é JSON válido.");
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("perguntas" in parsed) ||
      !Array.isArray((parsed as { perguntas: unknown }).perguntas)
    ) {
      throw new Error("Formato de resposta inesperado.");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar perguntas do nicho.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
