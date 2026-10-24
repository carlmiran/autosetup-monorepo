// AUTOSETUP — apps/core/web/src/lib/indicadorAuth.ts
// Autorização das rotas /api/indicadores/* no SERVIDOR (Pacote 1, itens 5–7).
//
// Antes (até 24/10/2026) o PIN de 4 dígitos só era conferido no navegador
// (`EntradaComPin`); as APIs de dados aceitavam qualquer `codigo` — e o
// código de indicação é público, vai nos links. Quem soubesse o código lia
// e editava a lista de clientes (nome, WhatsApp) daquele indicador.
//
// Agora toda rota de dados do indicador exige o header `x-indicador-pin`,
// conferido contra `indicadores_registro` em tempo constante. Falhas são
// contadas na tabela `rate_limits` (já existente) por IP e por código; ao
// passar do limite, a rota responde 429 ANTES de comparar o PIN, então não
// dá pra continuar tentando. Fail-closed: erro no D1 nega o acesso.
//
// Continua sendo paliativo (PIN curto, sem recuperação) até o login real da
// Fase 1 — mas fecha o acesso só com o código.

import { NextResponse } from "next/server";
import { comparacaoSeguraIgual } from "@/lib/adminAuth";
import { registrarEventoSeguranca } from "@/lib/eventoSeguranca";

import { CABECALHO_PIN } from "@/lib/indicadorCliente";

export { CABECALHO_PIN };

export const LIMITES_FALHA_PIN = {
  porIp: 20,
  porCodigo: 10,
  janelaMinutos: 60,
} as const;

export type ResultadoPinIndicador = "ok" | "pin_ausente" | "pin_incorreto" | "bloqueado";

/** Subconjunto do D1 usado aqui — facilita o teste com D1 local real. */
type Banco = Pick<D1Database, "prepare">;

function chavesFalha(ip: string, codigo: string): [string, string] {
  return [`indicador-pin-falha-ip:${ip}`, `indicador-pin-falha-codigo:${codigo}`];
}

async function estaBloqueado(db: Banco, ip: string, codigo: string, agora: Date): Promise<boolean> {
  const [chaveIp, chaveCodigo] = chavesFalha(ip, codigo);
  const linhas = await db
    .prepare("SELECT chave, contagem, expira_em FROM rate_limits WHERE chave IN (?, ?)")
    .bind(chaveIp, chaveCodigo)
    .all<{ chave: string; contagem: number; expira_em: string }>();
  for (const l of linhas.results ?? []) {
    if (new Date(l.expira_em) <= agora) continue;
    const maximo = l.chave === chaveIp ? LIMITES_FALHA_PIN.porIp : LIMITES_FALHA_PIN.porCodigo;
    if (l.contagem >= maximo) return true;
  }
  return false;
}

/** Incrementa os dois contadores de falha numa única instrução por chave
 * (upsert atômico — sem a corrida SELECT→UPDATE do rateLimit.ts). */
async function registrarFalha(db: Banco, ip: string, codigo: string, agora: Date): Promise<void> {
  const agoraIso = agora.toISOString();
  const expiraEm = new Date(agora.getTime() + LIMITES_FALHA_PIN.janelaMinutos * 60_000).toISOString();
  const sql =
    "INSERT INTO rate_limits (chave, contagem, expira_em) VALUES (?, 1, ?) " +
    "ON CONFLICT(chave) DO UPDATE SET " +
    "contagem = CASE WHEN rate_limits.expira_em <= ? THEN 1 ELSE rate_limits.contagem + 1 END, " +
    "expira_em = CASE WHEN rate_limits.expira_em <= ? THEN excluded.expira_em ELSE rate_limits.expira_em END";
  for (const chave of chavesFalha(ip, codigo)) {
    await db.prepare(sql).bind(chave, expiraEm, agoraIso, agoraIso).run();
  }
}

/** Confere (codigo, pin) contra `indicadores_registro`. Código sem PIN
 * registrado conta como PIN incorreto — não revela se o código existe. */
export async function verificarPinIndicador(
  db: Banco,
  codigo: string,
  pin: string | null,
  ip: string,
  agora: Date = new Date(),
): Promise<ResultadoPinIndicador> {
  if (!pin || !/^\d{4}$/.test(pin)) return "pin_ausente";
  if (await estaBloqueado(db, ip, codigo, agora)) return "bloqueado";

  const registro = await db
    .prepare("SELECT pin FROM indicadores_registro WHERE codigo = ?")
    .bind(codigo)
    .first<{ pin: string }>();

  if (registro && comparacaoSeguraIgual(pin, registro.pin)) return "ok";

  await registrarFalha(db, ip, codigo, agora);
  return "pin_incorreto";
}

export function ipDaRequisicao(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "desconhecido";
}

/** Uso nas rotas: `const negado = await negarSemPinIndicador(request, db, codigo); if (negado) return negado;` */
export async function negarSemPinIndicador(
  request: Request,
  db: Banco,
  codigo: string,
): Promise<NextResponse | null> {
  const rota = new URL(request.url).pathname;
  let resultado: ResultadoPinIndicador;
  try {
    resultado = await verificarPinIndicador(db, codigo, request.headers.get(CABECALHO_PIN), ipDaRequisicao(request));
  } catch (err) {
    console.error("[indicadorAuth] falha ao verificar PIN — negando por segurança:", err);
    return NextResponse.json({ error: "Não foi possível validar seu acesso agora." }, { status: 503 });
  }

  if (resultado === "ok") return null;

  if (resultado === "bloqueado") {
    registrarEventoSeguranca("indicador_bloqueado", { rota, codigo });
    return NextResponse.json(
      { error: "Muitas tentativas com PIN errado. Espere uma hora e tente de novo." },
      { status: 429 },
    );
  }

  if (resultado === "pin_incorreto") {
    registrarEventoSeguranca("indicador_pin_falha", { rota, codigo, motivo: "pin_incorreto" });
  }
  return NextResponse.json({ error: "Código ou PIN incorretos." }, { status: 401 });
}
