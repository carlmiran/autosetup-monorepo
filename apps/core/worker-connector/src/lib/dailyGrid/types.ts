// =====================================================================
// Interpretador Inteligente de Planilhas — modelo interno mínimo (Fase 2)
//
// Escopo deliberadamente pequeno: só o que serve pra INTERPRETAR o grid
// diário por categoria/dia (validado com o piloto da Casa do Fábio,
// hospedagem) e mostrar um relatório humano-legível (dry run, Fase 7).
// A detecção e a extração são estruturais, não específicas de nenhum
// nicho — ver classifier.ts e o README deste diretório. NÃO é o modelo
// canônico completo (client/property/payment/etc.) da especificação de
// 10 fases — isso fica documentado como próximo passo, não implementado
// agora (ver README.md deste diretório).
//
// Regra que atravessa todo este módulo: nunca inventar dado que a
// planilha não declara explicitamente. Sempre que um valor for
// interpretado (não copiado literalmente), ele carrega `confidence`
// (0.00–1.00) e o `rawText` da célula de origem nunca é descartado.
// =====================================================================

/** Confiança da interpretação de um campo: 0 (chute) a 1 (certeza estrutural). */
export type Confidence = number;

/**
 * Um espaço/categoria identificado pelo rótulo de linha (ex.: "Q1", "BRUNA",
 * "SALAFRENTE" — pode ser um quarto, uma cadeira, um funcionário, qualquer
 * categoria que o negócio organize por dia). Puramente o rótulo + onde foi
 * encontrado — não infere capacidade, tipo, nem nada que a planilha não diga.
 */
export interface Space {
  nome: string;
  /** Índice da linha (0-based, no array de linhas cru) onde o rótulo apareceu — rastreabilidade. */
  linhaIndice: number;
  confidence: Confidence;
}

/**
 * Uma contraparte (pessoa/entidade — hóspede, cliente, o que o negócio
 * chamar) aparecendo associada a um espaço, num dia específico —
 * exatamente o que a planilha mostra (nome na lista vertical abaixo da
 * coluna daquele dia). NUNCA infere início/fim de período: se a mesma
 * contraparte aparece em 3 dias seguidos, isso vira 3
 * CounterpartObservation, não um período com data de entrada/saída —
 * essa inferência fica pro relatório humano ou pra uma fase futura, não
 * pro parser.
 */
export interface CounterpartObservation {
  /** Texto do nome como está na célula — inclui sufixos tipo "+1", nunca reescrito. */
  nome: string;
  espaco: string;
  /** Dia do mês (1-31), sempre conhecido — vem da coluna estruturalmente. */
  diaDoMes: number;
  /** Data completa ISO (yyyy-mm-dd), só quando mês/ano foram identificados no contexto da planilha. */
  dataIso: string | null;
  rawText: string;
  confidence: Confidence;
}

/**
 * Agregado diário de um espaço: quantidade, valor unitário, extras e
 * total, como declarados nas linhas Qtdd/Valor/Extras/Total daquele
 * bloco. Guarda também quantos nomes foram encontrados naquele dia pra
 * esse espaço — se não bater com `qtdd`, registra os dois números e um
 * aviso em `avisos`, nunca corrige um valor usando o outro.
 */
export interface DailyRevenue {
  espaco: string;
  diaDoMes: number;
  dataIso: string | null;
  qtdd: number | null;
  valorUnitario: number | null;
  extras: number | null;
  total: number | null;
  /** Quantos CounterpartObservation existem pra este espaco+dia (contagem real, não a Qtdd declarada). */
  qtddNomesEncontrados: number;
  avisos: string[];
  confidence: Confidence;
  /** Valor original de cada célula, nunca descartado mesmo quando a interpretação numérica falha. */
  rawText: {
    qtdd: string | null;
    valor: string | null;
    extras: string | null;
    total: string | null;
  };
}

/**
 * Anotação de vencimento/pagamento (ex.: "Vencto -> 15/ago",
 * "pagto -> 30/jul") capturada como texto bruto. De propósito NÃO tenta
 * estruturar em campos (tipo/data/valor) — a especificação completa tem
 * uma fase própria pra isso (ver README.md), fora de escopo aqui.
 */
export interface BillingNote {
  textoBruto: string;
  linhaIndice: number;
  /** Espaço mais próximo no momento em que a nota foi encontrada, se houver um bloco aberto. */
  espacoProximo: string | null;
  confidence: Confidence;
}

/** Resultado agregado da interpretação de um grid diário inteiro. */
export interface GridInterpretation {
  espacos: Space[];
  observacoesContrapartes: CounterpartObservation[];
  receitasDiarias: DailyRevenue[];
  notasCobranca: BillingNote[];
  /** Avisos gerais, não presos a uma célula/bloco específico (ex.: mês/ano não identificado). */
  avisosGerais: string[];
  confidenceGeral: Confidence;
}
