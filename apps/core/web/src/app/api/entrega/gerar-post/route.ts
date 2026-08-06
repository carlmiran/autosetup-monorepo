// AUTOSETUP — apps/core/web/src/app/api/entrega/gerar-post/route.ts
// Rota interna (não linkada publicamente) — gera a imagem de um post,
// a partir do tema/legenda já produzidos pelo diagnóstico ou digitados
// à mão pela equipe durante a entrega de um plano pago.

import { NextResponse } from "next/server";
import { gerarImagemPost } from "@/lib/gerarImagemPost";
import { verificarRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  // Limite baixo de propósito — cada chamada custa dinheiro de verdade,
  // e esta rota é de uso interno da equipe, não do público.
  const limite = await verificarRateLimit(request, { rota: "entrega-gerar-post", maximo: 30, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Muitas gerações em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { tema?: string; legenda?: string };
  if (!body.tema || !body.legenda) {
    return NextResponse.json({ error: "Informe tema e legenda." }, { status: 400 });
  }

  try {
    const resultado = await gerarImagemPost(body.tema, body.legenda);
    return NextResponse.json(resultado);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar imagem.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
