// AUTOSETUP — apps/core/web/src/lib/indicadorCliente.ts
// Lado do navegador da autorização do indicador (ver src/lib/indicadorAuth.ts).
// O PIN fica só no estado da página (memória) — nunca em localStorage, URL
// ou cookie — e vai num header em cada chamada às rotas /api/indicadores/*.

export const CABECALHO_PIN = "x-indicador-pin";

export function cabecalhosIndicador(pin: string, extras: Record<string, string> = {}): Record<string, string> {
  return { ...extras, [CABECALHO_PIN]: pin };
}
