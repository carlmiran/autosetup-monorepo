// AUTOSETUP — apps/core/web/src/lib/adminAuth.ts
// Proteção das áreas internas (/admin/*, /api/admin/*, POST /api/avisos)
// por HTTP Basic Auth com a senha ADMIN_PASSWORD (secret do Worker, ver
// docs/secrets-registry.md). Fonte: Etapa 0.1 de docs/auditoria-2026-10-14.md
// — as APIs admin estavam abertas em produção, expondo leads e pagamentos.
//
// Paliativo até a Fase 1 (login real). Fail-closed: sem o secret
// configurado, nega com 503 — nunca libera.

export type ResultadoAdminAuth = "ok" | "sem_credencial" | "invalida" | "nao_configurado";

/** Confere o header Authorization (Basic) contra a senha configurada. O
 * usuário é ignorado — só a senha importa. */
export function verificarBasicAuth(
  authorization: string | null,
  senhaConfigurada: string | undefined,
): ResultadoAdminAuth {
  if (!senhaConfigurada) return "nao_configurado";
  if (!authorization?.startsWith("Basic ")) return "sem_credencial";

  const senhaInformada = extrairSenha(authorization.slice("Basic ".length).trim());
  if (senhaInformada === null) return "invalida";

  return comparacaoSeguraIgual(senhaInformada, senhaConfigurada) ? "ok" : "invalida";
}

/** Decodifica "usuario:senha" em base64 (UTF-8). Retorna null se malformado. */
function extrairSenha(base64: string): string | null {
  try {
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const texto = new TextDecoder().decode(bytes);
    const separador = texto.indexOf(":");
    return separador === -1 ? null : texto.slice(separador + 1);
  } catch {
    return null;
  }
}

/** Comparação de tempo constante (evita timing attack pra descobrir o secret por tentativa e erro). */
export function comparacaoSeguraIgual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) {
    // Ainda percorre bufB inteiro (tamanho real) pra não vazar o
    // comprimento de `a` por tempo de resposta, mesmo descartando o resultado.
    let soma = 0;
    for (let i = 0; i < bufB.length; i++) soma |= bufB[i]!;
    return soma === -1;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i]! ^ bufB[i]!;
  return diff === 0;
}
