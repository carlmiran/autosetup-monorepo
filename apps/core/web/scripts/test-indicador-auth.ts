// AUTOSETUP — teste real do isolamento dos indicadores (Pacote 1).
// Roda os handlers de rota de verdade contra um D1 LOCAL real (Miniflare via
// getPlatformProxy do wrangler), numa pasta temporária apagada no fim:
//   npx tsx scripts/test-indicador-auth.ts   (dentro de apps/core/web)
//
// Nenhum dado de produção: tabelas criadas a partir de migrations/0000_baseline.sql
// (+ indicador_regiao, de worker-prospector/migrations/0001_radar_pendentes.sql),
// dados fictícios (NEGOCIO-001, empresa-exemplo).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { verificarPinIndicador, LIMITES_FALHA_PIN } from "../src/lib/indicadorAuth";
import { assinarStateOAuth, verificarStateOAuth } from "../src/lib/oauthState";
import * as clientes from "../src/app/api/indicadores/clientes/route";
import * as desempenho from "../src/app/api/indicadores/desempenho/route";
import * as regiao from "../src/app/api/indicadores/regiao/route";
import * as registro from "../src/app/api/indicadores/registro/route";
import * as conectar from "../src/app/api/indicadores/conectar/route";
import * as callback from "../src/app/api/indicadores/callback/route";

let falhas = 0;
function assert(condicao: boolean, mensagem: string): void {
  if (!condicao) {
    falhas++;
    console.error(`FALHOU: ${mensagem}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${mensagem}`);
  }
}

const BASE = "https://exemplo.test";
const CODIGO = "empresa-exemplo";
const PIN = "4821";
const OUTRO_CODIGO = "negocio-001";
const OUTRO_PIN = "9033";

