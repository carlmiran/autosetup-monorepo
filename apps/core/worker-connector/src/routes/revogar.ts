import { sha256Hex } from "../lib/schemas";
import type { Env } from "../env";

// POST /api/connector/revogar
// Header: Authorization: Bearer <token>
// Chamado pelo desinstalador (Passo 7) antes de remover o binário.
export async function handleRevogar(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ erro: "token ausente" }, 401);

  const tokenHash = await sha256Hex(token);
  const result = await env.DB.prepare(
    `UPDATE connectors SET status = 'revogado' WHERE token_hash = ? AND status != 'revogado'`
  )
    .bind(tokenHash)
    .run();

  // Idempotente: se o token não existir mais ou já estiver revogado,
  // ainda retorna 200 — o desinstalador não deve travar por isso.
  return json({ revogado: true, alterou: result.meta.changes > 0 });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
