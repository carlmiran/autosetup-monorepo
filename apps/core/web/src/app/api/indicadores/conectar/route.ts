// AUTOSETUP — apps/core/web/src/app/api/indicadores/conectar/route.ts
// Início do fluxo real de OAuth do Mercado Pago — o indicador autoriza
// a própria conta uma vez, e o split de pagamento passa a funcionar
// sozinho em toda venda que ele trouxer. Fonte: pedido de Carlos
// (30/07/2026) — comissão sem o AutoSetup segurar dinheiro de terceiro.
//
// 24/10/2026 (Pacote 1): virou POST com código + PIN (header
// x-indicador-pin) e devolve a URL de autorização com `state` assinado
// (src/lib/oauthState.ts). Antes era um GET só com `?codigo=`, e o `state`
// era o próprio código — qualquer pessoa ligava a própria conta MP ao
// código de outro indicador e ficava com a comissão dele.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { negarSemPinIndicador } from "@/lib/indicadorAuth";
import { assinarStateOAuth } from "@/lib/oauthState";

export function GET() {
  return NextResponse.json(
    { error: "Use a página /indicadores/entrar para conectar sua conta do Mercado Pago." },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { codigo?: string };
  const codigo = body.codigo?.trim();
  if (!codigo) {
    return NextResponse.json({ error: "Informe o código do indicador." }, { status: 400 });
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Credenciais de aplicação do Mercado Pago não configuradas neste ambiente." },
      { status: 503 },
    );
  }

  const db = (getCloudflareContext().env as { DB?: D1Database }).DB;
  if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });
  const negado = await negarSemPinIndicador(request, db, codigo);
  if (negado) return negado;

  const url = new URL(request.url);
  const authUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("platform_id", "mp");
  authUrl.searchParams.set("redirect_uri", `${url.origin}/api/indicadores/callback`);
  authUrl.searchParams.set("state", await assinarStateOAuth(codigo, clientSecret));

  return NextResponse.json({ url: authUrl.toString() });
}
