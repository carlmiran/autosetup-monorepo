// AUTOSETUP — apps/core/web/src/lib/eventoSeguranca.ts
// Registro de eventos de segurança (Pacote 1, item 10). Uma linha JSON por
// evento no log do Worker (Workers Logs, ver `observability` no
// wrangler.jsonc), com prefixo fixo pra filtrar: `[seguranca]`.
//
// Nunca registra senha, PIN, token, header Authorization, IP nem corpo da
// requisição — só o tipo do evento, a rota e campos explicitamente
// permitidos abaixo. O código do indicador entra porque já é público (vai
// nos links de indicação) e é o que permite investigar um ataque a ele.

export type TipoEventoSeguranca =
  | "admin_auth_falha"
  | "admin_auth_nao_configurado"
  | "indicador_pin_falha"
  | "indicador_bloqueado"
  | "oauth_state_invalido";

interface DadosEvento {
  rota: string;
  motivo?: string;
  codigo?: string;
}

const LIMITE_CAMPO = 80;

function limpar(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  // Corta e remove quebras de linha — evita injeção de linhas falsas no log.
  return valor.replace(/[\r\n\t]/g, " ").slice(0, LIMITE_CAMPO);
}

export function registrarEventoSeguranca(tipo: TipoEventoSeguranca, dados: DadosEvento): void {
  const linha: Record<string, string> = { evento: tipo, rota: limpar(dados.rota) ?? "" };
  const motivo = limpar(dados.motivo);
  const codigo = limpar(dados.codigo);
  if (motivo) linha.motivo = motivo;
  if (codigo) linha.codigo = codigo;
  console.warn(`[seguranca] ${JSON.stringify(linha)}`);
}
