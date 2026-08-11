// AUTOSETUP — apps/core/web/src/app/api/indicadores/desempenho/route.ts
// Painel pessoal do indicador — de graça, sem inventar dado novo: junta
// o que já existe em `leads` e `pagamentos` filtrado pelo código dele.
// Fonte: pedido de Carlos (11/08/2026) — maior gargalo identificado foi
// o indicador trabalhar sem ver o próprio resultado.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PLANOS } from "@/lib/mercadoPago";

const PERCENTUAL_COMISSAO = 0.2;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("codigo");
  if (!codigo) {
    return NextResponse.json({ error: "Informe o código do indicador." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const diagnosticos = await db
      .prepare("SELECT COUNT(*) AS total FROM leads WHERE codigo_indicacao = ?")
      .bind(codigo)
      .first<{ total: number }>();

    const interesseSim = await db
      .prepare("SELECT COUNT(*) AS total FROM leads WHERE codigo_indicacao = ? AND interesse_final = 'sim'")
      .bind(codigo)
      .first<{ total: number }>();

    const pagamentos = await db
      .prepare("SELECT plano, status, comissao_paga FROM pagamentos WHERE codigo_indicacao = ?")
      .bind(codigo)
      .all<{ plano: string; status: string; comissao_paga: number }>();

    const linhas = pagamentos.results ?? [];
    const aprovados = linhas.filter((p) => p.status === "approved" || p.status === "authorized");

    const comissaoTotal = aprovados.reduce((soma, p) => {
      const valorPlano = PLANOS[p.plano]?.valor ?? 0;
      return soma + valorPlano * PERCENTUAL_COMISSAO;
    }, 0);

    const comissaoPaga = aprovados
      .filter((p) => p.comissao_paga)
      .reduce((soma, p) => {
        const valorPlano = PLANOS[p.plano]?.valor ?? 0;
        return soma + valorPlano * PERCENTUAL_COMISSAO;
      }, 0);

    return NextResponse.json({
      diagnosticosGerados: diagnosticos?.total ?? 0,
      demonstraramInteresse: interesseSim?.total ?? 0,
      vendasConfirmadas: aprovados.length,
      comissaoTotal: Math.round(comissaoTotal * 100) / 100,
      comissaoPaga: Math.round(comissaoPaga * 100) / 100,
      comissaoPendente: Math.round((comissaoTotal - comissaoPaga) * 100) / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar desempenho.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
