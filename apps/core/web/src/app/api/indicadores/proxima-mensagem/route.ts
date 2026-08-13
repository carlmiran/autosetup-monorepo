// AUTOSETUP — apps/core/web/src/app/api/indicadores/proxima-mensagem/route.ts

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { llmAdapter } from "@autosetup/adapter-llm";
import { gerarProximaMensagem } from "@/lib/gerarProximaMensagem";
import { verificarRateLimit } from "@/lib/rateLimit";

/** Normaliza pra comparação — últimos 11 dígitos, ignora DDI. */
function normalizarWhatsapp(v: string): string {
  return v.replace(/\D/g, "").slice(-11);
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-proxima-mensagem", maximo: 30, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas. Espere um pouco." }, { status: 429 });
  }

  const body = (await request.json()) as { codigo?: string; clienteId?: number };
  if (!body.codigo || !body.clienteId) {
    return NextResponse.json({ error: "Informe o código e o cliente." }, { status: 400 });
  }

  const hasAnyProvider = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY", "CEREBRAS_API_KEY"].some(
    (key) => Boolean(process.env[key]),
  );
  if (!hasAnyProvider) {
    return NextResponse.json({ error: "Nenhum provider de LLM configurado neste ambiente." }, { status: 503 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const cliente = await db
      .prepare("SELECT nome_cliente, whatsapp_cliente, notas FROM clientes_indicador WHERE id = ? AND codigo_indicacao = ?")
      .bind(body.clienteId, body.codigo)
      .first<{ nome_cliente: string; whatsapp_cliente: string | null; notas: string | null }>();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado pra esse código." }, { status: 404 });
    }

    // Diagnóstico é OPCIONAL aqui — diferente de /api/indicadores/parecer.
    // Se não achar, segue sem ele; nunca bloqueia a geração.
    let diagnosticoResumo: string | undefined;
    if (cliente.whatsapp_cliente) {
      const alvo = normalizarWhatsapp(cliente.whatsapp_cliente);
      const leads = await db
        .prepare(
          "SELECT diagnostico_resumo, whatsapp_contato FROM leads " +
            "WHERE whatsapp_contato IS NOT NULL AND diagnostico_resumo IS NOT NULL ORDER BY criado_em DESC",
        )
        .all<{ diagnostico_resumo: string; whatsapp_contato: string }>();
      const lead = (leads.results ?? []).find((l) => normalizarWhatsapp(l.whatsapp_contato) === alvo);
      diagnosticoResumo = lead?.diagnostico_resumo;
    }

    await llmAdapter.connect(process.env);
    const mensagem = await gerarProximaMensagem({
      nomeCliente: cliente.nome_cliente,
      notasVendedor: cliente.notas ?? undefined,
      diagnosticoResumo,
    });

    return NextResponse.json(mensagem);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar mensagem.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
