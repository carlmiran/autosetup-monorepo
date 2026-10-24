#!/usr/bin/env node
// AUTOSETUP — backup do D1 `autosetup-leads` + teste de restauração (Pacote 1, item 9).
//
//   node scripts/d1-backup-restauracao.mjs --saida <pasta> [--apagar]
//
// 1. Exporta o D1 REMOTO (`wrangler d1 export --remote`, só leitura) para
//    <pasta>/autosetup-leads-<data>.sql e calcula o SHA-256 do arquivo.
// 2. Restaura esse arquivo num D1 LOCAL descartável (pasta temporária nova,
//    nunca o `.wrangler/` de nenhum Worker).
// 3. Compara, tabela a tabela, esquema (pragma_table_info) e contagem de
//    linhas entre o remoto e o restaurado. Sai com código 1 se algo diferir.
// 4. Com --apagar, apaga o arquivo exportado no fim (o dump tem dados
//    pessoais — não deixe em pasta sincronizada nem commitada).
//
// Nunca imprime conteúdo de linha: só nomes de tabela, contagens e hash.
// Precisa do wrangler autenticado (`wrangler login`) na conta do D1.
// Restaurar em PRODUÇÃO é outra coisa — ver docs/runbook-backup-d1.md.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASTA_WRANGLER = path.join(RAIZ, "apps", "core", "worker-connector");
const WRANGLER_JS = path.join(PASTA_WRANGLER, "node_modules", "wrangler", "bin", "wrangler.js");
const BANCO = "autosetup-leads";

const args = process.argv.slice(2);
const iSaida = args.indexOf("--saida");
const saida = iSaida >= 0 ? args[iSaida + 1] : undefined;
const apagar = args.includes("--apagar");
if (!saida) {
  console.error("Uso: node scripts/d1-backup-restauracao.mjs --saida <pasta> [--apagar]");
  process.exit(2);
}

function wrangler(argumentos) {
  // Wrangler do worker-connector chamado direto pelo node — sem shell, então
  // o SQL passa intacto (no Windows o cmd quebraria em "<>" e aspas).
  return execFileSync(process.execPath, [WRANGLER_JS, ...argumentos], {
    cwd: PASTA_WRANGLER,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1 << 28,
  });
}

function consultar(sql, onde) {
  const saidaJson = wrangler(["d1", "execute", BANCO, ...onde, "--json", "--command", sql]);
  const inicio = saidaJson.indexOf("[");
  const resultado = JSON.parse(saidaJson.slice(inicio));
  return resultado[0]?.results ?? [];
}

/** Esquema + contagem por tabela de usuário (ignora internas do SQLite/D1). */
function retrato(onde) {
  const tabelas = consultar(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations' ORDER BY name",
    onde,
  ).map((l) => l.name);
  const porTabela = {};
  for (const t of tabelas) {
    if (!/^[A-Za-z0-9_]+$/.test(t)) throw new Error(`nome de tabela inesperado: ${t}`);
    const [contagem] = consultar(`SELECT COUNT(*) AS n FROM "${t}"`, onde);
    const colunas = consultar(`SELECT name, type, "notnull", pk FROM pragma_table_info('${t}') ORDER BY cid`, onde);
    porTabela[t] = { linhas: contagem?.n ?? -1, esquema: JSON.stringify(colunas) };
  }
  return porTabela;
}

fs.mkdirSync(saida, { recursive: true });
const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
const arquivo = path.resolve(saida, `${BANCO}-${carimbo}.sql`);

const pastaLocal = fs.mkdtempSync(path.join(os.tmpdir(), "autosetup-restauracao-d1-"));
const local = ["--local", "--persist-to", pastaLocal];
let falhou = true;
try {
  console.log(`1/4 exportando ${BANCO} (remoto)...`);
  wrangler(["d1", "export", BANCO, "--remote", "--output", arquivo]);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
  console.log(`    ${fs.statSync(arquivo).size} bytes, sha256 ${hash}`);

  console.log("2/4 lendo esquema e contagens do remoto...");
  const remoto = retrato(["--remote"]);

  console.log("3/4 restaurando num D1 local descartável...");
  const vazio = consultar("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'", local);
  if ((vazio[0]?.n ?? -1) !== 0) throw new Error("D1 local de restauração não estava vazio");
  wrangler(["d1", "execute", BANCO, ...local, "--file", arquivo, "--yes"]);
  const restaurado = retrato(local);

  console.log("4/4 comparando:\n");
  console.log("tabela".padEnd(28) + "remoto".padStart(8) + "restaurado".padStart(12) + "  esquema");
  falhou = false;
  const nomes = [...new Set([...Object.keys(remoto), ...Object.keys(restaurado)])].sort();
  let totalLinhas = 0;
  for (const t of nomes) {
    const a = remoto[t];
    const b = restaurado[t];
    const linhasOk = a && b && a.linhas === b.linhas;
    const esquemaOk = a && b && a.esquema === b.esquema;
    if (!linhasOk || !esquemaOk) falhou = true;
    totalLinhas += a?.linhas ?? 0;
    console.log(
      t.padEnd(28) +
        String(a?.linhas ?? "—").padStart(8) +
        String(b?.linhas ?? "—").padStart(12) +
        `  ${esquemaOk ? "igual" : "DIFERENTE"}${linhasOk ? "" : "  <- contagem diferente"}`,
    );
  }
  console.log(`\n${nomes.length} tabelas, ${totalLinhas} linhas no remoto.`);
} finally {
  fs.rmSync(pastaLocal, { recursive: true, force: true });
  if (apagar || falhou) {
    fs.rmSync(arquivo, { force: true });
    console.log(falhou ? "arquivo exportado apagado (execução falhou)." : "arquivo exportado apagado (--apagar).");
  } else {
    console.log(`backup mantido em: ${arquivo} (contém dados pessoais — guarde em local protegido)`);
  }
}

console.log(falhou ? "\nRESTAURAÇÃO DIVERGIU DO REMOTO." : "\nRESTAURAÇÃO CONFERE COM O REMOTO.");
process.exitCode = falhou ? 1 : 0;
