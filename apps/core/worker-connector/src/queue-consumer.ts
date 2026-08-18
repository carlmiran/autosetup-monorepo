import * as XLSX from "xlsx";
import { identificarSchemaPorArquivo, normalizarCabecalho, type CampoSchema, type TabelaSchema } from "./lib/schemas";
import type { Env, SyncQueueMessage } from "./env";

export async function handleQueueBatch(batch: MessageBatch<SyncQueueMessage>, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await processarMensagem(msg.body, env);
      msg.ack();
    } catch (err) {
      // Erro inesperado (não de validação de coluna) — deixa a fila
      // reentregar via retry nativo do Cloudflare Queues.
      console.error("Falha ao processar job do connector:", err);
      msg.retry();
    }
  }
}

async function processarMensagem(job: SyncQueueMessage, env: Env): Promise<void> {
  const schema = identificarSchemaPorArquivo(job.filename);
  if (!schema) {
    await registrarErro(env, job, `tipo de arquivo não reconhecido pelo nome: "${job.filename}"`);
    return;
  }

  const obj = await env.CONNECTOR_UPLOADS.get(job.r2_key);
  if (!obj) {
    await registrarErro(env, job, `arquivo não encontrado no R2: ${job.r2_key}`);
    return;
  }
  const bytes = await obj.arrayBuffer();

  const linhas = parsearPlanilha(bytes, job.filename);
  if (linhas.length === 0) {
    await registrarErro(env, job, "planilha vazia ou sem linhas de dado");
    return;
  }

  // Confere se as colunas obrigatórias existem em pelo menos o cabeçalho
  const cabecalhosNormalizados = new Set(Object.keys(linhas[0]!));
  const faltando = schema.campos
    .filter((c) => c.obrigatorio)
    .filter((c) => !c.aliases.some((a) => cabecalhosNormalizados.has(a)));

  if (faltando.length > 0) {
    await registrarErro(
      env,
      job,
      `colunas obrigatórias ausentes: ${faltando.map((c) => c.campo).join(", ")}`
    );
    return;
  }

  let linhasComErro = 0;
  const statements: D1PreparedStatement[] = [];

  for (const linha of linhas) {
    const { valores, erro } = mapearLinha(linha, schema);
    if (erro) {
      linhasComErro++;
      continue;
    }
    statements.push(montarUpsert(env, job.property_id, schema, valores!));
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  if (linhasComErro > 0) {
    await registrarErro(
      env,
      job,
      `${linhasComErro} linha(s) ignorada(s) por dado inválido/obrigatório ausente (${statements.length} gravada(s) com sucesso)`
    );
  }

  // Regeneração do diagnóstico LENS com o dado atualizado (opcional).
  // Integração real depende do serviço interno do AutoSetup Core —
  // deixado como stub explícito para não inventar um contrato de API.
  if (env.LENS_REFRESH_URL) {
    try {
      await fetch(env.LENS_REFRESH_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ property_id: job.property_id, motivo: "connector_sync" }),
      });
    } catch (err) {
      console.error("Falha ao disparar regeneração do LENS (não bloqueante):", err);
    }
  }
}

// ---------------------------------------------------------------------
// Parsing de XLSX/CSV -> array de objetos { cabecalho_normalizado: valor }
// ---------------------------------------------------------------------
function parsearPlanilha(bytes: ArrayBuffer, filename: string): Record<string, unknown>[] {
  const wb = XLSX.read(bytes, { type: "array" });
  const primeiraAba = wb.SheetNames[0];
  if (!primeiraAba) return [];
  const sheet = wb.Sheets[primeiraAba];
  if (!sheet) return [];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (rows.length === 0) return [];
  const header = (rows[0] as unknown[]).map((h) => normalizarCabecalho(String(h ?? "")));

  const out: Record<string, unknown>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (row.every((v) => v === null || v === undefined || v === "")) continue; // linha vazia
    const obj: Record<string, unknown> = {};
    header.forEach((h, idx) => {
      if (h) obj[h] = row[idx] ?? null;
    });
    out.push(obj);
  }
  return out;
}