function req(
  caminho: string,
  opcoes: { metodo?: string; pin?: string; corpo?: unknown; ip?: string } = {},
): Request {
  const headers = new Headers({ "CF-Connecting-IP": opcoes.ip ?? "203.0.113.10" });
  if (opcoes.pin !== undefined) headers.set("x-indicador-pin", opcoes.pin);
  if (opcoes.corpo !== undefined) headers.set("content-type", "application/json");
  return new Request(`${BASE}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers,
    ...(opcoes.corpo !== undefined ? { body: JSON.stringify(opcoes.corpo) } : {}),
  });
}

const MIGRATIONS = [
  path.join(__dirname, "..", "migrations", "0000_baseline.sql"),
  path.join(__dirname, "..", "..", "worker-prospector", "migrations", "0001_radar_pendentes.sql"),
];

/** Extrai só os CREATE TABLE/INDEX das migrations (comentários fora). */
function statementsDasMigrations(): string[] {
  return MIGRATIONS.flatMap((arquivo) => statementsDe(fs.readFileSync(arquivo, "utf8")));
}

function statementsDe(sql: string): string[] {
  // As migrations não têm "--" dentro de string, então dá pra cortar o
  // comentário até o fim da linha (inclusive comentário inline com ";").
  return sql
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => /^CREATE /i.test(s));
}

async function main(): Promise<void> {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "autosetup-teste-indicador-"));
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: path.join(__dirname, "..", "wrangler.jsonc"),
    persist: { path: pasta },
  });
  const db = proxy.env.DB;
  (globalThis as Record<symbol, unknown>)[Symbol.for("__cloudflare-context__")] = {
    env: proxy.env,
    cf: undefined,
    ctx: proxy.ctx,
  };

  try {
    const antes = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'").first<{ n: number }>();
    assert((antes?.n ?? -1) === 0, "D1 local começa vazio (pasta temporária nova, nada de produção)");
    for (const s of statementsDasMigrations()) await db.prepare(s).run();

    // ---- Registro (reivindica dois códigos) ----
    let r: Response = await registro.POST(req("/api/indicadores/registro", { metodo: "POST", corpo: { codigo: CODIGO, pin: PIN } }));
    assert(r.status === 200, "registro: primeiro uso reivindica o código (200)");
    r = await registro.POST(req("/api/indicadores/registro", { metodo: "POST", corpo: { codigo: OUTRO_CODIGO, pin: OUTRO_PIN } }));
    assert(r.status === 200, "registro: segundo indicador reivindica outro código (200)");
    r = await registro.POST(req("/api/indicadores/registro", { metodo: "POST", corpo: { codigo: CODIGO, pin: PIN } }));
    assert(r.status === 200, "registro: mesmo código + mesmo PIN entra de novo (200)");
    r = await registro.POST(req("/api/indicadores/registro", { metodo: "POST", corpo: { codigo: CODIGO, pin: "0000" }, ip: "203.0.113.99" }));
    assert(r.status === 409, "registro: PIN errado num código já reivindicado → 409");

    // ---- Dados do indicador: só com PIN do próprio código ----
    r = await clientes.POST(req("/api/indicadores/clientes", { metodo: "POST", pin: PIN, corpo: { codigo: CODIGO, nomeCliente: "NEGOCIO-001", whatsappCliente: "35900000001" } }));
    assert(r.status === 200, "clientes POST com PIN certo grava (200)");

    r = await clientes.GET(req(`/api/indicadores/clientes?codigo=${CODIGO}`));
    assert(r.status === 401, "clientes GET sem PIN → 401 (antes devolvia a lista)");
    const corpoNegado = await r.text();
    assert(!corpoNegado.includes("NEGOCIO-001") && !corpoNegado.includes("35900000001"), "resposta negada não vaza nome nem WhatsApp");

    r = await clientes.GET(req(`/api/indicadores/clientes?codigo=${CODIGO}`, { pin: OUTRO_PIN }));
    assert(r.status === 401, "clientes GET com o PIN de OUTRO indicador → 401");

    r = await clientes.GET(req(`/api/indicadores/clientes?codigo=${CODIGO}`, { pin: PIN }));
    const lista = (await r.json()) as { clientes?: { id: number; nome_cliente: string }[] };
    assert(r.status === 200 && lista.clientes?.length === 1 && lista.clientes[0]?.nome_cliente === "NEGOCIO-001", "clientes GET com PIN certo → 200 com o cliente");
    const idCliente = lista.clientes?.[0]?.id ?? -1;

    r = await clientes.GET(req(`/api/indicadores/clientes?codigo=${OUTRO_CODIGO}`, { pin: OUTRO_PIN }));
    const listaOutro = (await r.json()) as { clientes?: unknown[] };
    assert(r.status === 200 && listaOutro.clientes?.length === 0, "outro indicador vê só a própria lista (vazia)");

    r = await clientes.PATCH(req("/api/indicadores/clientes", { metodo: "PATCH", pin: OUTRO_PIN, corpo: { id: idCliente, codigo: OUTRO_CODIGO, nomeCliente: "invadido" } }));
    assert(r.status === 404, "PATCH com código/PIN próprios mas id de outro indicador → 404 (filtro por código mantido)");
    r = await clientes.PATCH(req("/api/indicadores/clientes", { metodo: "PATCH", corpo: { id: idCliente, codigo: CODIGO, nomeCliente: "invadido" } }));
    assert(r.status === 401, "PATCH sem PIN → 401");
    r = await clientes.DELETE(req(`/api/indicadores/clientes?id=${idCliente}&codigo=${CODIGO}`, { metodo: "DELETE" }));
    assert(r.status === 401, "DELETE sem PIN → 401");
    const aindaExiste = await db.prepare("SELECT nome_cliente FROM clientes_indicador WHERE id = ?").bind(idCliente).first<{ nome_cliente: string }>();
    assert(aindaExiste?.nome_cliente === "NEGOCIO-001", "cliente intacto depois das tentativas negadas");

    r = await desempenho.GET(req(`/api/indicadores/desempenho?codigo=${CODIGO}`));
    assert(r.status === 401, "desempenho sem PIN → 401");
    r = await desempenho.GET(req(`/api/indicadores/desempenho?codigo=${CODIGO}`, { pin: PIN }));
    assert(r.status === 200, "desempenho com PIN → 200");

    r = await regiao.GET(req(`/api/indicadores/regiao?codigo=${CODIGO}`));
    assert(r.status === 401, "região GET sem PIN → 401");
    r = await regiao.POST(req("/api/indicadores/regiao", { metodo: "POST", corpo: { codigo: CODIGO, origem: "manual", raioKm: 5, enderecoReferencia: "Centro" } }));
    assert(r.status === 401, "região POST sem PIN → 401 antes de chamar o Google (sem custo)");
    r = await regiao.POST(req("/api/indicadores/regiao", { metodo: "POST", pin: PIN, corpo: { codigo: CODIGO, origem: "geolocalizacao", raioKm: 5, lat: -21.5, lng: -45.4 } }));
    assert(r.status === 200, "região POST com PIN → 200");

    r = await clientes.DELETE(req(`/api/indicadores/clientes?id=${idCliente}&codigo=${CODIGO}`, { metodo: "DELETE", pin: PIN }));
    assert(r.status === 200, "DELETE com PIN certo → 200");

    // ---- Bloqueio por força bruta ----
    const ipAtacante = "198.51.100.7";
    let ultimo = "";
    for (let i = 0; i < LIMITES_FALHA_PIN.porCodigo; i++) {
      ultimo = await verificarPinIndicador(db, OUTRO_CODIGO, String(1000 + i), ipAtacante);
    }
    assert(ultimo === "pin_incorreto", `${LIMITES_FALHA_PIN.porCodigo} PINs errados contam como incorretos`);
    assert((await verificarPinIndicador(db, OUTRO_CODIGO, OUTRO_PIN, ipAtacante)) === "bloqueado", "depois do limite, até o PIN CERTO é recusado (bloqueio antes da comparação)");
    assert((await verificarPinIndicador(db, OUTRO_CODIGO, OUTRO_PIN, "192.0.2.50")) === "bloqueado", "bloqueio por código vale também para outro IP (ataque distribuído)");
    r = await clientes.GET(req(`/api/indicadores/clientes?codigo=${OUTRO_CODIGO}`, { pin: OUTRO_PIN, ip: "192.0.2.51" }));
    assert(r.status === 429, "rota responde 429 com o código bloqueado");
    const daquiUmaHora = new Date(Date.now() + (LIMITES_FALHA_PIN.janelaMinutos + 1) * 60_000);
    assert((await verificarPinIndicador(db, OUTRO_CODIGO, OUTRO_PIN, ipAtacante, daquiUmaHora)) === "ok", "bloqueio expira depois da janela");

    const ipVarredura = "198.51.100.8";
    for (let i = 0; i < LIMITES_FALHA_PIN.porIp; i++) {
      await verificarPinIndicador(db, `codigo-varredura-${i}`, "1234", ipVarredura);
    }
    assert((await verificarPinIndicador(db, CODIGO, PIN, ipVarredura)) === "bloqueado", `IP com ${LIMITES_FALHA_PIN.porIp} falhas em códigos diferentes fica bloqueado`);
    assert((await verificarPinIndicador(db, CODIGO, PIN, "203.0.113.200")) === "ok", "indicador legítimo em outro IP continua entrando");

    for (const invalido of [null, "", "12a4", "12345", "123"]) {
      assert((await verificarPinIndicador(db, CODIGO, invalido, "203.0.113.201")) === "pin_ausente", `PIN malformado (${JSON.stringify(invalido)}) → pin_ausente`);
    }

    // ---- OAuth state ----
    const SEGREDO = "segredo-de-teste-oauth";
    const state = await assinarStateOAuth(CODIGO, SEGREDO);
    assert((await verificarStateOAuth(state, SEGREDO)) === CODIGO, "state assinado volta o código");
    assert((await verificarStateOAuth(state, "outro-segredo")) === null, "state com segredo errado → null");
    assert((await verificarStateOAuth(CODIGO, SEGREDO)) === null, "state = código cru (formato antigo) → null");
    const [, exp, assinatura] = state.split(".");
    const forjado = `${Buffer.from(OUTRO_CODIGO).toString("base64url")}.${exp}.${assinatura}`;
    assert((await verificarStateOAuth(forjado, SEGREDO)) === null, "trocar o código mantendo a assinatura → null");
    assert((await verificarStateOAuth(state, SEGREDO, Date.now() + 16 * 60_000)) === null, "state expirado (16 min) → null");
    assert((await verificarStateOAuth("a.b.c", SEGREDO)) === null && (await verificarStateOAuth("", SEGREDO)) === null, "state malformado → null");

    process.env.MERCADOPAGO_CLIENT_ID = "client-id-de-teste";
    process.env.MERCADOPAGO_CLIENT_SECRET = SEGREDO;

    r = conectar.GET();
    assert(r.status === 405, "conectar GET (link antigo ?codigo=) → 405");
    r = await conectar.POST(req("/api/indicadores/conectar", { metodo: "POST", corpo: { codigo: CODIGO } }));
    assert(r.status === 401, "conectar POST sem PIN → 401");
    r = await conectar.POST(req("/api/indicadores/conectar", { metodo: "POST", pin: PIN, corpo: { codigo: CODIGO }, ip: "203.0.113.202" }));
    const conexao = (await r.json()) as { url?: string };
    const stateEmitido = conexao.url ? new URL(conexao.url).searchParams.get("state") ?? "" : "";
    assert(r.status === 200 && (await verificarStateOAuth(stateEmitido, SEGREDO)) === CODIGO, "conectar POST com PIN → URL do MP com state assinado do próprio código");

    const fetchOriginal = globalThis.fetch;
    let chamouMercadoPago = false;
    globalThis.fetch = (async () => {
      chamouMercadoPago = true;
      return new Response(JSON.stringify({ user_id: 123456 }), { status: 200 });
    }) as typeof fetch;
    try {
      r = await callback.GET(req(`/api/indicadores/callback?code=abc&state=${OUTRO_CODIGO}`));
      assert(r.status === 400 && !chamouMercadoPago, "callback com state cru (ataque antigo) → 400, sem nem chamar o MP");
      r = await callback.GET(req(`/api/indicadores/callback?code=abc&state=${encodeURIComponent(stateEmitido)}`));
      assert(r.status === 307 || r.status === 302, "callback com state válido → redireciona para /indicadores/conectado");
      const ligacao = await db.prepare("SELECT mp_user_id FROM indicadores WHERE codigo = ?").bind(CODIGO).first<{ mp_user_id: string }>();
      assert(ligacao?.mp_user_id === "123456", "conta MP ligada ao código certo");
      const ligacaoOutro = await db.prepare("SELECT mp_user_id FROM indicadores WHERE codigo = ?").bind(OUTRO_CODIGO).first();
      assert(ligacaoOutro === null, "nenhuma conta MP ligada ao código atacado");
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  } finally {
    await proxy.dispose();
    fs.rmSync(pasta, { recursive: true, force: true });
  }

  console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
