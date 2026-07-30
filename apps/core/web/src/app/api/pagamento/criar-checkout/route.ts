// AUTOSETUP — apps/core/web/src/app/api/pagamento/criar-checkout/route.ts

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PLANOS, criarPreferencia, criarAssinatura } from "@/lib/mercadoPago";
import { verificarRateLimit } from "@/lib/rateLimit";

async function salvarPagamentoPendente(
  plano: string,
  email: string,
  nome: string | undefined,
  tipo: string,
  mpId: string,
  codigoIndicacao: string | undefined,
): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return;
    await db
      .prepare(
        "INSERT INTO pagamentos (plano, nome, email, tipo, mp_id, status, codigo_indicacao) VALUES (?, ?, ?, ?, ?, 'pendente', ?)",
      )
      .bind(plano, nome ?? null, email, tipo, mpId, codigoIndicacao ?? null)
      .run();
  } catch (err) {
    console.error("[pagamento] falha ao salvar pagamento pendente:", err);
  }
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "pagamento", maximo: 10, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { planoId?: string; email?: string; nome?: string; codigoIndicacao?: string };

  if (!body.planoId || !body.email) {
    return NextResponse.json({ error: "Informe o plano e o e-mail." }, { status: 400 });
  }

  const plano = PLANOS[body.planoId];
  if (!plano) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const urlBase = new URL(request.url).origin;

  try {
    const resultado =
      plano.tipo === "unico"
        ? await criarPreferencia(plano, body.email, urlBase)
        : await criarAssinatura(plano, body.email, urlBase);

    await salvarPagamentoPendente(plano.id, body.email, body.nome, plano.tipo, resultado.mpId, body.codigoIndicacao);

    return NextResponse.json({ checkoutUrl: resultado.checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
