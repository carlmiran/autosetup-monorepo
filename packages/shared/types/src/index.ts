// AUTOSETUP — @autosetup/types
// Tipos-base compartilhados por todo o Core. Fonte arquitetural: ACR-001
// (glossário), ADR-CORE-003 (nenhum tipo de vertical entra aqui — só o
// que é genérico o suficiente para toda vertical usar).

export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
}

/** HUB (8º componente do Core): Organization é multi-role; Partner é uma
 * Organization atuando com um papel específico numa relação comercial. */
export interface Organization {
  id: string;
  tenantId: string;
  name: string;
}

export interface Partner {
  id: string;
  organizationId: string;
  capabilities: string[];
}

export type UUID = string;
