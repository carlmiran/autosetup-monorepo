// AUTOSETUP — apps/core/web/src/app/api/rh/entrevista/route.ts
// Fonte: pedido de Carlos (29/07/2026) — entrevista de alimentação do
// AutoSetup RH, respondida pela especialista de domínio (cliente zero).

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { llmAdapter } from "@autosetup/adapter-llm";
import { gerarSinteseEntrevista, type EntrevistaRhInput } from "@/lib/entrevistaRh";
import { verificarRateLimit } from "@/lib/rateLimit";

const SUPPORTED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "CEREBRAS_API_KEY",
] as const;

async function salvarEntrevista(
  input: EntrevistaRhInput,
  resumo: string,
): Promise<number | null> {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return null;

    const resultado = await db
      .prepare(
        `INSERT INTO rh_entrevistas (
          nome, formacao, fascina_rh, processos_mal_resolvidos, ferramenta_ideal,
          processo_contratacao_ideal, erros_comuns, termos_importantes,
          nunca_automatizar, orgulho, resumo_estruturado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.nome,
        input.formacao ?? null,
        input.fascinaRh,
        input.processosMalResolvidos,
        input.ferramentaIdeal,
        input.processoContratacaoIdeal ?? null,
        input.errosComuns ?? null,
        input.termosImportantes ?? null,
        input.nuncaAutomatizar ?? null,
        input.orgulho ?? null,
        resumo,
      )
      .run();

    return resultado.meta.last_row_id ?? null;
  } catch (err) {
    console.error("[rh/entrevista] falha ao salvar no D1:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "rh-entrevista", maximo: 5, janelaMinutos: 60 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Espere um pouco e tente de novo." }, { status: 429 });
  }

  const body = (await request.json()) as Partial<EntrevistaRhInput>;

  if (!body.nome || !body.fascinaRh || !body.processosMalResolvidos || !body.ferramentaIdeal) {
    return NextResponse.json(
      { error: "Preencha ao menos nome, o que fascina em RH, dores e a ferramenta ideal." },
      { status: 400 },
    );
  }

  const hasAnyProvider = SUPPORTED_KEYS.some((key) => Boolean(process.env[key]));
  if (!hasAnyProvider) {
    return NextResponse.json(
      { error: "Nenhum provider de LLM configurado neste ambiente." },
      { status: 503 },
    );
  }

  const input: EntrevistaRhInput = {
    nome: body.nome,
    formacao: body.formacao || undefined,
    fascinaRh: body.fascinaRh,
    processosMalResolvidos: body.processosMalResolvidos,
    ferramentaIdeal: body.ferramentaIdeal,
    processoContratacaoIdeal: body.processoContratacaoIdeal || undefined,
    errosComuns: body.errosComuns || undefined,
    termosImportantes: body.termosImportantes || undefined,
    nuncaAutomatizar: body.nuncaAutomatizar || undefined,
    orgulho: body.orgulho || undefined,
  };

  try {
    await llmAdapter.connect(process.env);
    const resultado = await gerarSinteseEntrevista(input);
    const entrevistaId = await salvarEntrevista(input, resultado.resumoExecutivo);
    return NextResponse.json({ ...resultado, entrevistaId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
