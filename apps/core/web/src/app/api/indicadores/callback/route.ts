// AUTOSETUP — apps/core/web/src/app/api/indicadores/callback/route.ts
// Recebe o retorno da autorização do Mercado Pago, troca o code pelo
// user_id real da conta do indicador, e salva a ligação no D1.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const codigo = url.searchParams.get("state");

  if (!code || !codigo) {
    return NextResponse.json({ error: "Retorno de autorização inválido." }, { status: 400 });
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Credenciais de aplicação do Mercado Pago não configuradas." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${url.origin}/api/indicadores/callback`,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Mercado Pago recusou a autorização: ${await res.text()}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { user_id?: number };
    if (!data.user_id) {
      return NextResponse.json({ error: "Resposta do Mercado Pago sem user_id." }, { status: 502 });
    }

    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (db) {
      await db
        .prepare(
          "INSERT INTO indicadores (codigo, mp_user_id, conectado_em) VALUES (?, ?, datetime('now')) " +
            "ON CONFLICT(codigo) DO UPDATE SET mp_user_id = excluded.mp_user_id, conectado_em = datetime('now')",
        )
        .bind(codigo, String(data.user_id))
        .run();
    }

    return NextResponse.redirect(`${url.origin}/indicadores/conectado`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
