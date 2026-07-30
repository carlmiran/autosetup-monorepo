// AUTOSETUP — apps/core/web/src/app/api/pagamento/webhook/route.ts
// Recebe notificação real do Mercado Pago quando um pagamento muda de
// status. Sempre retorna 200 rápido (Mercado Pago reenvia por até 4
// dias se não receber 200) — falha de processamento nunca deve virar
// reenvio infinito nem erro pro usuário, que nem está nesta requisição.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { type?: string; data?: { id?: string } };

    if (body.type === "payment" && body.data?.id) {
      await atualizarStatusPagamento(body.data.id);
    }
    if (body.type === "preapproval" && body.data?.id) {
      await atualizarStatusAssinatura(body.data.id);
    }
  } catch (err) {
    console.error("[pagamento/webhook] erro ao processar notificação:", err);
  }

  // Sempre 200 — o Mercado Pago só precisa saber que recebemos.
  return NextResponse.json({ ok: true });
}

async function atualizarStatusPagamento(paymentId: string): Promise<void> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return;

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;

  const data = (await res.json()) as { status?: string; external_reference?: string };
  await gravarStatus(data.external_reference, data.status);
}

async function atualizarStatusAssinatura(preapprovalId: string): Promise<void> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return;

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;

  const data = (await res.json()) as { status?: string; external_reference?: string };
  await gravarStatus(data.external_reference, data.status);
}

async function gravarStatus(externalReference: string | undefined, status: string | undefined): Promise<void> {
  if (!externalReference || !status) return;
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return;

    const [planoId, email] = externalReference.split(":");
    await db
      .prepare(
        "UPDATE pagamentos SET status = ?, atualizado_em = datetime('now') " +
          "WHERE plano = ? AND email = ? AND status = 'pendente'",
      )
      .bind(status, planoId, email)
      .run();
  } catch (err) {
    console.error("[pagamento/webhook] falha ao gravar status:", err);
  }
}
