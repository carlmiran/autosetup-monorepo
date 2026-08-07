// AUTOSETUP — apps/core/web/src/app/api/radar/proximos/route.ts

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buscarNegociosProximos, type NegocioProximo } from "@/lib/googlePlaces";
import { verificarRateLimit } from "@/lib/rateLimit";

/** Remove negócios que esse indicador (código) já viu antes, e marca os
 * novos como vistos — pra nunca repetir o mesmo lead duas vezes pro
 * mesmo vendedor. Best-effort: sem banco, retorna a lista sem filtrar. */
async function filtrarEMarcarVistos(codigo: string, negocios: NegocioProximo[]): Promise<NegocioProximo[]> {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return negocios;

    const vistos = await db
      .prepare("SELECT place_id FROM radar_visto WHERE codigo_indicacao = ?")
      .bind(codigo)
      .all<{ place_id: string }>();
    const idsVistos = new Set((vistos.results ?? []).map((r) => r.place_id));

    const novos = negocios.filter((n) => !idsVistos.has(n.id));

    for (const n of novos) {
      await db
        .prepare(
          "INSERT INTO radar_visto (codigo_indicacao, place_id, nome_negocio) VALUES (?, ?, ?) " +
            "ON CONFLICT(codigo_indicacao, place_id) DO NOTHING",
        )
        .bind(codigo, n.id, n.nome)
        .run();
    }

    return novos;
  } catch (err) {
    console.error("[radar] falha ao filtrar vistos:", err);
    return negocios;
  }
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "radar-proximos", maximo: 15, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    latitude?: number;
    longitude?: number;
    tipo?: string;
    codigo?: string;
  };

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
    let negocios = await buscarNegociosProximos(body.latitude, body.longitude, 1500, body.tipo);
    if (body.codigo) {
      negocios = await filtrarEMarcarVistos(body.codigo, negocios);
    }
    return NextResponse.json({ negocios });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar negócios próximos.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
