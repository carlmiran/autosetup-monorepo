// AUTOSETUP — apps/core/web/src/app/api/admin/clientes/route.ts
// Painel interno de clientes — lista leads (diagnósticos) e pagamentos
// separadamente. Fonte: pedido de Carlos (06/08/2026).
//
// Nota real: leads guarda nome_contato/whatsapp_contato, pagamentos
// guarda email — não existe hoje um campo em comum confiável pra
// juntar as duas tabelas automaticamente sem risco de associar errado.
// Por isso as duas listas vêm separadas, não uma "view" unificada
// (mais honesto que inventar um cruzamento que pode estar errado).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const leads = await db
      .prepare(
        `SELECT id, criado_em, nome_contato, whatsapp_contato, nome_negocio,
                cidade, nicho, interesse_final, codigo_indicacao
         FROM leads ORDER BY criado_em DESC LIMIT 200`,
      )
      .all();

    const pagamentos = await db
      .prepare(
        `SELECT id, criado_em, plano, nome, email, status, codigo_indicacao
         FROM pagamentos ORDER BY criado_em DESC LIMIT 200`,
      )
      .all();

    return NextResponse.json({
      leads: leads.results ?? [],
      pagamentos: pagamentos.results ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar clientes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
