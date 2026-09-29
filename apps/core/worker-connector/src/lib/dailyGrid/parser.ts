// =====================================================================
// HospitalityGridParser (Fase 4).
//
// Interpreta o grid visual por dia/mês (colunas = dias, linhas = espaços,
// com blocos Qtdd/Valor/Extras/Total e listas verticais de nomes abaixo
// de cada coluna de dia). Tudo descoberto estruturalmente — nunca
// posição fixa de linha/coluna, nunca inventa checkin/checkout que a
// planilha não declara, nunca corrige Qtdd usando a contagem de nomes
// (ou vice-versa): registra os dois números e um aviso.
// =====================================================================

import {
  classificarRotuloLinha,
  encontrarContextoMesAno,
  encontrarSequenciasDeDias,
  montarDataIso,
  paraNumero,
  pareceNotaDeCobranca,
  pareceSerialDeDataExcel,
  textoDaLinha,
  type ContextoMesAno,
  type SequenciaDeDias,
} from "./gridUtils";
import type { BillingNote, DailyRevenue, GridInterpretation, GuestObservation, Space } from "./types";

interface SubLinhaAcumulada {
  qtdd?: unknown;
  valor?: unknown;
  extras?: unknown;
  total?: unknown;
}

export function parseHospitalityGrid(linhas: unknown[][], nomeContexto?: string): GridInterpretation {
  const avisosGerais: string[] = [];
  const contexto = encontrarContextoMesAno(linhas);
  if (!contexto) {
    avisosGerais.push(
      "mês/ano não identificado em nenhuma célula da planilha — datas ficarão só com dia do mês (dataIso ausente)"
    );
  }

  const sequenciasDeDias = encontrarSequenciasDeDias(linhas);
  if (sequenciasDeDias.length === 0) {
    return {
      espacos: [],
      observacoesHospedes: [],
      receitasDiarias: [],
      notasCobranca: [],
      avisosGerais: [...avisosGerais, "nenhuma sequência de dias encontrada — não foi possível interpretar como grid"],
      confidenceGeral: 0,
    };
  }

  const espacos: Space[] = [];
  const observacoesHospedes: GuestObservation[] = [];
  const receitasDiarias: DailyRevenue[] = [];
  const notasCobranca: BillingNote[] = [];

  const linhasDeDiasOrdenadas = [...sequenciasDeDias].sort((a, b) => a.linhaIndice - b.linhaIndice);

  // Qualquer linha imediatamente anterior a QUALQUER cabeçalho de dias
  // (não só o do bloco atual) é metadado de cabeçalho — nome do mês, dias
  // da semana abreviados, data serial marcando o início do bloco, etc. —
  // nunca rótulo de espaço nem linha de nomes. Achado real: arquivo de
  // terceiro empilha vários meses na mesma aba, cada um com sua própria
  // linha de metadado (ex.: "OUTUBRO" + dias da semana) logo antes da
  // linha numérica 1-31; sem essa regra, esse metadado virava "espaço"
  // ou "hóspede" fantasma. Estrutural, não depende de reconhecer nome de
  // mês/dia da semana como texto. Cobre as 2 linhas imediatamente
  // anteriores (não só 1) — achado real: alguns blocos têm nome do mês e
  // dias da semana em duas linhas separadas ("FEVEREIRO" sozinha, dias
  // da semana abreviados na linha seguinte), não numa linha só.
  const linhasAdjacentesAHeaders = new Set(
    linhasDeDiasOrdenadas.flatMap((h) => [h.linhaIndice - 1, h.linhaIndice - 2])
  );

  linhasDeDiasOrdenadas.forEach((header, idx) => {
    const inicioFaixa = header.linhaIndice + 1;
    const fimFaixa = linhasDeDiasOrdenadas[idx + 1]?.linhaIndice ?? linhas.length;
    processarBlocoQuinzenal(header, linhas, inicioFaixa, fimFaixa, contexto, linhasAdjacentesAHeaders, nomeContexto, {
      espacos,
      observacoesHospedes,
      receitasDiarias,
      notasCobranca,
    });
  });

  const confidenceGeral = calcularConfidenceGeral(espacos, receitasDiarias, contexto);

  return { espacos, observacoesHospedes, receitasDiarias, notasCobranca, avisosGerais, confidenceGeral };
}

