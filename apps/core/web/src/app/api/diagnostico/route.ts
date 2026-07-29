// AUTOSETUP — apps/core/web/src/app/api/diagnostico/route.ts
// Fonte: LENS (Core), IMP-LLM-001 (Gateway multi-provider), pesquisa real
// via OpenAI Responses API (web_search tool), persistência real de lead
// via Cloudflare D1 (banco "autosetup-leads", tabela "leads").

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { llmAdapter } from "@autosetup/adapter-llm";
import {
  gerarDiagnostico,
  gerarDiagnosticoComPesquisa,
  type DiagnosticoInput,
  type DiagnosticoResultado,
} from "@/lib/diagnostico";

const SUPPORTED_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "CEREBRAS_API_KEY",
] as const;

interface DadosContato {
  nomeContato?: string;
  whatsappContato?: string;
}

/** Salva o lead no D1 real. Best-effort: se o binding não existir (ex.
 * rodando fora do Cloudflare) ou a query falhar, registra no log mas
 * NUNCA derruba a resposta do diagnóstico — a pessoa já pagou o custo
 * de preencher o formulário, o diagnóstico tem que aparecer de qualquer
 * jeito. Falha de persistência é observável, não é bloqueante. */
async function salvarLead(
  input: DiagnosticoInput & DadosContato,
  resultado: DiagnosticoResultado,
): Promise<number | null> {
  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) {
      console.warn("[diagnostico] binding D1 'DB' não encontrado — lead não persistido.");
      return null;
    }

    const result = await db
      .prepare(
        `INSERT INTO leads (
          nome_contato, whatsapp_contato, nome_negocio, cidade, nicho,
          tamanho_equipe, canais_atendimento, ferramentas_atuais, perda_financeira,
          maior_dificuldade, rotina_diaria, o_que_atrapalha, sobrecarga,
          visao_negocio, meta_financeira, diagnostico_resumo, perguntas_nicho
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.nomeContato ?? null,
        input.whatsappContato ?? null,
        input.nomeNegocio,
        input.cidade,
        input.nicho,
        input.tamanhoEquipe ?? null,
        input.canaisAtendimento ?? null,
        input.ferramentasAtuais ?? null,
        input.perdaFinanceira ?? null,
        input.maiorDificuldade,
        input.rotinaDiaria ?? null,
        input.oQueAtrapalha ?? null,
        input.sobrecarga ?? null,
        input.visaoNegocio ?? null,
        input.metaFinanceira ?? null,
        resultado.resumo ?? null,
        input.perguntasNicho ? JSON.stringify(input.perguntasNicho) : null,
      )
      .run();

    return result.meta.last_row_id ?? null;
  } catch (err) {
    console.error("[diagnostico] falha ao salvar lead no D1:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DiagnosticoInput> & DadosContato;

  // Validação real — não deixa passar diagnóstico com dado essencial faltando.
  if (!body.nomeNegocio || !body.cidade || !body.nicho || !body.maiorDificuldade) {
    return NextResponse.json(
      { error: "Preencha nome do negócio, cidade, nicho e maior dificuldade." },
      { status: 400 },
    );
  }

  const input: DiagnosticoInput & DadosContato = {
    nomeNegocio: body.nomeNegocio,
    cidade: body.cidade,
    nicho: body.nicho,
    temSite: Boolean(body.temSite),
    temInstagram: Boolean(body.temInstagram),
    temGoogleBusiness: Boolean(body.temGoogleBusiness),
    numeroAvaliacoesGoogle:
      typeof body.numeroAvaliacoesGoogle === "number" ? body.numeroAvaliacoesGoogle : null,
    notaMediaGoogle: typeof body.notaMediaGoogle === "number" ? body.notaMediaGoogle : null,
    maiorDificuldade: body.maiorDificuldade,
    rotinaDiaria: body.rotinaDiaria || undefined,
    oQueAtrapalha: body.oQueAtrapalha || undefined,
    sobrecarga: body.sobrecarga || undefined,
    visaoNegocio: body.visaoNegocio || undefined,
    metaFinanceira: body.metaFinanceira || undefined,
    tamanhoEquipe: body.tamanhoEquipe || undefined,
    canaisAtendimento: body.canaisAtendimento || undefined,
    ferramentasAtuais: body.ferramentasAtuais || undefined,
    perdaFinanceira: body.perdaFinanceira || undefined,
    perguntasNicho: Array.isArray(body.perguntasNicho) ? body.perguntasNicho : undefined,
    linkInstagram: body.linkInstagram || undefined,
    linkGoogleBusiness: body.linkGoogleBusiness || undefined,
    nomeContato: body.nomeContato || undefined,
    whatsappContato: body.whatsappContato || undefined,
  };

  const quererPesquisa = Boolean(input.linkInstagram || input.linkGoogleBusiness);

  // Pesquisa real exige especificamente OPENAI_API_KEY (web_search é
  // capacidade hospedada da OpenAI, não generaliza pro Gateway).
  if (quererPesquisa && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Você informou um link, mas a pesquisa real na web exige OPENAI_API_KEY configurada (não encontrada). Configure-a ou tente sem os links.",
      },
      { status: 503 },
    );
  }

  if (quererPesquisa) {
    try {
      const resultado = await gerarDiagnosticoComPesquisa(input);
      const leadId = await salvarLead(input, resultado);
      return NextResponse.json({ ...resultado, leadId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido na pesquisa real.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // Modo sem pesquisa: Gateway multi-provider, basta UM provider configurado.
  const hasAnyProvider = SUPPORTED_KEYS.some((key) => Boolean(process.env[key]));
  if (!hasAnyProvider) {
    return NextResponse.json(
      {
        error:
          "Nenhum provider de LLM configurado neste ambiente. Configure ao menos uma das chaves: " +
          SUPPORTED_KEYS.join(", ") +
          " — ver .env.example.",
      },
      { status: 503 },
    );
  }

  try {
    await llmAdapter.connect(process.env);
    const resultado = await gerarDiagnostico(input);
    const leadId = await salvarLead(input, resultado);
    return NextResponse.json({ ...resultado, leadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao gerar diagnóstico.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await llmAdapter.disconnect();
  }
}
