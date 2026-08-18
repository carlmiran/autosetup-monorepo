// =====================================================================
// Definição declarativa dos schemas de dado da vertical Hospedagem
// (Passo 1). Usado tanto pelo parser (queue-consumer) quanto para
// documentar o contrato esperado das planilhas.
// =====================================================================

export type CampoTipo = "texto" | "numero" | "data" | "enum";

export interface CampoSchema {
  campo: string;               // nome do campo no banco
  tipo: CampoTipo;
  obrigatorio: boolean;
  enumValues?: string[];       // quando tipo === "enum"
  // possíveis variações de cabeçalho na planilha real (normalizadas)
  aliases: string[];
}

export interface TabelaSchema {
  tabela: string;               // nome da tabela D1
  arquivoPadrao: string;        // nome de arquivo esperado (case-insensitive)
  chaveNatural: string[];       // colunas usadas no upsert (ON CONFLICT)
  campos: CampoSchema[];
}

// ---------------------------------------------------------------------
// Normaliza um cabeçalho de coluna: minúsculas, sem acento, sem espaço
// extra, underscores no lugar de espaço/hífen. Usado tanto para casar
// aliases quanto para casar o nome do arquivo.
// ---------------------------------------------------------------------
export function normalizarCabecalho(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export const SCHEMAS: Record<string, TabelaSchema> = {
  reservas: {
    tabela: "reservas",
    arquivoPadrao: "reservas",
    chaveNatural: ["hospede_nome", "checkin", "quarto"],
    campos: [
      { campo: "hospede_nome", tipo: "texto", obrigatorio: true, aliases: ["hospede_nome", "hospede", "nome_hospede"] },
      { campo: "checkin", tipo: "data", obrigatorio: true, aliases: ["checkin", "check_in", "data_checkin", "data_entrada"] },
      { campo: "checkout", tipo: "data", obrigatorio: true, aliases: ["checkout", "check_out", "data_checkout", "data_saida"] },
      { campo: "quarto", tipo: "texto", obrigatorio: true, aliases: ["quarto", "identificador_quarto", "numero_quarto"] },
      { campo: "valor_total", tipo: "numero", obrigatorio: true, aliases: ["valor_total", "valor", "total"] },
      { campo: "status", tipo: "enum", obrigatorio: true, enumValues: ["confirmada", "cancelada", "pendente"], aliases: ["status", "situacao"] },
      { campo: "origem", tipo: "texto", obrigatorio: false, aliases: ["origem", "canal", "origem_reserva"] },
    ],
  },
  hospedes: {
    tabela: "hospedes",
    arquivoPadrao: "hospedes",
    chaveNatural: ["nome", "contato"],
    campos: [
      { campo: "nome", tipo: "texto", obrigatorio: true, aliases: ["nome", "nome_hospede", "hospede"] },
      { campo: "contato", tipo: "texto", obrigatorio: false, aliases: ["contato", "telefone", "whatsapp", "email"] },
      { campo: "cidade_origem", tipo: "texto", obrigatorio: false, aliases: ["cidade_origem", "cidade", "origem"] },
    ],
  },
  quartos: {
    tabela: "quartos",
    arquivoPadrao: "quartos",
    chaveNatural: ["identificador"],
    campos: [
      { campo: "identificador", tipo: "texto", obrigatorio: true, aliases: ["identificador", "quarto", "numero", "numero_quarto"] },
      { campo: "capacidade", tipo: "numero", obrigatorio: true, aliases: ["capacidade", "capacidade_maxima", "vagas"] },
      { campo: "tipo", tipo: "texto", obrigatorio: false, aliases: ["tipo", "categoria", "tipo_quarto"] },
    ],
  },
  tarifas: {
    tabela: "tarifas",
    arquivoPadrao: "tarifas",
    chaveNatural: ["quarto_ou_tipo", "periodo_vigencia"],
    campos: [
      { campo: "quarto_ou_tipo", tipo: "texto", obrigatorio: true, aliases: ["quarto_ou_tipo", "quarto", "tipo", "categoria"] },
      { campo: "valor_diaria", tipo: "numero", obrigatorio: true, aliases: ["valor_diaria", "diaria", "valor", "preco"] },
      { campo: "periodo_vigencia", tipo: "texto", obrigatorio: false, aliases: ["periodo_vigencia", "vigencia", "periodo"] },
    ],
  },
};

// Identifica qual schema usar a partir do nome do arquivo enviado
// (ex.: "Reservas (1).xlsx" -> "reservas").
export function identificarSchemaPorArquivo(filename: string): TabelaSchema | null {
  const base = normalizarCabecalho(filename.replace(/\.(xlsx|csv)$/i, ""));
  for (const schema of Object.values(SCHEMAS)) {
    if (base.includes(schema.arquivoPadrao)) return schema;
  }
  return null;
}

// ---------------------------------------------------------------------
// Crypto helpers (Web Crypto API — disponível nativamente no Workers)
// ---------------------------------------------------------------------
export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function gerarTokenLongo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]!));
}
