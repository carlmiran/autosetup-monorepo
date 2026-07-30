// AUTOSETUP — apps/core/web/src/app/api/transcrever/route.ts
// Transcrição real de áudio via OpenAI Whisper (/v1/audio/transcriptions).
// Usa a mesma OPENAI_API_KEY já configurada — nenhuma chave nova.
//
// Fonte: pedido de Carlos (27/07/2026) — captar a "parte emocional do
// cliente" via voz nas perguntas mais profundas do diagnóstico (rotina,
// dores, sobrecarga). Honestidade em Demonstrações: se a transcrição
// falhar, retorna erro real, nunca um texto inventado no lugar do áudio.

import { NextResponse } from "next/server";
import { verificarRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "transcrever", maximo: 20, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY não configurada — transcrição de áudio precisa dela." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Nenhum áudio recebido." }, { status: 400 });
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "gravacao.webm");
  upstreamForm.append("model", "whisper-1");
  upstreamForm.append("language", "pt");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Falha ao transcrever (OpenAI ${res.status}): ${errText.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { text?: string };
    if (!data.text) {
      return NextResponse.json({ error: "Transcrição vazia — tente gravar de novo." }, { status: 502 });
    }

    return NextResponse.json({ texto: data.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao transcrever.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
