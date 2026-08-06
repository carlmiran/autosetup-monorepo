// AUTOSETUP — apps/core/web/src/app/api/admin/comissoes/route.ts
// Painel interno de comissões — o D1 já guarda tudo (pagamentos +
// código de indicação), isso só organiza pra ficar visível e permite
// marcar como pago manualmente. Fonte: pedido de Carlos (06/08/2026).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PLANOS } from "@/lib/mercadoPago";

const PERCENTUAL_COMISSAO = 0.2;

interface LinhaComissao {
  id: number;
  criadoEm: string;
  plano: string;
  valorPlano: number;
  valorComissao: number;
  codigoIndicacao: string;
  emailCliente: string;
  status: string;
  comissaoPaga: boolean;
}

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const resultado = await db
      .prepare(
        "SELECT id, criado_em, plano, email, status, codigo_indicacao, comissao_paga " +
          "FROM pagamentos WHERE codigo_indicacao IS NOT NULL AND status IN ('approved', 'authorized') " +
          "ORDER BY criado_em DESC",
      )
      .all<{
        id: number;
        criado_em: string;
        plano: string;
        email: string;
        status: string;
        codigo_indicacao: string;
        comissao_paga: number;
      }>();

    const linhas: LinhaComissao[] = (resultado.results ?? []).map((r) => {
      const valorPlano = PLANOS[r.plano]?.valor ?? 0;
      return {
        id: r.id,
        criadoEm: r.criado_em,
        plano: PLANOS[r.plano]?.nome ?? r.plano,
        valorPlano,
        valorComissao: Math.round(valorPlano * PERCENTUAL_COMISSAO * 100) / 100,
        codigoIndicacao: r.codigo_indicacao,
        emailCliente: r.email,
        status: r.status,
        comissaoPaga: Boolean(r.comissao_paga),
      };
    });

    return NextResponse.json({ comissoes: linhas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar comissões.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: number; pago?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "Informe o id do pagamento." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    await db
      .prepare("UPDATE pagamentos SET comissao_paga = ? WHERE id = ?")
      .bind(body.pago ? 1 : 0, body.id)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
