// AUTOSETUP — apps/core/api
// Ponto de entrada HTTP mínimo do Core, fase EBK 0.1. Critério de saída
// (EBK 0.1): `pnpm dev` sobe este servidor e responde em /health.
// Framework definitivo (Next API routes vs NestJS) é decisão IMP em aberto.

import { createServer } from "node:http";
import { listWorkers } from "@autosetup/workers-registry";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", workers: listWorkers() }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`[autosetup-api] ouvindo em http://localhost:${PORT} (EBK 0.1 — esqueleto real)`);
});
