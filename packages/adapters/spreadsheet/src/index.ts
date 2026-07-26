// AUTOSETUP — @autosetup/adapter-spreadsheet
// Adapter de ingestão via planilha (CSV). Fonte: ADR-CORE-003, stack
// decidida em SPR-CORE-001. Implementação real (não stub) do parsing —
// substitui o stub NOT_IMPLEMENTED do EBK 0.1.

import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { AdapterDefinition } from "@autosetup/contracts";

export interface SpreadsheetRow {
  [column: string]: string;
}

export interface SpreadsheetConfig {
  filePath: string;
}

let loadedRows: SpreadsheetRow[] = [];

export const spreadsheetAdapter: AdapterDefinition<SpreadsheetConfig> = {
  name: "spreadsheet",
  async connect(config) {
    const raw = await readFile(config.filePath, "utf-8");
    loadedRows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as SpreadsheetRow[];
  },
  async disconnect() {
    loadedRows = [];
  },
};

/** Retorna as linhas já carregadas por connect(). Lança erro explícito se
 * chamado antes de connect() — não retorna array vazio silenciosamente,
 * pra não mascarar um bug de ordem de chamada. */
export function getRows(): SpreadsheetRow[] {
  if (loadedRows.length === 0) {
    throw new Error("Nenhuma linha carregada — chame spreadsheetAdapter.connect() primeiro.");
  }
  return loadedRows;
}
