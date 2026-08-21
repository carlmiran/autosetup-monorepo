// =====================================================================
// Mesma coisa que dry-run.ts, mas roda o classificador + parser contra
// TODAS as abas de um arquivo .xlsx, não só a primeira — útil pra
// inspecionar arquivos reais de qualquer cliente com múltiplas abas
// (meses, categorias, etc.), sem enviar nada pro backend.
//
// Uso:
//   npx tsx scripts/dry-run-todas-abas.ts <arquivo.xlsx>
// =====================================================================

import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { classifyDocument } from "../src/lib/hospitalityGrid/classifier";
import { parseHospitalityGrid } from "../src/lib/hospitalityGrid/parser";
import { gerarRelatorioDryRun } from "../src/lib/hospitalityGrid/report";

function main(): void {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Uso: npx tsx scripts/dry-run-todas-abas.ts <arquivo.xlsx>");
    process.exit(1);
  }
  if (!fs.existsSync(caminho)) {
    console.error(`Arquivo não encontrado: ${caminho}`);
    process.exit(1);
  }

  const bytes = fs.readFileSync(caminho);
  const wb = XLSX.read(bytes, { type: "buffer" });

  if (wb.SheetNames.length === 0) {
    console.error("Planilha sem nenhuma aba.");
    process.exit(1);
  }

  for (const nomeAba of wb.SheetNames) {
    const sheet = wb.Sheets[nomeAba];
    if (!sheet) continue;
    const linhas: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

    const classificacao = classifyDocument(linhas);
    const interpretacao = classificacao.tipo === "HOSPITALITY_GRID" ? parseHospitalityGrid(linhas, nomeAba) : null;

    console.log(gerarRelatorioDryRun({ arquivo: `${caminho} [aba: ${nomeAba}]`, classificacao, interpretacao }));
    console.log("");
  }
}

main();
