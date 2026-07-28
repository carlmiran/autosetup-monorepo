// AUTOSETUP — apps/core/web/src/app/api/interesse/route.ts
// Atualiza o campo interesse_final de um lead já salvo, quando a pessoa
// clica "Sim, quero saber mais" ou "Ainda não" no fechamento do
// diagnóstico. Best-effort, nunca bloqueia a experiência do usuário.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  const body = (await request.json()) as { leadId?: number; interesse?: string };

  if (!body.leadId || !body.interesse) {
    return NextResponse.json({ error: "leadId e interesse são obrigatórios." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) {
      return NextResponse.json({ error: "Binding D1 não disponível." }, { status: 503 });
    }

    await db
      .prepare("UPDATE leads SET interesse_final = ? WHERE id = ?")
      .bind(body.interesse, body.leadId)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
