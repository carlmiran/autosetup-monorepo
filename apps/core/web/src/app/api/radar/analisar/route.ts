// AUTOSETUP — apps/core/web/src/app/api/radar/analisar/route.ts

import { NextResponse } from "next/server";
import { gerarAnaliseRadar } from "@/lib/radar";
import { verificarRateLimit } from "@/lib/rateLimit";
import type { NegocioProximo } from "@/lib/googlePlaces";

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "radar-analisar", maximo: 15, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as Partial<NegocioProximo>;

  if (!body.id || !body.nome) {
    return NextResponse.json({ error: "Negócio inválido." }, { status: 400 });
  }

  try {
    const analise = await gerarAnaliseRadar(body as NegocioProximo);
    return NextResponse.json(analise);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar análise.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
