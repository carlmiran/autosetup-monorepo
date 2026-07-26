// AUTOSETUP — @autosetup/adapter-spreadsheet
// Adapter de ingestão via planilha (CSV/XLSX). Fonte: ADR-CORE-003,
// stack decidida em SPR-CORE-001 (Adapters/Spreadsheet).
//
// Honestidade em Demonstrações (Princípio #24): este método ainda NÃO
// tem parsing real implementado — é um stub explícito de fase EBK 0.1,
// não uma simulação disfarçada de funcional.

import type { AdapterDefinition } from "@autosetup/contracts";

export const spreadsheetAdapter: AdapterDefinition<{ filePath: string }> = {
  name: "spreadsheet",
  async connect() {
    throw new Error("NOT_IMPLEMENTED: parsing real de planilha é pendência do próximo sprint (pós EBK 0.1).");
  },
  async disconnect() {
    // no-op nesta fase
  },
};
