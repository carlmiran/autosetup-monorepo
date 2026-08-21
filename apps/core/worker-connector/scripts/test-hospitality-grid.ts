// =====================================================================
// Testes mínimos do Interpretador de Planilhas (Fase 7 — só o que é
// relevante pro dry-run; testes de sincronização/idempotência ficam de
// fora, essa parte não existe ainda de propósito).
//
// Sem framework de teste novo (fora de escopo aqui) — asserções simples,
// aborta com exit code 1 no primeiro teste que falhar. Roda em segundos,
// sem I/O além de ler o fixture gerado por gerar-planilha-exemplo.ts.
//
// Uso: npx tsx scripts/test-hospitality-grid.ts
// =====================================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { classifyDocument } from "../src/lib/hospitalityGrid/classifier";
import { encontrarContextoMesAno } from "../src/lib/hospitalityGrid/gridUtils";
import { parseHospitalityGrid } from "../src/lib/hospitalityGrid/parser";

type Linha = (string | number | null)[];

console.log("Testes — Interpretador de Planilhas (grid de hospedagem)\n");

let falhas = 0;
let total = 0;

function teste(nome: string, fn: () => void): void {
  total++;
  try {
    fn();
    console.log(`  ok  - ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`FALHA - ${nome}`);
    console.error(`        ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------
// 1) Planilha tabular antiga continua sendo classificada como TABULAR
//    (regressão — o parser atual de queue-consumer.ts não muda de comportamento)
// ---------------------------------------------------------------------
teste("planilha tabular (reservas) é classificada como TABULAR, não GRID", () => {
  const linhas: Linha[] = [
    ["hospede_nome", "checkin", "checkout", "quarto", "valor_total", "status"],
    ["Maria Teste", "2026-08-20", "2026-08-22", "101", 450.5, "confirmada"],
  ];
  const r = classifyDocument(linhas);
  assert(r.tipo === "TABULAR", `esperado TABULAR, veio ${r.tipo} (sinais: ${r.sinais.join("; ")})`);
});

// ---------------------------------------------------------------------
// 2) Grid do Fábio é classificado corretamente como HOSPITALITY_GRID
// ---------------------------------------------------------------------
teste("grid de hospedagem (fixture do Fábio) é classificado como HOSPITALITY_GRID", () => {
  const caminho = path.join(__dirname, "fixtures", "exemplo-grid-fabio.xlsx");
  assert(fs.existsSync(caminho), `fixture não encontrado em ${caminho} — rode gerar-planilha-exemplo.ts primeiro`);
  const linhas = lerXlsx(caminho);
  const r = classifyDocument(linhas);
  assert(r.tipo === "HOSPITALITY_GRID", `esperado HOSPITALITY_GRID, veio ${r.tipo} (sinais: ${r.sinais.join("; ")})`);
});

// ---------------------------------------------------------------------
// 3) Qtdd com variação de nome (Qtd, Qtde) funciona
// ---------------------------------------------------------------------
teste("rótulo 'Qtd' e 'Qtde' (variação de 'Qtdd') são reconhecidos", () => {
  for (const rotulo of ["Qtd", "Qtde", "QTDD", "qtdd"]) {
    const linhas = gridMinimo({ rotuloQtdd: rotulo });
    const r = parseHospitalityGrid(linhas);
    assert(r.receitasDiarias.length > 0, `rótulo "${rotulo}" não gerou nenhuma receita diária`);
    assert(r.receitasDiarias[0]!.qtdd === 2, `rótulo "${rotulo}": esperado qtdd=2, veio ${r.receitasDiarias[0]!.qtdd}`);
  }
});

// ---------------------------------------------------------------------
// 4) EXTRAS ausente não quebra
// ---------------------------------------------------------------------
teste("bloco sem linha EXTRAS não quebra, extras fica null", () => {
  const linhas = gridMinimo({ comExtras: false });
  const r = parseHospitalityGrid(linhas);
  assert(r.receitasDiarias.length > 0, "nenhuma receita diária interpretada");
  assert(r.receitasDiarias[0]!.extras === null, `esperado extras=null, veio ${r.receitasDiarias[0]!.extras}`);
  assert(r.receitasDiarias[0]!.total !== null, "total não deveria ser afetado pela ausência de EXTRAS");
});

// ---------------------------------------------------------------------
// Regressão real: rótulo de espaço cuja substring bate com abreviação de
// mês (ex.: "MARIAH" contém "mar") não pode ser confundido com contexto
// de mês/ano — achado testando contra planilha real de terceiro.
// ---------------------------------------------------------------------
teste("rótulo de espaço com abreviação de mês embutida (ex.: MARIAH ~ 'mar') não vira falso contexto de mês", () => {
  const linhas: Linha[] = [
    [null, 1, 2, 3, 4, 5],
    ["MARIAH", null, null, null, null, null],
    ["SETUBAL", null, null, null, null, null], // contém "set" (setembro)
    ["AGOSTINHO", null, null, null, null, null], // contém "ago" (agosto)
  ];
  const contexto = encontrarContextoMesAno(linhas);
  assert(contexto === null, `não deveria detectar mês/ano nenhum rótulo de espaço, veio ${JSON.stringify(contexto)}`);
});

teste("data serial do Excel (célula formatada como data, não texto) é reconhecida como contexto de mês/ano", () => {
  // 46023 = 2026-01-01 (serial real do Excel, confirmado via XLSX.SSF.parse_date_code)
  const linhas: Linha[] = [[46023, "0 - 15"]];
  const contexto = encontrarContextoMesAno(linhas);
  assert(contexto !== null, "deveria ter detectado mês/ano a partir do serial de data");
  assert(contexto.mes === 1 && contexto.ano === 2026, `esperado mes=1 ano=2026, veio ${JSON.stringify(contexto)}`);
});

teste("número pequeno (Qtdd/dia comum) não é confundido com serial de data", () => {
  const linhas: Linha[] = [[15, 2, 3]];
  const contexto = encontrarContextoMesAno(linhas);
  assert(contexto === null, `número pequeno não deveria virar contexto de mês/ano, veio ${JSON.stringify(contexto)}`);
});

teste("nome de mês de verdade, isolado, ainda é detectado (a correção não quebrou o caso positivo)", () => {
  const linhas: Linha[] = [["Agosto 2026"]];
  const contexto = encontrarContextoMesAno(linhas);
  assert(contexto !== null, "deveria ter detectado agosto/2026");
  assert(contexto.mes === 8 && contexto.ano === 2026, `esperado mes=8 ano=2026, veio ${JSON.stringify(contexto)}`);
});

// ---------------------------------------------------------------------
// 5) Meses com 28/29/30/31 dias funcionam (dataIso só existe se o dia existir no mês)
// ---------------------------------------------------------------------
teste("meses com 28/29/30/31 dias — dia inexistente no mês não vira dataIso inventada", () => {
  const casos: { mesTexto: string; ultimoDiaValido: number }[] = [
    { mesTexto: "Fevereiro 2026", ultimoDiaValido: 28 }, // 2026 não é bissexto
    { mesTexto: "Fevereiro 2028", ultimoDiaValido: 29 }, // 2028 é bissexto
    { mesTexto: "Abril 2026", ultimoDiaValido: 30 },
    { mesTexto: "Agosto 2026", ultimoDiaValido: 31 },
  ];
  for (const c of casos) {
    const linhas = gridComContextoMes(c.mesTexto, 31); // sempre tenta gerar até dia 31
    const r = parseHospitalityGrid(linhas);
    const diaValido = r.receitasDiarias.find((x) => x.diaDoMes === c.ultimoDiaValido);
    assert(diaValido !== undefined, `${c.mesTexto}: dia ${c.ultimoDiaValido} deveria existir`);
    assert(diaValido.dataIso !== null, `${c.mesTexto}: dia ${c.ultimoDiaValido} deveria ter dataIso válida`);

    if (c.ultimoDiaValido < 31) {
      const diaInvalido = r.receitasDiarias.find((x) => x.diaDoMes === 31);
      if (diaInvalido) {
        assert(diaInvalido.dataIso === null, `${c.mesTexto}: dia 31 não existe nesse mês, dataIso deveria ser null, veio ${diaInvalido.dataIso}`);
      }
    }
  }
});

// ---------------------------------------------------------------------
// 6) Nome com "+1" não é descartado
// ---------------------------------------------------------------------
teste('nome com "+1" é preservado (rawText e nome intactos)', () => {
  const linhas = gridMinimo({ nomesDia1: ["Carlos +1"] });
  const r = parseHospitalityGrid(linhas);
  const obs = r.observacoesHospedes.find((o) => o.nome.includes("+1"));
  assert(obs !== undefined, "observação com '+1' não foi encontrada");
  assert(obs.nome === "Carlos +1", `nome deveria ser "Carlos +1", veio "${obs.nome}"`);
});

// ---------------------------------------------------------------------
// 7) Qtdd diferente da contagem de nomes não bloqueia, só avisa
// ---------------------------------------------------------------------
teste("Qtdd diferente da contagem de nomes gera aviso, não bloqueia nem corrige", () => {
  const linhas = gridMinimo({ nomesDia1: ["SoUmNome"], qtddDia1Override: 5 });
  const r = parseHospitalityGrid(linhas);
  const receita = r.receitasDiarias.find((x) => x.diaDoMes === 1);
  assert(receita !== undefined, "receita do dia 1 não foi interpretada");
  assert(receita.qtdd === 5, `qtdd não deveria ser alterado, deveria continuar 5 (o que a planilha disse), veio ${receita.qtdd}`);
  assert(receita.qtddNomesEncontrados === 1, `contagem real de nomes deveria ser 1, veio ${receita.qtddNomesEncontrados}`);
  assert(receita.avisos.length > 0, "deveria ter gerado um aviso de mismatch");
});

// ---------------------------------------------------------------------
// Regressão real: linha de resumo/total (valores puramente numéricos,
// sem rótulo próprio) logo após um bloco de espaço não vira "hóspede"
// chamado "0" — achado testando contra planilha real de terceiro.
// ---------------------------------------------------------------------
teste('linha de valores puramente numéricos não vira "hóspede" com nome numérico', () => {
  const linhas: Linha[] = [
    ["Agosto 2026"],
    [null, 1, 2, 3, 4, 5],
    ["ESPACO1"],
    ["Qtdd", 1, 1, 1, 1, 1],
    ["Valor", 65, 65, 65, 65, 65],
    ["Total", 65, 65, 65, 65, 65],
    [null, "Real Nome", null, null, null, null],
    [null, 0, 0, 0, 0, 0], // linha de resumo/total mal alinhada, sem rótulo
  ];
  const r = parseHospitalityGrid(linhas);
  const nomesNumericos = r.observacoesHospedes.filter((o) => /^\d+$/.test(o.nome));
  assert(nomesNumericos.length === 0, `nenhum nome deveria ser puramente numérico, veio: ${JSON.stringify(nomesNumericos)}`);
  assert(r.observacoesHospedes.some((o) => o.nome === "Real Nome"), 'nome real "Real Nome" deveria continuar sendo capturado normalmente');
});

// ---------------------------------------------------------------------
// Regressão real: linha de metadado de cabeçalho (data serial do Excel
// na coluna de rótulo, ex.: início de outra quinzena) não vira nome de
// hóspede — achado testando contra planilha real de terceiro.
// ---------------------------------------------------------------------
teste("linha de metadado (serial de data na coluna de rótulo) não vira nome de hóspede", () => {
  const linhas: Linha[] = [
    ["Agosto 2026"],
    [null, 1, 2, 3, 4, 5],
    ["ESPACO1"],
    ["Qtdd", 1, 1, 1, 1, 1],
    ["Valor", 65, 65, 65, 65, 65],
    ["Total", 65, 65, 65, 65, 65],
    [null, "Real Nome", null, null, null, null],
    [46023, "5 - 10", null, null, null, null], // metadado de outro bloco, não linha de nomes
  ];
  const r = parseHospitalityGrid(linhas);
  const nomeSuspeito = r.observacoesHospedes.find((o) => o.nome.includes(" - "));
  assert(nomeSuspeito === undefined, `linha de metadado não deveria virar observação de hóspede, veio: ${JSON.stringify(nomeSuspeito)}`);
  assert(r.observacoesHospedes.some((o) => o.nome === "Real Nome"), 'nome real "Real Nome" deveria continuar sendo capturado normalmente');
});

// ---------------------------------------------------------------------
// Regressão real: bloco Qtdd/Valor/Extras/Total sem rótulo de espaço
// explícito antes (a linha representa uma contraparte/grupo identificado
// só pelo contexto da aba) abre um espaço implícito em vez de descartar
// o bloco inteiro — achado testando contra planilha real de terceiro.
// ---------------------------------------------------------------------
teste("bloco sem rótulo de espaço explícito abre espaço implícito usando o nome do contexto/aba", () => {
  const linhas: Linha[] = [
    [null, 1, 2, 3, 4, 5],
    ["Qtdd", 1, 1, 1, 1, 1],
    ["Valor", 65, 65, 65, 65, 65],
    ["Total", 65, 65, 65, 65, 65],
  ];
  const r = parseHospitalityGrid(linhas, "Nome Da Aba");
  assert(r.espacos.length === 1, `esperava 1 espaço implícito, veio ${r.espacos.length}`);
  assert(r.espacos[0]!.nome === "Nome Da Aba", `nome do espaço implícito deveria ser o contexto, veio "${r.espacos[0]!.nome}"`);
  assert(r.receitasDiarias.length > 0, "receita não deveria ser descartada só por faltar rótulo de espaço");

  const semContexto = parseHospitalityGrid(linhas);
  assert(semContexto.espacos[0]!.nome === "(sem rótulo)", `sem contexto, deveria cair no placeholder genérico, veio "${semContexto.espacos[0]!.nome}"`);
});

// ---------------------------------------------------------------------
// Regressão real: linha de metadado de cabeçalho (nome do mês + dias da
// semana abreviados, ex.: "OUTUBRO", "2ª", "3ª"...) logo antes da
// sequência numérica de dias não vira rótulo de espaço nem hóspede —
// achado testando contra arquivo real com vários meses na mesma aba.
// ---------------------------------------------------------------------
teste("linha de metadado de cabeçalho (nome de mês + dias da semana) antes do header numérico é ignorada", () => {
  const linhas: Linha[] = [
    [null, 1, 2, 3, 4, 5], // header numérico do 1º bloco
    ["ESPACO1"],
    ["Qtdd", 1, 1, 1, 1, 1],
    ["Valor", 65, 65, 65, 65, 65],
    ["Total", 65, 65, 65, 65, 65],
    [null, "Real Nome", null, null, null, null],
    ["OUTUBRO", "2ª", "3ª", "4ª", "5ª", "6ª"], // metadado do PRÓXIMO bloco — não é rótulo de espaço
    [null, 1, 2, 3, 4, 5], // header numérico do próximo bloco
    ["ESPACO2"],
    ["Qtdd", 1, 1, 1, 1, 1],
    ["Valor", 65, 65, 65, 65, 65],
    ["Total", 65, 65, 65, 65, 65],
  ];
  const r = parseHospitalityGrid(linhas);
  const rotuloEspurio = r.espacos.find((e) => e.nome === "OUTUBRO");
  assert(rotuloEspurio === undefined, `"OUTUBRO" não deveria virar rótulo de espaço, espaços: ${JSON.stringify(r.espacos.map((e) => e.nome))}`);
  assert(r.espacos.some((e) => e.nome === "ESPACO1") && r.espacos.some((e) => e.nome === "ESPACO2"), "os dois espaços reais deveriam continuar sendo detectados");
});

// ---------------------------------------------------------------------
// Regressão real: sequência de dias sozinha (sem nenhum rótulo Qtdd/
// Valor/Extras/Total reconhecido) não basta pra classificar como grid de
// hospedagem — outros domínios (ex.: folha de pagamento por dia) também
// organizam dado por dia do mês, com rótulos diferentes.
// ---------------------------------------------------------------------
teste("sequência de dias sem nenhum rótulo Qtdd/Valor/Extras/Total reconhecido não vira HOSPITALITY_GRID", () => {
  const linhas: Linha[] = [
    ["OUTRO DOMINIO"],
    [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ["Campo A", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    ["Campo B", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  ];
  const r = classifyDocument(linhas);
  assert(r.tipo !== "HOSPITALITY_GRID", `não deveria classificar como HOSPITALITY_GRID sem rótulo de bloco reconhecido, veio ${r.tipo}`);
});

// ---------------------------------------------------------------------
// Regressão real: rótulo "Valor"/"Total" sozinho, sem NENHUMA sequência
// de dias, não vira HOSPITALITY_GRID — é cabeçalho de tabela comum (ex.:
// "Data / Nº pessoas / Valor / Total" em colunas), formato tabular
// diferente, não coberto pelos schemas atuais.
// ---------------------------------------------------------------------
teste('rótulo "Valor"/"Total" sem nenhuma sequência de dias não vira HOSPITALITY_GRID', () => {
  const linhas: Linha[] = [
    ["Data", "Nº pessoas", "Valor", "Total"],
    [45816, 15, 55, 825],
    [45817, 15, 55, 825],
  ];
  const r = classifyDocument(linhas);
  assert(r.tipo !== "HOSPITALITY_GRID", `sem sequência de dias, não deveria virar HOSPITALITY_GRID, veio ${r.tipo} (sinais: ${r.sinais.join("; ")})`);
});

// ---------------------------------------------------------------------
// 8) Formato totalmente desconhecido não derruba o Connector
// ---------------------------------------------------------------------
teste("formato desconhecido é classificado como UNKNOWN, sem lançar exceção", () => {
  const linhas: Linha[] = [
    ["isso", "não", "é", "nada", "reconhecível"],
    [1, "abacate", null, "xyz", 42],
  ];
  const r = classifyDocument(linhas);
  assert(r.tipo === "UNKNOWN", `esperado UNKNOWN, veio ${r.tipo}`);
});

teste("planilha vazia não lança exceção (classifier e parser)", () => {
  const linhas: Linha[] = [];
  const r = classifyDocument(linhas);
  assert(r.tipo === "UNKNOWN", `planilha vazia deveria ser UNKNOWN, veio ${r.tipo}`);
  const interpretacao = parseHospitalityGrid(linhas);
  assert(interpretacao.espacos.length === 0, "planilha vazia não deveria gerar espaços");
});

// ---------------------------------------------------------------------
// Helpers de fixture
// ---------------------------------------------------------------------
function lerXlsx(caminho: string): unknown[][] {
  const bytes = fs.readFileSync(caminho);
  const wb = XLSX.read(bytes, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
}

/** Grid mínimo de 1 espaço x 3 dias, parametrizável pros testes pontuais. */
function gridMinimo(opts: {
  rotuloQtdd?: string;
  comExtras?: boolean;
  nomesDia1?: string[];
  qtddDia1Override?: number;
}): Linha[] {
  const rotuloQtdd = opts.rotuloQtdd ?? "Qtdd";
  const comExtras = opts.comExtras ?? true;
  const nomesDia1 = opts.nomesDia1 ?? ["Fulano", "Beltrano"];
  const qtdd1 = opts.qtddDia1Override ?? nomesDia1.length;

  // Precisa de pelo menos 5 colunas de dia pra bater o limiar estrutural
  // de encontrarSequenciasDeDias (MIN_SEQUENCIA_DIAS) — só o dia 1 importa
  // pros asserts, os dias 2-5 são só preenchimento pra formar a sequência.
  const linhas: Linha[] = [];
  linhas.push(["Agosto 2026"]);
  linhas.push([null, 1, 2, 3, 4, 5]);
  linhas.push(["ESPACO1"]);
  linhas.push([rotuloQtdd, qtdd1, 1, 1, 1, 1]);
  linhas.push(["Valor", 65, 65, 65, 65, 65]);
  if (comExtras) linhas.push(["EXTRAS", null, null, null, null, null]);
  linhas.push(["Total", qtdd1 * 65, 65, 65, 65, 65]);
  linhas.push([null, nomesDia1[0] ?? null, "Ciclano", "Fulaninho", "Detrano", "Sicrano"]);
  linhas.push([null, nomesDia1[1] ?? null, null, null, null, null]);
  return linhas;
}

/** Grid com contexto de mês/ano explícito, 1 espaço x N dias (até 31). */
function gridComContextoMes(mesTexto: string, numDias: number): Linha[] {
  const dias = Array.from({ length: numDias }, (_, i) => i + 1);
  const linhas: Linha[] = [];
  linhas.push([mesTexto]);
  linhas.push([null, ...dias]);
  linhas.push(["ESPACO1"]);
  linhas.push(["Qtdd", ...dias.map(() => 1)]);
  linhas.push(["Valor", ...dias.map(() => 65)]);
  linhas.push(["Total", ...dias.map(() => 65)]);
  linhas.push([null, ...dias.map(() => "Alguem")]);
  return linhas;
}

console.log("");
console.log(`${total} teste(s) executado(s), ${falhas} falha(s).`);
process.exit(falhas > 0 ? 1 : 0);
