// AUTOSETUP — apps/core/web/src/app/api/indicadores/parecer/route.ts
// Gera (uma vez) a sequência de prioridades e guarda no D1, junto com
// o índice de qual passo está ativo. POST gera se ainda não existir;
// PATCH avança pro próximo passo quando o atual é marcado resolvido.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { llmAdapter } from "@autosetup/adapter-llm";
import { gerarParecer, type ItemParecer } from "@/lib/gerarParecer";
import { verificarRateLimit } from "@/lib/rateLimit";

/** Normaliza pra comparação — pega só os últimos 11 dígitos (DDD +
 * número), ignorando se tem "55" (DDI) na frente ou não. Bug real
 * pego em teste: "5535977776666" e "35977776666" são o mesmo número,
 * mas não batiam com normalização ingênua (só remover não-dígito). */
function normalizarWhatsapp(v: string): string {
  const somenteDigitos = v.replace(/\D/g, "");
  return somenteDigitos.slice(-11);
}

interface EstadoParecer {
  itens: ItemParecer[];
  indice: number;
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

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const cliente = await db
      .prepare(
        "SELECT nome_cliente, whatsapp_cliente, notas, pareceres_json, parecer_indice " +
          "FROM clientes_indicador WHERE id = ? AND codigo_indicacao = ?",
      )
      .bind(body.clienteId, body.codigo)
      .first<{
        nome_cliente: string;
        whatsapp_cliente: string | null;
        notas: string | null;
        pareceres_json: string | null;
        parecer_indice: number | null;
      }>();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado pra esse código." }, { status: 404 });
    }

    // Já existe sequência gerada — devolve o estado salvo, não gera de novo.
    if (cliente.pareceres_json) {
      const itens = JSON.parse(cliente.pareceres_json) as ItemParecer[];
      return NextResponse.json({ itens, indice: cliente.parecer_indice ?? 0 } satisfies EstadoParecer);
    }

    if (!cliente.whatsapp_cliente) {
      return NextResponse.json(
        { error: "Esse cliente não tem WhatsApp cadastrado — não dá pra achar o diagnóstico dele sem isso." },
        { status: 400 },
      );
    }

    const hasAnyProvider = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY", "CEREBRAS_API_KEY"].some(
      (key) => Boolean(process.env[key]),
    );
    if (!hasAnyProvider) {
      return NextResponse.json({ error: "Nenhum provider de LLM configurado neste ambiente." }, { status: 503 });
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
    const itens = await gerarParecer({
      nomeNegocio: lead.nome_negocio,
      nicho: lead.nicho,
      maiorDificuldade: lead.maior_dificuldade,
      diagnosticoResumo: lead.diagnostico_resumo,
      notasVendedor: cliente.notas ?? undefined,
    });

    if (itens.length === 0) {
      return NextResponse.json({ error: "Não foi possível identificar uma prioridade real com o dado disponível." }, { status: 502 });
    }

    await db
      .prepare("UPDATE clientes_indicador SET pareceres_json = ?, parecer_indice = 0 WHERE id = ?")
      .bind(JSON.stringify(itens), body.clienteId)
      .run();

    return NextResponse.json({ itens, indice: 0 } satisfies EstadoParecer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar parecer.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}

/** Marca o passo atual como resolvido e avança pro próximo — só quando
 * de fato confirmado, não é automático. */
export async function PATCH(request: Request) {
  const body = (await request.json()) as { codigo?: string; clienteId?: number };
  if (!body.codigo || !body.clienteId) {
    return NextResponse.json({ error: "Informe o código e o cliente." }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const cliente = await db
      .prepare("SELECT pareceres_json, parecer_indice FROM clientes_indicador WHERE id = ? AND codigo_indicacao = ?")
      .bind(body.clienteId, body.codigo)
      .first<{ pareceres_json: string | null; parecer_indice: number | null }>();

    if (!cliente?.pareceres_json) {
      return NextResponse.json({ error: "Nenhum parecer gerado ainda pra esse cliente." }, { status: 404 });
    }

    const itens = JSON.parse(cliente.pareceres_json) as ItemParecer[];
    const indiceAtual = cliente.parecer_indice ?? 0;
    const novoIndice = Math.min(indiceAtual + 1, itens.length);

    await db
      .prepare("UPDATE clientes_indicador SET parecer_indice = ? WHERE id = ?")
      .bind(novoIndice, body.clienteId)
      .run();

    return NextResponse.json({ itens, indice: novoIndice } satisfies EstadoParecer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao avançar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
