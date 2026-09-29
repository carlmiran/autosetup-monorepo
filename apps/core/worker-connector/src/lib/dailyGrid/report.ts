// =====================================================================
// Relatório humano-legível do dry run (Fase 7) — é o que o Carlos revisa
// antes de aprovar qualquer coisa indo pra produção. Texto puro, sem
// dependência de terminal colorido, pra poder ser colado em qualquer
// lugar (chat, issue, etc.).
// =====================================================================

import type { ResultadoClassificacao } from "./classifier";
import type { GridInterpretation } from "./types";

export interface ParametrosRelatorio {
  arquivo: string;
  classificacao: ResultadoClassificacao;
  interpretacao: GridInterpretation | null;
}

export function gerarRelatorioDryRun(params: ParametrosRelatorio): string {
  const { arquivo, classificacao, interpretacao } = params;
  const out: string[] = [];
  const linha = (s = "") => out.push(s);
  const sep = () => linha("-".repeat(72));

  linha("=".repeat(72));
  linha("DRY RUN — Interpretador Inteligente de Planilhas (Connector)");
  linha("=".repeat(72));
  linha(`Arquivo: ${arquivo}`);
  linha(`Parser escolhido: ${classificacao.tipo}`);
  linha(`  Pontuação — tabular: ${classificacao.pontuacaoTabular} | grid: ${classificacao.pontuacaoGrid}`);
  linha("  Sinais de classificação:");
  if (classificacao.sinais.length === 0) linha("    (nenhum sinal encontrado)");
  classificacao.sinais.forEach((s) => linha(`    - ${s}`));
  sep();

  if (classificacao.tipo === "TABULAR") {
    linha("Classificado como TABULAR.");
    linha("O parser atual (queue-consumer.ts) já trata esse formato — nada novo a interpretar aqui, sem mudança de comportamento.");
    linha("=".repeat(72));
    return out.join("\n");
  }

  if (classificacao.tipo === "UNKNOWN" || !interpretacao) {
    linha("Classificado como UNKNOWN.");
    linha("Formato não reconhecido por nenhum parser (nem tabular, nem grid de hospedagem).");
    linha("Nada foi interpretado, nada foi enviado — o Connector não quebra, só não sabe ler este arquivo ainda.");
    linha("=".repeat(72));
    return out.join("\n");
  }

  linha(`Confidence geral da interpretação: ${formatarPct(interpretacao.confidenceGeral)}`);
  linha("");

  const dias = interpretacao.receitasDiarias.map((r) => r.diaDoMes);
  const datasIso = interpretacao.receitasDiarias.map((r) => r.dataIso).filter((d): d is string => d !== null).sort();
  if (dias.length > 0) {
    const faixaDias = `dia ${Math.min(...dias)} a dia ${Math.max(...dias)} do mês`;
    const faixaData = datasIso.length > 0 ? ` (${datasIso[0]} a ${datasIso[datasIso.length - 1]})` : " — mês/ano não identificado, sem data completa";
    linha(`Período detectado: ${faixaDias}${faixaData}`);
  } else {
    linha("Período detectado: nenhum dia com dado interpretado");
  }
  linha("");

  linha(`Espaços detectados (${interpretacao.espacos.length}):`);
  if (interpretacao.espacos.length === 0) linha("  (nenhum)");
  interpretacao.espacos.forEach((e) => linha(`  - ${e.nome} (linha ${e.linhaIndice + 1} da planilha, confidence ${formatarPct(e.confidence)})`));
  linha("");

  linha(`Dias com dado de receita interpretado: ${interpretacao.receitasDiarias.length}`);
  const receitaTotal = interpretacao.receitasDiarias.reduce((s, r) => s + (r.total ?? 0), 0);
  const extrasTotal = interpretacao.receitasDiarias.reduce((s, r) => s + (r.extras ?? 0), 0);
  linha(`Receita total identificada (soma de "Total"): R$ ${receitaTotal.toFixed(2)}`);
  linha(`Extras identificados (soma de "EXTRAS"): R$ ${extrasTotal.toFixed(2)}`);
  linha("");

  linha(`Observações de hóspede (nome + dia + espaço): ${interpretacao.observacoesHospedes.length}`);
  linha("");

  linha(`Notas de cobrança (vencimento/pagamento), texto bruto: ${interpretacao.notasCobranca.length}`);
  interpretacao.notasCobranca.forEach((n) =>
    linha(`  - "${n.textoBruto}" (linha ${n.linhaIndice + 1}${n.espacoProximo ? `, próxima de ${n.espacoProximo}` : ""})`)
  );
  linha("");

  const avisosPorLinha = interpretacao.receitasDiarias.filter((r) => r.avisos.length > 0);
  const totalAvisos = interpretacao.avisosGerais.length + avisosPorLinha.length;
  linha(`Avisos de ambiguidade (${totalAvisos}):`);
  if (totalAvisos === 0) linha("  (nenhum)");
  interpretacao.avisosGerais.forEach((a) => linha(`  - [geral] ${a}`));
  avisosPorLinha.forEach((r) => r.avisos.forEach((a) => linha(`  - [${r.espaco} / dia ${r.diaDoMes}] ${a}`)));

  linha("=".repeat(72));
  return out.join("\n");
}

function formatarPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
