// =====================================================================
// Interpretador Inteligente de Planilhas — modelo interno mínimo (Fase 2)
//
// Escopo deliberadamente pequeno: só o que serve pra INTERPRETAR o grid
// de hospedagem do Fábio e mostrar um relatório humano-legível (dry run,
// Fase 7). NÃO é o modelo canônico completo (client/property/payment/
// etc.) da especificação de 10 fases — isso fica documentado como
// próximo passo, não implementado agora (ver README.md deste diretório).
//
// Regra que atravessa todo este módulo: nunca inventar dado que a
// planilha não declara explicitamente. Sempre que um valor for
// interpretado (não copiado literalmente), ele carrega `confidence`
// (0.00–1.00) e o `rawText` da célula de origem nunca é descartado.
// =====================================================================

/** Confiança da interpretação de um campo: 0 (chute) a 1 (certeza estrutural). */
export type Confidence = number;

/**
 * Um espaço/quarto identificado pelo rótulo de linha (ex.: "Q1", "BRUNA",
 * "SALAFRENTE"). Puramente o rótulo + onde foi encontrado — não infere
 * capacidade, tipo, nem nada que a planilha não diga.
 */
export interface Space {
  nome: string;
  /** Índice da linha (0-based, no array de linhas cru) onde o rótulo apareceu — rastreabilidade. */
  linhaIndice: number;
  confidence: Confidence;
}

/**
 * Uma pessoa aparecendo hospedada num espaço, num dia específico —
 * exatamente o que a planilha mostra (nome na lista vertical abaixo da
 * coluna daquele dia). NUNCA infere checkin/checkout: se a pessoa
 * aparece em 3 dias seguidos, isso vira 3 GuestObservation, não uma
 * reserva com data de entrada/saída — essa inferência fica pro
 * relatório humano ou pra uma fase futura, não pro parser.
 */
export interface GuestObservation {
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
  /** Quantos GuestObservation existem pra este espaco+dia (contagem real, não a Qtdd declarada). */
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

/** Resultado agregado da interpretação de um grid de hospedagem inteiro. */
export interface GridInterpretation {
  espacos: Space[];
  observacoesHospedes: GuestObservation[];
  receitasDiarias: DailyRevenue[];
  notasCobranca: BillingNote[];
  /** Avisos gerais, não presos a uma célula/bloco específico (ex.: mês/ano não identificado). */
  avisosGerais: string[];
  confidenceGeral: Confidence;
}
