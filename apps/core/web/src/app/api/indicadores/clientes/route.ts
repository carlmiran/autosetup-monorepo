// AUTOSETUP — apps/core/web/src/app/api/indicadores/clientes/route.ts
// Lista de clientes do próprio vendedor/indicador — identificado só
// pelo código de indicação (sem login, mesmo padrão informal já usado
// no resto do programa). Fonte: pedido de Carlos (06/08/2026).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verificarRateLimit } from "@/lib/rateLimit";

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

    const resultado = await db
      .prepare(
        "SELECT id, nome_cliente, whatsapp_cliente, notas, data_followup, criado_em " +
          "FROM clientes_indicador WHERE codigo_indicacao = ? ORDER BY data_followup ASC, criado_em DESC",
      )
      .bind(codigo)
      .all();

    return NextResponse.json({ clientes: resultado.results ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar clientes.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-clientes", maximo: 60, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas. Espere um pouco." }, { status: 429 });
  }

  const body = (await request.json()) as {
    codigo?: string;
    nomeCliente?: string;
    whatsappCliente?: string;
    notas?: string;
    dataFollowup?: string;
  };

  if (!body.codigo || !body.nomeCliente) {
    return NextResponse.json({ error: "Informe o código e o nome do cliente." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    await db
      .prepare(
        "INSERT INTO clientes_indicador (codigo_indicacao, nome_cliente, whatsapp_cliente, notas, data_followup) " +
          "VALUES (?, ?, ?, ?, ?)",
      )
      .bind(body.codigo, body.nomeCliente, body.whatsappCliente ?? null, body.notas ?? null, body.dataFollowup ?? null)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar cliente.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-clientes", maximo: 60, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas. Espere um pouco." }, { status: 429 });
  }

  const body = (await request.json()) as {
    id?: number;
    codigo?: string;
    nomeCliente?: string;
    whatsappCliente?: string;
    notas?: string;
    dataFollowup?: string;
  };

  if (!body.id || !body.codigo || !body.nomeCliente) {
    return NextResponse.json({ error: "Informe id, código e nome do cliente." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    // Sempre filtra por codigo_indicacao também — um indicador só edita
    // o próprio registro, mesmo sabendo o id de outra pessoa.
    const resultado = await db
      .prepare(
        "UPDATE clientes_indicador SET nome_cliente = ?, whatsapp_cliente = ?, notas = ?, data_followup = ?, atualizado_em = datetime('now') " +
          "WHERE id = ? AND codigo_indicacao = ?",
      )
      .bind(body.nomeCliente, body.whatsappCliente ?? null, body.notas ?? null, body.dataFollowup ?? null, body.id, body.codigo)
      .run();

    if ((resultado.meta.changes ?? 0) === 0) {
      return NextResponse.json({ error: "Cliente não encontrado pra esse código." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar cliente.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const codigo = url.searchParams.get("codigo");

  if (!id || !codigo) {
    return NextResponse.json({ error: "Informe id e código." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const resultado = await db
      .prepare("DELETE FROM clientes_indicador WHERE id = ? AND codigo_indicacao = ?")
      .bind(id, codigo)
      .run();

    if ((resultado.meta.changes ?? 0) === 0) {
      return NextResponse.json({ error: "Cliente não encontrado pra esse código." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao apagar cliente.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
