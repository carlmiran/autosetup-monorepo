// AUTOSETUP — teste real do middleware de Basic Auth (Etapa 0.1).
// Roda o `middleware()` de verdade com NextRequest, sem servidor:
//   npx tsx scripts/test-admin-auth.ts   (dentro de apps/core/web)

import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

const SENHA = "senha-de-teste-123";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FALHOU: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

function basic(senha: string, usuario = "admin"): string {
  const bytes = new TextEncoder().encode(`${usuario}:${senha}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

function status(caminho: string, opcoes: { metodo?: string; authorization?: string } = {}): number {
  const headers = new Headers();
  if (opcoes.authorization) headers.set("authorization", opcoes.authorization);
  const req = new NextRequest(`https://exemplo.test${caminho}`, { method: opcoes.metodo ?? "GET", headers });
  const res = middleware(req);
  // NextResponse.next() devolve 200 com o header x-middleware-next.
  return res.status;
}

const ROTAS_PROTEGIDAS: [string, string][] = [
  ["/admin/clientes", "GET"],
  ["/admin/connector", "GET"],
  ["/api/admin/clientes", "GET"],
  ["/api/admin/comissoes", "POST"],
  ["/api/admin/connector/criar", "POST"],
  ["/api/avisos", "POST"],
];

// Secret ausente -> 503 (fail-closed), mesmo com credencial.
delete process.env.ADMIN_PASSWORD;
for (const [rota, metodo] of ROTAS_PROTEGIDAS) {
  assert(status(rota, { metodo }) === 503, `${metodo} ${rota} sem ADMIN_PASSWORD -> 503`);
  assert(
    status(rota, { metodo, authorization: basic(SENHA) }) === 503,
    `${metodo} ${rota} sem ADMIN_PASSWORD, com credencial -> 503`,
  );
}

process.env.ADMIN_PASSWORD = SENHA;
for (const [rota, metodo] of ROTAS_PROTEGIDAS) {
  assert(status(rota, { metodo }) === 401, `${metodo} ${rota} sem credencial -> 401`);
  assert(status(rota, { metodo, authorization: basic("errada") }) === 401, `${metodo} ${rota} senha errada -> 401`);
  assert(
    status(rota, { metodo, authorization: basic(SENHA.slice(0, -1)) }) === 401,
    `${metodo} ${rota} senha com 1 caractere a menos -> 401`,
  );
  assert(status(rota, { metodo, authorization: "Basic !!!nao-base64" }) === 401, `${metodo} ${rota} header malformado -> 401`);
  assert(status(rota, { metodo, authorization: basic(SENHA) }) === 200, `${metodo} ${rota} senha certa -> 200`);
}

// Senha com acento (UTF-8) também funciona.
process.env.ADMIN_PASSWORD = "senhá-ção";
assert(status("/admin/avisos", { authorization: basic("senhá-ção") }) === 200, "senha UTF-8 certa -> 200");

// GET /api/avisos continua público, com ou sem secret.
assert(status("/api/avisos") === 200, "GET /api/avisos sem credencial -> 200 (público)");
delete process.env.ADMIN_PASSWORD;
assert(status("/api/avisos") === 200, "GET /api/avisos sem ADMIN_PASSWORD -> 200 (público)");

const res401 = (() => {
  process.env.ADMIN_PASSWORD = SENHA;
  return middleware(new NextRequest("https://exemplo.test/admin/clientes"));
})();
assert(res401.headers.get("www-authenticate")?.startsWith("Basic") === true, "401 traz WWW-Authenticate: Basic");

if (process.exitCode === 1) {
  console.error("\n--- HÁ TESTES FALHANDO ---");
} else {
  console.log("\n--- TODOS OS TESTES DO ADMIN AUTH PASSARAM ---");
}
