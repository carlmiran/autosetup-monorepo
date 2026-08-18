import { handleParear } from "./routes/parear";
import { handleSync } from "./routes/sync";
import { handleRevogar } from "./routes/revogar";
import { handleQueueBatch } from "./queue-consumer";
import type { Env, SyncQueueMessage } from "./env";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/api/connector/parear") {
      return handleParear(req, env);
    }
    if (req.method === "POST" && url.pathname === "/api/connector/sync") {
      return handleSync(req, env);
    }
    if (req.method === "POST" && url.pathname === "/api/connector/revogar") {
      return handleRevogar(req, env);
    }

    return new Response("not found", { status: 404 });
  },

  async queue(batch: MessageBatch<SyncQueueMessage>, env: Env): Promise<void> {
    await handleQueueBatch(batch, env);
  },
};
