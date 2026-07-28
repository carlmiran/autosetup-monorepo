// AUTOSETUP — apps/core/web/src/app/api/diagnostico/route.ts
// Fonte: LENS (Core), IMP-LLM-001 (Gateway multi-provider), pesquisa real
// via OpenAI Responses API (web_search tool) quando há link de rede
// social/Google Business informado.

import { NextResponse } from "next/server";
import { llmAdapter } from "@autosetup/adapter-llm";
import {
  gerarDiagnostico,
  gerarDiagnosticoComPesquisa,
  type DiagnosticoInput,
} from "@/lib/diagnostico";

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
    rotinaDiaria: body.rotinaDiaria || undefined,
    oQueAtrapalha: body.oQueAtrapalha || undefined,
    sobrecarga: body.sobrecarga || undefined,
    linkInstagram: body.linkInstagram || undefined,
    linkGoogleBusiness: body.linkGoogleBusiness || undefined,
  };

  const quererPesquisa = Boolean(input.linkInstagram || input.linkGoogleBusiness);

  // Pesquisa real exige especificamente OPENAI_API_KEY (web_search é
  // capacidade hospedada da OpenAI, não generaliza pro Gateway).
  if (quererPesquisa && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Você informou um link, mas a pesquisa real na web exige OPENAI_API_KEY configurada (não encontrada). Configure-a ou tente sem os links.",
      },
      { status: 503 },
    );
  }

  if (quererPesquisa) {
    try {
      const resultado = await gerarDiagnosticoComPesquisa(input);
      return NextResponse.json(resultado);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido na pesquisa real.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // Modo sem pesquisa: Gateway multi-provider, basta UM provider configurado.
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
