// AUTOSETUP — apps/core/web/src/app/api/indicadores/regiao/route.ts
// Região de atuação do indicador pro Prospector Autônomo
// (apps/core/worker-prospector) — o cron lê essa tabela pra saber onde
// procurar negócios. Suporta os dois modos decididos por Carlos
// (12/08/2026): geolocalização do navegador (mesmo padrão já usado em
// /radar) ou texto digitado (cidade/bairro), geocodificado no servidor
// via Google Places Text Search.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { geocodificarTexto } from "@/lib/googlePlaces";
import { verificarRateLimit } from "@/lib/rateLimit";

const RAIO_KM_MIN = 1;
const RAIO_KM_MAX = 50;

interface RegiaoIndicador {
  codigo_indicador: string;
  origem: "geolocalizacao" | "manual";
  endereco_referencia: string | null;
  lat: number;
  lng: number;
  raio_km: number;
  atualizado_em: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("codigo");
  if (!codigo) {
    return NextResponse.json({ error: "Informe o código do indicador." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const regiao = await db
      .prepare(
        "SELECT codigo_indicador, origem, endereco_referencia, lat, lng, raio_km, atualizado_em " +
          "FROM indicador_regiao WHERE codigo_indicador = ?",
      )
      .bind(codigo)
      .first<RegiaoIndicador>();

    return NextResponse.json({ regiao: regiao ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar região.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-regiao", maximo: 15, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." }, { status: 429 });
  }

  const body = (await request.json()) as {
    codigo?: string;
    origem?: "geolocalizacao" | "manual";
    raioKm?: number;
    lat?: number;
    lng?: number;
    enderecoReferencia?: string;
  };

  const codigo = body.codigo?.trim();
  const raioKm = body.raioKm;

  if (!codigo || !body.origem) {
    return NextResponse.json({ error: "Informe o código e a origem da localização." }, { status: 400 });
  }
  if (typeof raioKm !== "number" || raioKm < RAIO_KM_MIN || raioKm > RAIO_KM_MAX) {
    return NextResponse.json(
      { error: `O raio precisa ser um número entre ${RAIO_KM_MIN} e ${RAIO_KM_MAX} km.` },
      { status: 400 },
    );
  }

  let lat: number;
  let lng: number;
  let enderecoReferencia: string | null = null;

  if (body.origem === "geolocalizacao") {
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json({ error: "Localização do navegador inválida." }, { status: 400 });
    }
    lat = body.lat;
    lng = body.lng;
  } else if (body.origem === "manual") {
    const texto = body.enderecoReferencia?.trim();
    if (!texto) {
      return NextResponse.json({ error: "Digite a cidade ou bairro onde você atua." }, { status: 400 });
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY não configurada neste ambiente." }, { status: 503 });
    }
    const resolvido = await geocodificarTexto(texto);
    if (!resolvido) {
      return NextResponse.json(
        { error: "Não conseguimos localizar esse endereço — tente ser mais específico (ex.: \"bairro, cidade - UF\")." },
        { status: 422 },
      );
    }
    lat = resolvido.lat;
    lng = resolvido.lng;
    enderecoReferencia = resolvido.enderecoFormatado ?? texto;
  } else {
    return NextResponse.json({ error: "Origem inválida." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    await db
      .prepare(
        "INSERT INTO indicador_regiao (codigo_indicador, origem, endereco_referencia, lat, lng, raio_km, atualizado_em) " +
          "VALUES (?, ?, ?, ?, ?, ?, datetime('now')) " +
          "ON CONFLICT(codigo_indicador) DO UPDATE SET " +
          "origem = excluded.origem, endereco_referencia = excluded.endereco_referencia, " +
          "lat = excluded.lat, lng = excluded.lng, raio_km = excluded.raio_km, atualizado_em = excluded.atualizado_em",
      )
      .bind(codigo, body.origem, enderecoReferencia, lat, lng, raioKm)
      .run();

    return NextResponse.json({
      ok: true,
      regiao: { codigo_indicador: codigo, origem: body.origem, endereco_referencia: enderecoReferencia, lat, lng, raio_km: raioKm },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar região.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
