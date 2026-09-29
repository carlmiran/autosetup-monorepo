// =====================================================================
// Utilitários estruturais compartilhados por classifier.ts e parser.ts.
// Nada aqui assume posição fixa de linha/coluna — tudo descobre a
// estrutura varrendo o conteúdo real das células.
// =====================================================================

import * as XLSX from "xlsx";
import { normalizarCabecalho } from "../schemas";

/** Sequência de números de dia (1-31) encontrada numa linha — candidata a cabeçalho de bloco quinzenal. */
export interface SequenciaDeDias {
  linhaIndice: number;
  /** Índice da coluna de cada dia, na mesma ordem de `dias`. */
  colunas: number[];
  dias: number[];
}

const MIN_SEQUENCIA_DIAS = 5;

/**
 * Varre todas as linhas procurando sequências ascendentes de números
 * inteiros entre 1 e 31 (dias do mês) — o indicador estrutural mais forte
 * de que a planilha é um grid por dia, não uma tabela convencional.
 * Aceita pequenos furos (célula vazia entre dois dias) pra tolerar
 * mesclagem de célula/formatação, mas exige estritamente crescente.
 */
export function encontrarSequenciasDeDias(linhas: unknown[][]): SequenciaDeDias[] {
  const resultado: SequenciaDeDias[] = [];

  linhas.forEach((linha, linhaIndice) => {
    let colunas: number[] = [];
    let dias: number[] = [];

    const fechar = () => {
      if (dias.length >= MIN_SEQUENCIA_DIAS) {
        resultado.push({ linhaIndice, colunas: [...colunas], dias: [...dias] });
      }
      colunas = [];
      dias = [];
    };

    linha.forEach((celula, colIndice) => {
      const n = paraInteiroDia(celula);
      if (n === null) {
        // Célula vazia não quebra a sequência (tolera furo de mesclagem);
        // qualquer outra coisa (texto, número fora de 1-31) quebra.
        if (celula === null || celula === undefined || celula === "") return;
        fechar();
        return;
      }
      const ultimoDia = dias[dias.length - 1];
      if (ultimoDia === undefined || n > ultimoDia) {
        colunas.push(colIndice);
        dias.push(n);
      } else {
        fechar();
        colunas.push(colIndice);
        dias.push(n);
      }
    });
    fechar();
  });

  return resultado;
}

function paraInteiroDia(celula: unknown): number | null {
  if (typeof celula === "number" && Number.isInteger(celula) && celula >= 1 && celula <= 31) return celula;
  if (typeof celula === "string") {
    const n = Number(celula.trim());
    if (Number.isInteger(n) && n >= 1 && n <= 31) return n;
  }
  return null;
}

/** Normaliza o texto de uma célula (qualquer tipo) pro mesmo formato usado em normalizarCabecalho. */
export function normalizarCelula(celula: unknown): string {
  if (celula === null || celula === undefined) return "";
  return normalizarCabecalho(String(celula));
}

const ALIASES_QTDD = new Set(["qtd", "qtdd", "qtde", "quantidade"]);
const ALIASES_VALOR = new Set(["valor", "valor_unitario", "valor_diaria", "vlr"]);
const ALIASES_EXTRAS = new Set(["extra", "extras"]);
const ALIASES_TOTAL = new Set(["total", "total_dia"]);

export type RotuloLinhaGrid = "qtdd" | "valor" | "extras" | "total" | null;

/** Classifica o rótulo de uma linha (célula da coluna de label) num dos 4 sub-campos do bloco, tolerante a variação de nome/acento/caixa. */
export function classificarRotuloLinha(celula: unknown): RotuloLinhaGrid {
  const norm = normalizarCelula(celula);
  if (!norm) return null;
  if (ALIASES_QTDD.has(norm)) return "qtdd";
  if (ALIASES_VALOR.has(norm)) return "valor";
  if (ALIASES_EXTRAS.has(norm)) return "extras";
  if (ALIASES_TOTAL.has(norm)) return "total";
  return null;
}

const RE_VENCIMENTO = /venc(im)?t?o|pagt?o|pagamento/i;

