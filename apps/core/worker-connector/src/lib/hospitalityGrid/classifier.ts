// =====================================================================
// DocumentClassifier (Fase 3) — determinístico, sem IA/LLM.
//
// Distingue TABULAR (o parser atual de queue-consumer.ts continua
// cuidando desse caso, nada muda) de HOSPITALITY_GRID (novo parser,
// parser.ts) de UNKNOWN (não quebra nada, só sinaliza — quem chama
// decide o que fazer, ex.: registrar erro sem travar a fila).
//
// Pontuação por sinais estruturais, nunca por posição fixa de
// linha/coluna — tudo descoberto varrendo o conteúdo real.
// =====================================================================

import { SCHEMAS, normalizarCabecalho } from "../schemas";
import { classificarRotuloLinha, encontrarSequenciasDeDias, pareceNotaDeCobranca, textoDaLinha } from "./gridUtils";

export type TipoDocumento = "TABULAR" | "HOSPITALITY_GRID" | "UNKNOWN";

export interface ResultadoClassificacao {
  tipo: TipoDocumento;
  pontuacaoTabular: number;
  pontuacaoGrid: number;
  sinais: string[];
}

const LIMIAR_MINIMO = 2;

export function classifyDocument(linhas: unknown[][]): ResultadoClassificacao {
  const sinais: string[] = [];
  let pontuacaoTabular = 0;
  let pontuacaoGrid = 0;

  // --- Sinal TABULAR: primeira linha bate com aliases de algum schema conhecido ---
  const primeiraLinha = linhas[0];
  if (primeiraLinha) {
    const cabecalhosNormalizados = new Set(primeiraLinha.map((c) => normalizarCabecalho(String(c ?? ""))));
    for (const schema of Object.values(SCHEMAS)) {
      const batidas = schema.campos.filter((campo) => campo.aliases.some((a) => cabecalhosNormalizados.has(a)));
      if (batidas.length > 0) {
        pontuacaoTabular += batidas.length;
        sinais.push(`cabeçalho da linha 1 bate com ${batidas.length} campo(s) do schema "${schema.tabela}"`);
      }
    }
  }

  // --- Sinal GRID: sequência de dias (o mais forte) ---
  const sequenciasDeDias = encontrarSequenciasDeDias(linhas);
  if (sequenciasDeDias.length > 0) {
    pontuacaoGrid += 3 * sequenciasDeDias.length;
    sinais.push(
      `${sequenciasDeDias.length} sequência(s) de dias do mês encontrada(s) (linha(s) ${sequenciasDeDias
        .map((s) => s.linhaIndice)
        .join(", ")})`
    );
  }

  // --- Sinal GRID: linhas com rótulo Qtdd/Valor/Extras/Total ---
  const rotulosEncontrados = new Set<string>();
  for (const linha of linhas) {
    for (const celula of linha) {
      const rotulo = classificarRotuloLinha(celula);
      if (rotulo) rotulosEncontrados.add(rotulo);
    }
  }
  if (rotulosEncontrados.size > 0) {
    pontuacaoGrid += rotulosEncontrados.size;
    sinais.push(`rótulos de bloco encontrados: ${[...rotulosEncontrados].join(", ")}`);
  }

  // --- Sinal GRID: anotação de vencimento/pagamento ---
  const temNotaCobranca = linhas.some((linha) => pareceNotaDeCobranca(textoDaLinha(linha)));
  if (temNotaCobranca) {
    pontuacaoGrid += 1;
    sinais.push("anotação de vencimento/pagamento encontrada");
  }

  // --- Sinal GRID: rótulos de espaço em maiúsculas curtas fora da linha de dias ---
  const linhasDeDias = new Set(sequenciasDeDias.map((s) => s.linhaIndice));
  let candidatosEspaco = 0;
  linhas.forEach((linha, i) => {
    if (linhasDeDias.has(i)) return;
    const primeiraCelula = linha[0];
    if (typeof primeiraCelula === "string") {
      const t = primeiraCelula.trim();
      if (t.length >= 1 && t.length <= 20 && t === t.toUpperCase() && /[A-ZÀ-Ú]/.test(t) && !classificarRotuloLinha(t)) {
        candidatosEspaco++;
      }
    }
  });
  if (candidatosEspaco > 0) {
    pontuacaoGrid += Math.min(candidatosEspaco, 3); // peso baixo, sinal fraco isoladamente
    sinais.push(`${candidatosEspaco} rótulo(s) de espaço candidato(s) (texto em maiúsculas na coluna de label)`);
  }

  // Sequência de dias é EXIGIDA — sem ela, rótulo "Valor"/"Total" sozinho
  // não é grid, é só cabeçalho de tabela comum (ex.: "Data / Nº pessoas /
  // Valor / Total" em colunas, um padrão tabular diferente, não coberto
  // pelos schemas atuais). Achado real: sem essa exigência, uma planilha
  // tabular clássica com colunas "Valor"/"Total" caía em HOSPITALITY_GRID
  // só por essas duas palavras, mesmo sem nenhum dia do mês em lugar
  // nenhum — parser não achava nada pra interpretar (confidence 0%, tudo
  // vazio), pior que admitir UNKNOWN.
  //
  // Com sequência de dias confirmada, aceita QUALQUER UM dos dois sinais
  // de conteúdo (não os dois juntos): rótulo Qtdd/Valor/Extras/Total
  // reconhecido, OU vários candidatos de rótulo de espaço em maiúsculas
  // (>=3 — template real pode estar preenchido só com os nomes dos
  // espaços, sem nenhuma linha de campo ainda digitada, e mesmo assim é
  // genuinamente um grid de hospedagem). Achado real: um domínio
  // diferente (controle de funcionários, rótulos tipo "TT $$") também
  // organiza dado por dia mas não tem candidatos de espaço suficientes
  // nem rótulo reconhecido — cai corretamente fora daqui.
  const temSinalDeConteudoGrid = rotulosEncontrados.size > 0 || candidatosEspaco >= 3;
  const temRotuloDeBlocoReconhecido = sequenciasDeDias.length > 0 && temSinalDeConteudoGrid;

  let tipo: TipoDocumento;
  if (pontuacaoGrid >= LIMIAR_MINIMO && pontuacaoGrid > pontuacaoTabular && temRotuloDeBlocoReconhecido) {
    tipo = "HOSPITALITY_GRID";
  } else if (pontuacaoTabular >= 1 && pontuacaoTabular >= pontuacaoGrid) {
    tipo = "TABULAR";
  } else {
    tipo = "UNKNOWN";
  }

  return { tipo, pontuacaoTabular, pontuacaoGrid, sinais };
}
