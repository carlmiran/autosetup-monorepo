// AUTOSETUP — apps/core/web/src/app/downloads/[arquivo]/route.ts
// Serve o instalador do Connector a partir do R2 em vez de public/ — o
// .exe não vai pro git (ver .gitignore). Mantém a mesma URL pública
// (/downloads/<arquivo>) que /api/admin/connector/criar já devolve.
//
// O bucket autosetup-connector-uploads é PRIVADO e guarda planilhas de
// clientes enviadas pelo Connector. Por isso esta rota NUNCA monta a
// chave a partir da URL: só serve os nomes da allowlist abaixo, cada um
// mapeado pra uma chave fixa sob public/downloads/.
//
// Upload de uma versão nova (manual, fora do deploy):
//   npx wrangler r2 object put autosetup-connector-uploads/public/downloads/<arquivo> \
//     --file=<caminho do .exe> --content-type=application/octet-stream --remote
// e adicionar o nome na allowlist.

import { getCloudflareContext } from "@opennextjs/cloudflare";

const ARQUIVOS_PUBLICOS: Record<string, string> = {
  "AutoSetupConnector-Setup-1.0.0.exe": "public/downloads/AutoSetupConnector-Setup-1.0.0.exe",
};

export async function GET(_request: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  const chave = Object.hasOwn(ARQUIVOS_PUBLICOS, arquivo) ? ARQUIVOS_PUBLICOS[arquivo] : undefined;
  if (!chave) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const { env } = getCloudflareContext();
  const objeto = await env.CONNECTOR_UPLOADS.get(chave);
  if (!objeto) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${arquivo}"`,
    "Content-Length": String(objeto.size),
    ETag: objeto.httpEtag,
    "Cache-Control": "public, max-age=3600",
  });
  return new Response(objeto.body, { headers });
}