function processarBlocoQuinzenal(
  header: SequenciaDeDias,
  linhas: unknown[][],
  inicioFaixa: number,
  fimFaixa: number,
  contexto: ContextoMesAno | null,
  linhasAdjacentesAHeaders: Set<number>,
  nomeContexto: string | undefined,
  acumulador: {
    espacos: Space[];
    observacoesHospedes: GuestObservation[];
    receitasDiarias: DailyRevenue[];
    notasCobranca: BillingNote[];
  }
): void {
  const primeiraColunaDia = header.colunas[0]!;
  const temColunaDeLabel = primeiraColunaDia > 0;

  let espacoAtual: Space | null = null;
  let subLinhas: Record<number, SubLinhaAcumulada> = {}; // por índice de coluna do dia
  const nomesPorColuna: Record<number, GuestObservation[]> = {};

  const fecharEspacoAtual = () => {
    if (!espacoAtual) return;
    header.dias.forEach((dia, i) => {
      const col = header.colunas[i]!;
      const sub = subLinhas[col] ?? {};
      const nomes = nomesPorColuna[col] ?? [];
      const qtdd = "qtdd" in sub ? paraNumero(sub.qtdd) : null;
      const valorUnitario = "valor" in sub ? paraNumero(sub.valor) : null;
      const extras = "extras" in sub ? paraNumero(sub.extras) : null;
      const total = "total" in sub ? paraNumero(sub.total) : null;

      const temAlgumDado = qtdd !== null || valorUnitario !== null || extras !== null || total !== null || nomes.length > 0;
      if (!temAlgumDado) return;

      const avisos: string[] = [];
      if (qtdd !== null && qtdd !== nomes.length) {
        avisos.push(`Qtdd declarada (${qtdd}) não bate com nomes encontrados (${nomes.length}) — nenhum valor foi corrigido`);
      }

      let confidence = 0.9;
      if (avisos.length > 0) confidence -= 0.3;
      if (qtdd === null) confidence -= 0.15;
      if (total === null) confidence -= 0.15;
      confidence = Math.max(0, Math.min(1, confidence));

      acumulador.receitasDiarias.push({
        espaco: espacoAtual!.nome,
        diaDoMes: dia,
        dataIso: montarDataIso(dia, contexto),
        qtdd,
        valorUnitario,
        extras,
        total,
        qtddNomesEncontrados: nomes.length,
        avisos,
        confidence,
        rawText: {
          qtdd: "qtdd" in sub ? textoOuNull(sub.qtdd) : null,
          valor: "valor" in sub ? textoOuNull(sub.valor) : null,
          extras: "extras" in sub ? textoOuNull(sub.extras) : null,
          total: "total" in sub ? textoOuNull(sub.total) : null,
        },
      });
    });

    subLinhas = {};
    for (const col of Object.keys(nomesPorColuna)) delete nomesPorColuna[Number(col)];
    espacoAtual = null;
  };

  for (let i = inicioFaixa; i < fimFaixa; i++) {
    const linha = linhas[i];
    if (!linha) continue;

    const rotuloCelula = temColunaDeLabel ? acharLabel(linha, primeiraColunaDia) : null;
    const rotuloClassificado = classificarRotuloLinha(rotuloCelula);
    const textoCompleto = textoDaLinha(linha);

    // Serial de data do Excel na coluna de rótulo = linha de metadado de
    // cabeçalho (ex.: marca o início de outro bloco/quinzena), nunca nome
    // de espaço nem de hóspede — achado real: sem isso, o texto ao lado
    // da data (ex.: "15 - 30") virava "hóspede" fantasma no bloco aberto
    // anterior. Fecha o bloco atual (se houver) e ignora a linha.
    if (pareceSerialDeDataExcel(rotuloCelula) || linhasAdjacentesAHeaders.has(i)) {
      fecharEspacoAtual();
      continue;
    }

    if (pareceNotaDeCobranca(textoCompleto)) {
      acumulador.notasCobranca.push({
        textoBruto: textoCompleto,
        linhaIndice: i,
        espacoProximo: espacoAtual?.nome ?? null,
        confidence: 0.7,
      });
      continue;
    }

    if (rotuloClassificado) {
      if (!espacoAtual) {
        // Bloco Qtdd/Valor/Extras/Total sem rótulo de espaço explícito
        // antes — achado real: em alguns arquivos a linha representa uma
        // contraparte/grupo identificado só pelo contexto da aba, não por
        // um rótulo de texto dentro do bloco. Abre um espaço "implícito"
        // (nome da aba, se disponível) em vez de descartar o bloco
        // inteiro — confidence mais baixa que um rótulo explícito, porque
        // foi inferido, não lido diretamente da planilha.
        espacoAtual = { nome: nomeContexto?.trim() || "(sem rótulo)", linhaIndice: i, confidence: 0.5 };
        acumulador.espacos.push(espacoAtual);
      }
      header.colunas.forEach((col) => {
        const valor = linha[col];
        if (valor === null || valor === undefined || valor === "") return;
        subLinhas[col] = { ...subLinhas[col], [rotuloClassificado]: valor };
      });
      continue;
    }

    const rotuloTexto = typeof rotuloCelula === "string" ? rotuloCelula.trim() : "";
    if (rotuloTexto) {
      // Nova etiqueta de espaço — fecha o bloco anterior e abre um novo.
      fecharEspacoAtual();
      espacoAtual = { nome: rotuloTexto, linhaIndice: i, confidence: 0.8 };
      acumulador.espacos.push(espacoAtual);
      continue;
    }

    // Rótulo vazio: linha de nomes de hóspede, se houver espaço aberto.
    if (espacoAtual) {
      header.colunas.forEach((col, idx) => {
        const dia = header.dias[idx]!;
        const valor = linha[col];
        if (valor === null || valor === undefined || valor === "") return;
        const nome = String(valor).trim();
        if (!nome) return;
        // Um valor puramente numérico numa linha de nomes é quase sempre
        // uma linha de resumo/total mal alinhada (ex.: "0" repetido por
        // coluna), nunca o nome de um hóspede — achado real testando
        // contra planilha de terceiro (linha de totais logo após o último
        // bloco de espaço, sem rótulo próprio, virava "hóspede" chamado "0").
        if (/^-?\d+([.,]\d+)?$/.test(nome)) return;
        const obs: GuestObservation = {
          nome,
          espaco: espacoAtual!.nome,
          diaDoMes: dia,
          dataIso: montarDataIso(dia, contexto),
          rawText: String(valor),
          confidence: 0.75,
        };
        acumulador.observacoesHospedes.push(obs);
        (nomesPorColuna[col] ??= []).push(obs);
      });
    }
  }

  fecharEspacoAtual();
}

/** Procura o rótulo da linha na faixa de colunas antes das colunas de dia (primeira célula não vazia, da esquerda pra direita). */
function acharLabel(linha: unknown[], primeiraColunaDia: number): unknown {
  for (let c = 0; c < primeiraColunaDia; c++) {
    const v = linha[c];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

function textoOuNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function calcularConfidenceGeral(espacos: Space[], receitas: DailyRevenue[], contexto: ContextoMesAno | null): number {
  if (espacos.length === 0) return 0;
  const mediaReceitas = receitas.length > 0 ? receitas.reduce((s, r) => s + r.confidence, 0) / receitas.length : 0.5;
  const penalidadeMesAno = contexto ? 0 : 0.15;
  return Math.max(0, Math.min(1, mediaReceitas - penalidadeMesAno));
}
