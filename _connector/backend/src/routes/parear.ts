import { sha256Hex, gerarTokenLongo } from "../lib/schemas";
import type { Env } from "../env";

// POST /api/connector/parear
// body JSON: { codigo_pareamento: string, pasta_autorizada?: string }
// Retorna o token em texto plano UMA ÚNICA VEZ — o agente deve salvar
// local e criptografado (Windows Credential Manager / DPAPI).
export async function handleParear(req: Request, env: Env): Promise<Response> {
  let body: { codigo_pareamento?: string; pasta_autorizada?: string };
  try {
    body = await req.json();
  } catch {
    return json({ erro: "corpo inválido, esperado JSON" }, 400);
  }

  const codigo = (body.codigo_pareamento ?? "").trim();
  if (!codigo) {
    return json({ erro: "codigo_pareamento é obrigatório" }, 400);
  }

  const pairing = await env.DB.prepare(
    `SELECT codigo, property_id, usado FROM connector_pairing_codes WHERE codigo = ?`
  )
    .bind(codigo)
    .first<{ codigo: string; property_id: string; usado: number }>();

  if (!pairing) {
    return json({ erro: "código de pareamento não encontrado" }, 404);
  }
  if (pairing.usado) {
    return json({ erro: "código de pareamento já utilizado" }, 409);
  }

  const connectorId = crypto.randomUUID();
  const token = gerarTokenLongo();
  const tokenHash = await sha256Hex(token);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO connectors (connector_id, property_id, token_hash, pasta_autorizada, status)
       VALUES (?, ?, ?, ?, 'ativo')`
    ).bind(connectorId, pairing.property_id, tokenHash, body.pasta_autorizada ?? null),
    env.DB.prepare(
      `UPDATE connector_pairing_codes SET usado = 1, usado_em = CURRENT_TIMESTAMP WHERE codigo = ?`
    ).bind(codigo),
  ]);

  return json({
    connector_id: connectorId,
    property_id: pairing.property_id,
    token, // única vez que isso é retornado
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
