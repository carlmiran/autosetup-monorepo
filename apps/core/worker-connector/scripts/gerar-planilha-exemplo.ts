// =====================================================================
// Gera uma planilha .xlsx SINTÉTICA que recria a estrutura descrita da
// planilha real do Fábio (grid por dia/mês, blocos quinzenais, linhas
// Qtdd/Valor/EXTRAS/Total, listas de nomes por coluna de dia, notas de
// vencimento/pagamento) — usada pra testar o parser ENQUANTO o arquivo
// real não chega. Assim que o arquivo real existir, o dry-run deve
// rodar contra ele também (e provavelmente vai expor diferenças
// estruturais que este exemplo não previu — é esperado).
//
// Uso: npx tsx scripts/gerar-planilha-exemplo.ts
// Gera: scripts/fixtures/exemplo-grid-fabio.xlsx
// =====================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

type Linha = (string | number | null)[];

interface BlocoEspacoOpts {
  nomeEspaco: string;
  dias: number[];
  valorUnitario: number;
  nomesPorDia: string[][];
  /** override de Qtdd em dias específicos (dia -> valor forçado), pra testar aviso de "não bate com nomes" */
  qtddOverride?: Map<number, number>;
  extrasPorDia?: Map<number, number>;
  incluirExtras: boolean;
}

/** Constrói as linhas de um bloco de espaço (label + Qtdd/Valor/[Extras]/Total + N linhas de nomes empilhados). */
function construirBlocoEspaco(opts: BlocoEspacoOpts, numColunas: number, colInicio: number): Linha[] {
  const linhaLabel: Linha = new Array(numColunas).fill(null);
  linhaLabel[0] = opts.nomeEspaco;

  const linhaQtdd: Linha = new Array(numColunas).fill(null);
  linhaQtdd[0] = "Qtdd";
  const linhaValor: Linha = new Array(numColunas).fill(null);
  linhaValor[0] = "Valor";
  const linhaExtras: Linha = new Array(numColunas).fill(null);
  linhaExtras[0] = "EXTRAS";
  const linhaTotal: Linha = new Array(numColunas).fill(null);
  linhaTotal[0] = "Total";

  const maxNomes = Math.max(0, ...opts.nomesPorDia.map((n) => n.length));
  const linhasNomes: Linha[] = Array.from({ length: maxNomes }, () => new Array(numColunas).fill(null));

  opts.dias.forEach((dia, i) => {
    const col = colInicio + i;
    const nomes = opts.nomesPorDia[i] ?? [];
    const qtddReal = opts.qtddOverride?.get(dia) ?? nomes.length;
    if (nomes.length > 0 || opts.qtddOverride?.has(dia)) {
      linhaQtdd[col] = qtddReal;
      linhaValor[col] = opts.valorUnitario;
      const extras = opts.extrasPorDia?.get(dia) ?? null;
      if (opts.incluirExtras) linhaExtras[col] = extras;
      linhaTotal[col] = qtddReal * opts.valorUnitario + (extras ?? 0);
    }
    nomes.forEach((nome, j) => {
      linhasNomes[j]![col] = nome;
    });
  });

  const resultado: Linha[] = [linhaLabel, linhaQtdd, linhaValor];
  if (opts.incluirExtras) resultado.push(linhaExtras);
  resultado.push(linhaTotal, ...linhasNomes);
  return resultado;
}

function construirCabecalhoDias(dias: number[], numColunas: number, colInicio: number): Linha {
  const linha: Linha = new Array(numColunas).fill(null);
  dias.forEach((d, i) => {
    linha[colInicio + i] = d;
  });
  return linha;
}

function gerar(): Linha[] {
  const NUM_COLUNAS = 32; // col 0 = label, col 1..31 = dias (agosto tem 31)

  const linhas: Linha[] = [];
  linhas.push(["Casa do Fábio — Controle de Hospedagem", null]);
  linhas.push(["Agosto 2026", null]); // contexto de mês/ano
  linhas.push([]); // separador

  // ---------------- 1ª quinzena (dias 1-15) ----------------
  const dias1 = Array.from({ length: 15 }, (_, i) => i + 1);
  linhas.push(construirCabecalhoDias(dias1, NUM_COLUNAS, 1));

  // Q1 — bloco limpo: Qtdd sempre bate com a contagem de nomes, com extras em alguns dias.
  linhas.push(
    ...construirBlocoEspaco(
      {
        nomeEspaco: "Q1",
        dias: dias1,
        valorUnitario: 65,
        nomesPorDia: dias1.map((d) => (d === 3 ? [] : d === 8 ? ["Ana"] : ["Maria", "Joao"])),
        extrasPorDia: new Map([[2, 10], [10, 20]]),
        incluirExtras: true,
      },
      NUM_COLUNAS,
      1
    )
  );
  linhas.push(["Vencto -> 15/ago"]);

  // Q2 — bloco SEM linha de EXTRAS (testa "EXTRAS ausente não quebra").
  linhas.push(
    ...construirBlocoEspaco(
      {
        nomeEspaco: "Q2",
        dias: dias1,
        valorUnitario: 65,
        nomesPorDia: dias1.map((d) => (d % 4 === 0 ? ["Carlos +1"] : ["Beatriz"])),
        incluirExtras: false,
      },
      NUM_COLUNAS,
      1
    )
  );

  // BRUNA — bloco com Qtdd propositalmente diferente da contagem de nomes no dia 5 (testa aviso, sem correção automática).
  linhas.push(
    ...construirBlocoEspaco(
      {
        nomeEspaco: "BRUNA",
        dias: dias1,
        valorUnitario: 65,
        nomesPorDia: dias1.map((d) => (d === 5 ? ["Wesley"] : d === 11 ? ["Nina", "Otto"] : [])),
        qtddOverride: new Map([[5, 3]]), // planilha diz 3, só tem 1 nome — aviso, não conserto
        incluirExtras: true,
      },
      NUM_COLUNAS,
      1
    )
  );
  linhas.push(["pagto -> 30/jul"]);

  linhas.push([]); // separador entre quinzenas

  // ---------------- 2ª quinzena (dias 16-31) ----------------
  const dias2 = Array.from({ length: 16 }, (_, i) => i + 16); // 16..31 (agosto = 31 dias)
  linhas.push(construirCabecalhoDias(dias2, NUM_COLUNAS, 1));

  linhas.push(
    ...construirBlocoEspaco(
      {
        nomeEspaco: "SALAFRENTE",
        dias: dias2,
        valorUnitario: 65,
        nomesPorDia: dias2.map((d) => (d === 31 ? ["Regina +2"] : d % 5 === 0 ? [] : ["Yara"])),
        incluirExtras: true,
        extrasPorDia: new Map([[20, 15]]),
      },
      NUM_COLUNAS,
      1
    )
  );

  return linhas;
}

function main(): void {
  const linhas = gerar();
  const sheet = XLSX.utils.aoa_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Agosto");

  const dir = path.join(__dirname, "fixtures");
  fs.mkdirSync(dir, { recursive: true });
  const destino = path.join(dir, "exemplo-grid-fabio.xlsx");
  XLSX.writeFile(wb, destino);
  console.log(`Gerado: ${destino}`);
}

main();
