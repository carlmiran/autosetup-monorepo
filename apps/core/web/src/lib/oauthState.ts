// AUTOSETUP — apps/core/web/src/lib/oauthState.ts
// `state` assinado do OAuth do Mercado Pago dos indicadores (Pacote 1).
//
// Antes o `state` era o próprio código do indicador, sem assinatura: qualquer
// pessoa podia abrir `/api/indicadores/conectar?codigo=<de outro>`, entrar
// com a PRÓPRIA conta MP e ficar com a comissão do outro indicador.
//
// Agora: `state = base64url(codigo).expiraEmMs.base64url(HMAC-SHA256)`, com
// chave = MERCADOPAGO_CLIENT_SECRET (já é secret do servidor e já é
// obrigatório pro OAuth funcionar — nenhum secret novo). Só sai assinado
// depois de o PIN do indicador ser conferido no servidor.

const VALIDADE_MS = 15 * 60_000;

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  try {
    const base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
    const binario = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(segredo: string, mensagem: string): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(mensagem)));
}

function iguaisTempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function assinarStateOAuth(codigo: string, segredo: string, agoraMs: number = Date.now()): Promise<string> {
  const corpo = `${paraBase64Url(new TextEncoder().encode(codigo))}.${agoraMs + VALIDADE_MS}`;
  return `${corpo}.${paraBase64Url(await hmac(segredo, corpo))}`;
}

/** Devolve o código do indicador se o state é autêntico e não expirou; senão null. */
export async function verificarStateOAuth(
  state: string,
  segredo: string,
  agoraMs: number = Date.now(),
): Promise<string | null> {
  const partes = state.split(".");
  if (partes.length !== 3) return null;
  const [codigoB64, expiraTexto, assinaturaB64] = partes as [string, string, string];

  const assinatura = deBase64Url(assinaturaB64);
  if (!assinatura) return null;
  const esperada = await hmac(segredo, `${codigoB64}.${expiraTexto}`);
  if (!iguaisTempoConstante(assinatura, esperada)) return null;

  if (!/^\d+$/.test(expiraTexto) || Number(expiraTexto) < agoraMs) return null;

  const codigoBytes = deBase64Url(codigoB64);
  if (!codigoBytes) return null;
  const codigo = new TextDecoder().decode(codigoBytes);
  return codigo || null;
}