// ---------------------------------------------------------------------
// Converte uma linha bruta (cabeçalhos normalizados -> valor) nos
// campos tipados do schema, usando os aliases para achar cada coluna.
// ---------------------------------------------------------------------
function mapearLinha(
  linha: Record<string, unknown>,
  schema: TabelaSchema
): { valores?: Record<string, unknown>; erro?: string } {
  const valores: Record<string, unknown> = {};

  for (const campo of schema.campos) {
    const chaveEncontrada = campo.aliases.find((a) => a in linha);
    const bruto = chaveEncontrada ? linha[chaveEncontrada] : null;

    if ((bruto === null || bruto === undefined || bruto === "") ) {
      if (campo.obrigatorio) return { erro: `campo obrigatório ausente: ${campo.campo}` };
      valores[campo.campo] = null;
      continue;
    }

    valores[campo.campo] = converterValor(bruto, campo);
    if (campo.tipo === "enum" && campo.enumValues && !campo.enumValues.includes(String(valores[campo.campo]))) {
      return { erro: `valor inválido para ${campo.campo}: "${bruto}"` };
    }
  }

  return { valores };
}

function converterValor(bruto: unknown, campo: CampoSchema): unknown {
  switch (campo.tipo) {
    case "numero": {
      const n = typeof bruto === "number" ? bruto : parseFloat(String(bruto).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "data": {
      // Aceita Date (xlsx com célula formatada como data), serial do
      // Excel, ou string ISO/BR (dd/mm/aaaa).
      if (bruto instanceof Date) return bruto.toISOString().slice(0, 10);
      if (typeof bruto === "number") {
        const d = XLSX.SSF.parse_date_code(bruto);
        if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      }
      const str = String(bruto).trim();
      const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
      return str; // assume já ISO
    }
    case "enum":
      return normalizarCabecalho(String(bruto));
    default:
      return String(bruto).trim();
  }
}

// ---------------------------------------------------------------------
// Monta o INSERT ... ON CONFLICT (upsert) para a tabela do schema
// ---------------------------------------------------------------------
function montarUpsert(
  env: Env,
  propertyId: string,
  schema: TabelaSchema,
  valores: Record<string, unknown>
): D1PreparedStatement {
  const colunas = ["property_id", ...schema.campos.map((c) => c.campo)];
  const placeholders = colunas.map(() => "?").join(", ");
  const binds = [propertyId, ...schema.campos.map((c) => valores[c.campo])];

  const colunasAtualizaveis = schema.campos
    .map((c) => c.campo)
    .filter((c) => !schema.chaveNatural.includes(c));
  const setClause = colunasAtualizaveis.map((c) => `${c} = excluded.${c}`).join(", ");
  const conflictCols = ["property_id", ...schema.chaveNatural].join(", ");

  const sql = `
    INSERT INTO ${schema.tabela} (${colunas.join(", ")})
    VALUES (${placeholders})
    ON CONFLICT (${conflictCols}) DO UPDATE SET
      ${setClause}, atualizado_em = CURRENT_TIMESTAMP
  `;

  return env.DB.prepare(sql).bind(...binds);
}

// ---------------------------------------------------------------------
// Log de erro + alerta por e-mail (Resend), sem falhar silenciosamente
// ---------------------------------------------------------------------
async function registrarErro(env: Env, job: SyncQueueMessage, erro: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO connector_sync_errors (property_id, connector_id, filename, r2_key, erro)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(job.property_id, job.connector_id, job.filename, job.r2_key, erro)
    .run();

  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL_TO) return;

  try {
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.ALERT_EMAIL_FROM ?? "connector@autosetup.digital",
        to: env.ALERT_EMAIL_TO,
        subject: `[Connector] Erro de sincronização — ${job.property_id}`,
        text: `Arquivo: ${job.filename}\nProperty: ${job.property_id}\nR2 key: ${job.r2_key}\n\nErro: ${erro}`,
      }),
    });
    // fetch só rejeita em falha de rede — status HTTP de erro (ex.: domínio
    // do remetente não verificado) não lança exceção, então precisa checar
    // resendResp.ok explicitamente pra não tratar recusa da API como sucesso.
    const resendBody = await resendResp.text();
    if (!resendResp.ok) {
      console.error(`Resend recusou o alerta (HTTP ${resendResp.status}): ${resendBody}`);
    } else {
      console.log(`Resend aceitou o alerta (HTTP ${resendResp.status}): ${resendBody}`);
    }
  } catch (err) {
    console.error("Falha ao enviar alerta por e-mail (não bloqueante):", err);
  }
}