/** Detecta se o texto de uma linha/célula é uma anotação de vencimento/pagamento. */
export function pareceNotaDeCobranca(texto: string): boolean {
  return RE_VENCIMENTO.test(texto);
}

/** Concatena o texto de uma linha inteira (células não vazias), útil pra detectar padrões que podem estar espalhados em mais de uma célula. */
export function textoDaLinha(linha: unknown[]): string {
  return linha
    .filter((c) => c !== null && c !== undefined && c !== "")
    .map((c) => String(c))
    .join(" ");
}

/** Converte um valor de célula em número, tolerante a vírgula decimal e texto — nunca lança, retorna null se não der. */
export function paraNumero(celula: unknown): number | null {
  if (typeof celula === "number") return Number.isFinite(celula) ? celula : null;
  if (typeof celula === "string") {
    const limpo = celula.trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(limpo);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const MESES: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

export interface ContextoMesAno {
  mes: number;
  ano: number;
  confidence: number;
}

/**
 * Procura em qualquer célula da planilha um indício de mês/ano (nome do
 * mês por extenso/abreviado, ou mm/aaaa) — nunca assume posição fixa.
 * Sem isso, GuestObservation/DailyRevenue ficam só com `diaDoMes`
 * (sem `dataIso`) — nunca inventa ano/mês que não apareceu em lugar nenhum.
 */
/**
 * Célula formatada como data no Excel vem como número serial quando lida
 * com `raw:true` (mesmo padrão já tratado no parser tabular,
 * queue-consumer.ts). Faixa conservadora (~1970-2041) pra nunca confundir
 * com Qtdd/dia/valor, que são números bem menores.
 */
export function pareceSerialDeDataExcel(valor: unknown): boolean {
  if (typeof valor !== "number" || valor < 25569 || valor > 51544) return false;
  const data = XLSX.SSF.parse_date_code(valor);
  return !!data && data.m >= 1 && data.m <= 12;
}

export function encontrarContextoMesAno(linhas: unknown[][]): ContextoMesAno | null {
  for (const linha of linhas) {
    for (const celula of linha) {
      if (celula === null || celula === undefined) continue;

      // Achado real: planilha de terceiro usa uma célula assim (não texto)
      // pra marcar o mês de cada aba.
      if (typeof celula === "number" && pareceSerialDeDataExcel(celula)) {
        const data = XLSX.SSF.parse_date_code(celula);
        if (data && data.m >= 1 && data.m <= 12) {
          return { mes: data.m, ano: data.y, confidence: 0.9 };
        }
      }

      const texto = String(celula);

      const mmYyyy = texto.match(/\b(\d{1,2})[/-](\d{4})\b/);
      if (mmYyyy) {
        const mes = Number(mmYyyy[1]);
        const ano = Number(mmYyyy[2]);
        if (mes >= 1 && mes <= 12) return { mes, ano, confidence: 0.9 };
      }

      // Borda de palavra de verdade — sem isso, "mar" (abreviação de março)
      // bate como substring dentro de "MARIAH" (rótulo de espaço, não mês),
      // achado real testando contra planilha de terceiro. Normaliza só
      // acento/caixa aqui (não normalizarCabecalho, que troca espaço/hífen
      // por "_" e quebraria a semântica de \b).
      const semAcento = String(celula)
        .normalize("NFD")
        .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
        .toLowerCase();
      for (const [nomeMes, numMes] of Object.entries(MESES)) {
        const bateComBorda = new RegExp(`\\b${nomeMes}\\b`, "i").test(semAcento);
        if (bateComBorda) {
          const anoMatch = texto.match(/\b(20\d{2})\b/);
          const ano = anoMatch ? Number(anoMatch[1]) : new Date().getFullYear();
          return { mes: numMes, ano, confidence: anoMatch ? 0.85 : 0.5 };
        }
      }
    }
  }
  return null;
}

/** Monta a data ISO a partir de dia/mês/ano, validando limites do mês (28-31 dias) — retorna null se o dia não existir nesse mês (não inventa). */
export function montarDataIso(dia: number, contexto: ContextoMesAno | null): string | null {
  if (!contexto) return null;
  const { mes, ano } = contexto;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > ultimoDia) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
