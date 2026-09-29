// AUTOSETUP — apps/core/web/src/app/api/admin/connector/criar/route.ts
// Self-service de código de pareamento do Connector — antes disso só
// existia via SQL manual no D1 (INSERT direto em connector_pairing_codes,
// ver docs/traceability.md). Escreve na mesma tabela, mesmo banco
// (autosetup-leads) que o worker-connector já usa — esta rota não cria
// nenhuma tabela/infra nova, só um jeito de inserir sem terminal.
//
// Auditoria (antes desta feature) confirmou: não existe nenhum sistema
// de login no monorepo pra reaproveitar. Proteção aqui é uma senha
// compartilhada (CONNECTOR_ADMIN_SECRET, secret de Worker/Pages — nunca
// commitado, ver docs/secrets-registry.md) — proporcional ao padrão já
// usado no resto do projeto ("posse de segredo = acesso", sem sessão de
// usuário), não uma autenticação de verdade.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verificarRateLimit } from "@/lib/rateLimit";

interface CorpoRequisicao {
  secret?: string;
  nomeNegocio?: string;
  unidades?: string[];
  codigoIndicacao?: string;
}

interface UnidadeCriada {
  unidade: string;
  propertyId: string;
  codigoPareamento: string;
}

export async function POST(request: Request) {
  const limite = await verificarRateLimit(request, { rota: "admin-connector-criar", maximo: 20, janelaMinutos: 10 });
  if (!limite.permitido) {
    return NextResponse.json({ error: "Muitas tentativas — aguarde alguns minutos." }, { status: 429 });
  }

  let body: CorpoRequisicao;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido, esperado JSON." }, { status: 400 });
  }

  const secretConfigurado = process.env.CONNECTOR_ADMIN_SECRET;
  if (!secretConfigurado) {
    return NextResponse.json(
      { error: "CONNECTOR_ADMIN_SECRET não configurado — cadastre o secret antes de usar esta rota (ver docs/secrets-registry.md)." },
      { status: 503 },
    );
  }
  if (!comparacaoSeguraIgual(body.secret ?? "", secretConfigurado)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const nomeNegocio = (body.nomeNegocio ?? "").trim();
  if (!nomeNegocio) {
    return NextResponse.json({ error: "Informe o nome do negócio." }, { status: 400 });
  }

  const unidadesBrutas = (body.unidades ?? []).map((u) => u.trim()).filter((u) => u.length > 0);
  const unidades = unidadesBrutas.length > 0 ? unidadesBrutas : [""]; // "" = negócio de unidade única, sem sufixo

  const codigoIndicacao = (body.codigoIndicacao ?? "").trim() || null;

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return NextResponse.json({ error: "Banco indisponível." }, { status: 503 });

    const baseSlug = fatiar(nomeNegocio, 24);
    const baseCodigo = baseSlug.toUpperCase();
    if (!baseSlug) {
      return NextResponse.json({ error: "Nome do negócio não gerou nenhum caractere válido pro código." }, { status: 400 });
    }

    let proximoNumero = await proximoNumeroDisponivel(db, baseCodigo);

    const criados: UnidadeCriada[] = [];
    const statements: D1PreparedStatement[] = [];

    for (const unidade of unidades) {
      const sufixoUnidade = unidade ? `-${fatiar(unidade, 16)}` : "";
      const propertyId = `${baseSlug}${sufixoUnidade}`;
      const codigoPareamento = `${baseCodigo}-${String(proximoNumero).padStart(3, "0")}`;
      proximoNumero++;

      statements.push(
        db
          .prepare(
            `INSERT INTO connector_pairing_codes (codigo, property_id, codigo_indicacao) VALUES (?, ?, ?)`,
          )
          .bind(codigoPareamento, propertyId, codigoIndicacao),
      );
      criados.push({ unidade: unidade || nomeNegocio, propertyId, codigoPareamento });
    }

    await db.batch(statements);

    return NextResponse.json({
      criados,
      instaladorUrl: "/downloads/AutoSetupConnector-Setup-1.0.0.exe",
    });
  } catch (err) {
    // Erro mais provável aqui: coluna codigo_indicacao ainda não existe
    // (migration 0003_pareamento_indicador.sql não aplicada) — mensagem
    // deliberadamente não esconde isso atrás de um "erro genérico".
    const message = err instanceof Error ? err.message : "Erro ao criar código de pareamento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Maior sufixo numérico já usado por códigos "BASE-NNN" existentes, +1 — começa em 1 se nenhum existir. Evita colidir com PK ao rodar de novo pro mesmo negócio (ex.: adicionar uma unidade depois). */
async function proximoNumeroDisponivel(db: D1Database, baseCodigo: string): Promise<number> {
  const existentes = await db
    .prepare(`SELECT codigo FROM connector_pairing_codes WHERE codigo LIKE ? || '-%'`)
    .bind(baseCodigo)
    .all<{ codigo: string }>();

  let maiorNumero = 0;
  for (const row of existentes.results ?? []) {
    const sufixo = row.codigo.slice(baseCodigo.length + 1);
    const n = Number(sufixo);
    if (Number.isInteger(n) && n > maiorNumero) maiorNumero = n;
  }
  return maiorNumero + 1;
}

/** Minúsculas, sem acento, só [a-z0-9-], colapsa/trim hífens, corta em maxLen. */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function fatiar(texto: string, maxLen: number): string {
  return texto
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
}

/** Comparação de tempo constante (evita timing attack pra descobrir o secret por tentativa e erro). */
function comparacaoSeguraIgual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) {
    // Ainda percorre bufB inteiro (tamanho real) pra não vazar o
    // comprimento de `a` por tempo de resposta, mesmo descartando o resultado.
    let soma = 0;
    for (let i = 0; i < bufB.length; i++) soma |= bufB[i]!;
    return soma === -1;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i]! ^ bufB[i]!;
  return diff === 0;
}
