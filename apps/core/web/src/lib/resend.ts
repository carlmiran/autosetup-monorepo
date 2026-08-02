// AUTOSETUP — apps/core/web/src/lib/resend.ts
// Notificação real por e-mail quando um pagamento é aprovado. Fonte:
// pedido de Carlos (02/08/2026) — cenário identificado: hoje, se
// alguém pagar de verdade, ninguém é avisado, só aparece no banco se
// alguém for checar manualmente. Usa Resend (conta grátis, sem exigir
// domínio próprio — envia pro e-mail do próprio Carlos usando o
// domínio de teste deles).

export async function notificarPagamentoAprovado(dados: {
  plano: string;
  emailCliente: string;
  status: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const paraEmail = process.env.NOTIFICATION_EMAIL;
  if (!apiKey || !paraEmail) {
    console.warn("[resend] RESEND_API_KEY ou NOTIFICATION_EMAIL não configurados — notificação não enviada.");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AutoSetup <onboarding@resend.dev>",
        to: [paraEmail],
        subject: `💰 Pagamento aprovado — ${dados.plano}`,
        html: `
          <h2>Venda real confirmada no AutoSetup</h2>
          <p><strong>Plano:</strong> ${dados.plano}</p>
          <p><strong>Cliente (e-mail):</strong> ${dados.emailCliente}</p>
          <p><strong>Status:</strong> ${dados.status}</p>
          <p>Confirme os dados completos no painel do Mercado Pago ou no banco antes de iniciar a entrega.</p>
        `,
      }),
    });

    if (!res.ok) {
      console.error("[resend] falha ao enviar notificação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[resend] erro ao notificar:", err);
  }
}
