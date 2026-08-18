import { sha256Hex } from "../lib/schemas";
import type { Env, SyncQueueMessage } from "../env";

// POST /api/connector/sync
// Header: Authorization: Bearer <token>
// multipart/form-data: file=<arquivo>, hash=<sha256 declarado pelo agente>
export async function handleSync(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ erro: "token ausente" }, 401);

  const tokenHash = await sha256Hex(token);
  const connector = await env.DB.prepare(
    `SELECT connector_id, property_id, status FROM connectors WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ connector_id: string; property_id: string; status: string }>();

  if (!connector) return json({ erro: "token inválido" }, 401);
  if (connector.status !== "ativo") return json({ erro: `conector ${connector.status}` }, 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ erro: "esperado multipart/form-data" }, 400);
  }

  const fileEntry = form.get("file");
  const hashDeclarado = String(form.get("hash") ?? "");
  if (!fileEntry || typeof fileEntry === "string") {
    return json({ erro: "campo 'file' ausente" }, 400);
  }
  const file = fileEntry as File;
  if (!hashDeclarado) return json({ erro: "campo 'hash' ausente" }, 400);

  const bytes = await file.arrayBuffer();
  const hashReal = await sha256Hex(bytes);
  if (hashReal !== hashDeclarado.toLowerCase()) {
    return json({ erro: "hash não confere com o conteúdo enviado" }, 400);
  }

  const r2Key = `connector-uploads/${connector.property_id}/${file.name}-${hashReal}`;
  await env.CONNECTOR_UPLOADS.put(r2Key, bytes, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const message: SyncQueueMessage = {
    connector_id: connector.connector_id,
    property_id: connector.property_id,
    r2_key: r2Key,
    filename: file.name,
  };
  await env.SYNC_QUEUE.send(message);

  await env.DB.prepare(`UPDATE connectors SET ultimo_heartbeat = CURRENT_TIMESTAMP WHERE connector_id = ?`)
    .bind(connector.connector_id)
    .run();

  // Responde rápido — o parsing acontece assíncrono no consumidor da fila.
  return json({ recebido: true, r2_key: r2Key }, 202);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
