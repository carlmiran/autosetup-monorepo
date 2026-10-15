// AUTOSETUP — apps/core/web/src/middleware.ts
// Basic Auth nas áreas internas — ver src/lib/adminAuth.ts.
//
// Fica como `middleware.ts` (Edge) e não `proxy.ts` de propósito: no Next
// 16 o `proxy.ts` roda em Node.js, e o @opennextjs/cloudflare 1.20 aborta o
// build com "Node.js middleware is not currently supported".

import { NextResponse, type NextRequest } from "next/server";
import { verificarBasicAuth } from "@/lib/adminAuth";

const METODOS_LEITURA = new Set(["GET", "HEAD"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // GET /api/avisos é público (os indicadores leem o mural); só a
  // publicação de aviso é interna.
  if (pathname === "/api/avisos" && METODOS_LEITURA.has(request.method)) {
    return NextResponse.next();
  }

  const resultado = verificarBasicAuth(request.headers.get("authorization"), process.env.ADMIN_PASSWORD);

  if (resultado === "ok") return NextResponse.next();

  if (resultado === "nao_configurado") {
    return new NextResponse("Área interna indisponível: ADMIN_PASSWORD não configurado.", { status: 503 });
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AutoSetup admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/avisos"],
};
