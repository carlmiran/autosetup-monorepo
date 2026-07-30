// AUTOSETUP — apps/core/web/src/app/api/radar/proximos/route.ts

import { NextResponse } from "next/server";
import { buscarNegociosProximos } from "@/lib/googlePlaces";
import { verificarRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "radar-proximos", maximo: 15, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { latitude?: number; longitude?: number; tipo?: string };

  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ error: "Localização inválida." }, { status: 400 });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY não configurada neste ambiente." },
      { status: 503 },
    );
  }

  try {
    const negocios = await buscarNegociosProximos(body.latitude, body.longitude, 1500, body.tipo);
    return NextResponse.json({ negocios });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar negócios próximos.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
