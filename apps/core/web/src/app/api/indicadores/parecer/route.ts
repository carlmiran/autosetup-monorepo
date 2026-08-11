// AUTOSETUP — apps/core/web/src/app/api/indicadores/parecer/route.ts

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { llmAdapter } from "@autosetup/adapter-llm";
import { gerarParecer } from "@/lib/gerarParecer";
import { verificarRateLimit } from "@/lib/rateLimit";

/** Normaliza pra comparação — pega só os últimos 11 dígitos (DDD +
 * número), ignorando se tem "55" (DDI) na frente ou não. Bug real
 * pego em teste: "5535977776666" e "35977776666" são o mesmo número,
 * mas não batiam com normalização ingênua (só remover não-dígito). */
function normalizarWhatsapp(v: string): string {
  const somenteDigitos = v.replace(/\D/g, "");
  return somenteDigitos.slice(-11);
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "indicador-parecer", maximo: 20, janelaMinutos: 60 });
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
    if (!cliente.whatsapp_cliente) {
      return NextResponse.json(
        { error: "Esse cliente não tem WhatsApp cadastrado — não dá pra achar o diagnóstico dele sem isso." },
        { status: 400 },
      );
    }

    const alvo = normalizarWhatsapp(cliente.whatsapp_cliente);
    const leads = await db
      .prepare(
        "SELECT nome_negocio, nicho, maior_dificuldade, diagnostico_resumo, whatsapp_contato " +
          "FROM leads WHERE whatsapp_contato IS NOT NULL AND diagnostico_resumo IS NOT NULL ORDER BY criado_em DESC",
      )
      .all<{
        nome_negocio: string;
        nicho: string;
        maior_dificuldade: string;
        diagnostico_resumo: string;
        whatsapp_contato: string;
      }>();

    const lead = (leads.results ?? []).find((l) => normalizarWhatsapp(l.whatsapp_contato) === alvo);

    if (!lead) {
      return NextResponse.json(
        { error: "Não achei diagnóstico real desse cliente ainda — sem isso, não dá pra gerar parecer honesto." },
        { status: 404 },
      );
    }

    await llmAdapter.connect(process.env);
    const parecer = await gerarParecer({
      nomeNegocio: lead.nome_negocio,
      nicho: lead.nicho,
      maiorDificuldade: lead.maior_dificuldade,
      diagnosticoResumo: lead.diagnostico_resumo,
      notasVendedor: cliente.notas ?? undefined,
    });

    return NextResponse.json(parecer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar parecer.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
