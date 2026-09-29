// =====================================================================
// Dry run (Fase 7) — roda o classificador + parser contra um arquivo
// .xlsx/.csv REAL, local, e imprime um relatório humano-legível. NUNCA
// envia nada pro backend (não chama D1/R2/fetch nenhum) — é seguro
// rodar contra o arquivo real de um cliente.
//
// Uso:
//   npx tsx scripts/dry-run.ts caminho/para/arquivo.xlsx
// =====================================================================

import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { classifyDocument } from "../src/lib/dailyGrid/classifier";
import { parseDailyGrid } from "../src/lib/dailyGrid/parser";
import { gerarRelatorioDryRun } from "../src/lib/dailyGrid/report";

function main(): void {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Uso: npx tsx scripts/dry-run.ts <arquivo.xlsx>");
    process.exit(1);
  }
  if (!fs.existsSync(caminho)) {
    console.error(`Arquivo não encontrado: ${caminho}`);
    process.exit(1);
  }

  const bytes = fs.readFileSync(caminho);
  const wb = XLSX.read(bytes, { type: "buffer" });
  const primeiraAba = wb.SheetNames[0];
  if (!primeiraAba) {
    console.error("Planilha sem nenhuma aba.");
    process.exit(1);
  }
  const sheet = wb.Sheets[primeiraAba];
  if (!sheet) {
    console.error("Aba vazia.");
    process.exit(1);
  }
  const linhas: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const classificacao = classifyDocument(linhas);
  const interpretacao = classificacao.tipo === "DAILY_GRID" ? parseDailyGrid(linhas, primeiraAba) : null;

  console.log(gerarRelatorioDryRun({ arquivo: caminho, classificacao, interpretacao }));
}

main();
