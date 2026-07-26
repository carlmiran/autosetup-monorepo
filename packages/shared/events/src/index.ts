// AUTOSETUP — @autosetup/events
// Contrato genérico de evento do PULSE. Fonte: ADR-CORE-002 (Addendum) —
// eventos de comunicação usam o formato genérico CommunicationRequested;
// eventos de domínio seguem este envelope comum.

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: string;
  tenantId: string;
  occurredAt: Date;
  payload: TPayload;
}

/** Evento genérico de ingestão/comunicação — ADR-CORE-002 Addendum.
 * LENS emite no primeiro contato; WORKERS emite em ingestão contínua. */
export interface CommunicationRequestedPayload {
  channel: "whatsapp" | "email" | "sms";
  recipient: string;
  templateId: string;
  variables: Record<string, string>;
}
