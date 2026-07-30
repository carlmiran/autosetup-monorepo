// AUTOSETUP — apps/core/web/src/app/api/indicadores/conectar/route.ts
// Início do fluxo real de OAuth do Mercado Pago — o indicador autoriza
// a própria conta uma vez, e o split de pagamento passa a funcionar
// sozinho em toda venda que ele trouxer. Fonte: pedido de Carlos
// (30/07/2026) — comissão sem o AutoSetup segurar dinheiro de terceiro.

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("codigo");

  if (!codigo) {
    return NextResponse.json({ error: "Informe o código do indicador (?codigo=...)." }, { status: 400 });
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "MERCADOPAGO_CLIENT_ID não configurado neste ambiente." },
      { status: 503 },
    );
  }

  const redirectUri = `${url.origin}/api/indicadores/callback`;
  const authUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("platform_id", "mp");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", codigo);

  return NextResponse.redirect(authUrl.toString());
}
