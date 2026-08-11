// AUTOSETUP — apps/core/web/src/app/api/avisos/route.ts
// Canal de aviso Carlos→indicadores. Não é push (ninguém é notificado
// ativamente) — é um mural: Carlos publica, qualquer indicador que
// abrir o Radar/Manual/Meus Clientes/Meu Desempenho vê o aviso ativo
// mais recente. Fonte: gargalo identificado por Carlos (11/08/2026).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ aviso: null });

    const linha = await db
      .prepare("SELECT mensagem FROM avisos WHERE ativo = 1 ORDER BY criado_em DESC LIMIT 1")
      .first<{ mensagem: string }>();

    return NextResponse.json({ aviso: linha?.mensagem ?? null });
  } catch (err) {
    console.error("[avisos] falha ao buscar:", err);
    return NextResponse.json({ aviso: null });
  }
}

/** Uso interno — Carlos publica um aviso novo (desativa os anteriores
 * automaticamente, só um fica ativo por vez). Sem autenticação real
 * (mesmo padrão informal do resto), mas não é linkado publicamente. */
export async function POST(request: Request) {
  const body = (await request.json()) as { mensagem?: string };
  if (!body.mensagem?.trim()) {
    return NextResponse.json({ error: "Informe a mensagem." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    await db.prepare("UPDATE avisos SET ativo = 0 WHERE ativo = 1").run();
    await db
      .prepare("INSERT INTO avisos (mensagem, ativo) VALUES (?, 1)")
      .bind(body.mensagem.trim())
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao publicar aviso.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
