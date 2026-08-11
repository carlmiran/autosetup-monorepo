// AUTOSETUP — apps/core/web/src/app/api/indicadores/registro/route.ts
// Resolve colisão de código entre indicadores: primeira vez que um
// código é usado, "reivindica" ele com um PIN de 4 dígitos escolhido
// na hora. Da próxima vez, precisa do mesmo PIN pra acessar. Não é
// login de verdade (sem senha forte, sem recuperação) — é só o
// suficiente pra impedir que duas pessoas usem "joao" por coincidência
// sem perceber. Fonte: gargalo identificado por Carlos (11/08/2026).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verificarRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-registro", maximo: 30, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas. Espere um pouco." }, { status: 429 });
  }

  const body = (await request.json()) as { codigo?: string; pin?: string; contato?: string };
  const codigo = body.codigo?.trim();
  const pin = body.pin?.trim();

  if (!codigo || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Informe o código e um PIN de 4 números." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const existente = await db
      .prepare("SELECT pin FROM indicadores_registro WHERE codigo = ?")
      .bind(codigo)
      .first<{ pin: string }>();

    if (!existente) {
      // Primeira vez — reivindica o código com esse PIN.
      await db
        .prepare("INSERT INTO indicadores_registro (codigo, pin, contato) VALUES (?, ?, ?)")
        .bind(codigo, pin, body.contato ?? null)
        .run();
      return NextResponse.json({ ok: true, novo: true });
    }

    if (existente.pin !== pin) {
      return NextResponse.json(
        { error: "Esse código já está em uso por outra pessoa, com um PIN diferente. Escolha outro código." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, novo: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao validar código.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
