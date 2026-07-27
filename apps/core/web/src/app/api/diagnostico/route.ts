// AUTOSETUP — apps/core/web/src/app/api/diagnostico/route.ts
// Fonte: LENS (Core), IMP-LLM-001 (Gateway multi-provider).

import { NextResponse } from "next/server";
import { llmAdapter } from "@autosetup/adapter-llm";
import { gerarDiagnostico, type DiagnosticoInput } from "@/lib/diagnostico";

const SUPPORTED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "CEREBRAS_API_KEY",
] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DiagnosticoInput>;

  // Validação real — não deixa passar diagnóstico com dado essencial faltando.
  if (!body.nomeNegocio || !body.cidade || !body.nicho || !body.maiorDificuldade) {
    return NextResponse.json(
      { error: "Preencha nome do negócio, cidade, nicho e maior dificuldade." },
      { status: 400 },
    );
  }

  // Gateway: basta UM provider configurado, não depende de nenhum específico.
  const hasAnyProvider = SUPPORTED_KEYS.some((key) => Boolean(process.env[key]));
  if (!hasAnyProvider) {
    return NextResponse.json(
      {
        error:
          "Nenhum provider de LLM configurado neste ambiente. Configure ao menos uma das chaves: " +
          SUPPORTED_KEYS.join(", ") +
          " — ver .env.example.",
      },
      { status: 503 },
    );
  }

  const input: DiagnosticoInput = {
    nomeNegocio: body.nomeNegocio,
    cidade: body.cidade,
    nicho: body.nicho,
    temSite: Boolean(body.temSite),
    temInstagram: Boolean(body.temInstagram),
    temGoogleBusiness: Boolean(body.temGoogleBusiness),
    numeroAvaliacoesGoogle:
      typeof body.numeroAvaliacoesGoogle === "number" ? body.numeroAvaliacoesGoogle : null,
    notaMediaGoogle: typeof body.notaMediaGoogle === "number" ? body.notaMediaGoogle : null,
    maiorDificuldade: body.maiorDificuldade,
  };

  try {
    await llmAdapter.connect(process.env);
    const resultado = await gerarDiagnostico(input);
    return NextResponse.json(resultado);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar diagnóstico.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
