// AUTOSETUP — @autosetup/adapter-whatsapp
// Adapter de canal WhatsApp. Fonte: ADR-CORE-002 Addendum
// (CommunicationRequested event), ADR-CORE-003.
//
// Stub explícito de fase EBK 0.1 — sem integração real com provider
// (ex. WhatsApp Business API / Twilio) até decisão IMP de provider.

import type { AdapterDefinition } from "@autosetup/contracts";

export const whatsappAdapter: AdapterDefinition<{ apiKey: string }> = {
  name: "whatsapp",
  async connect() {
    throw new Error("NOT_IMPLEMENTED: integração real de provider WhatsApp é pendência do próximo sprint.");
  },
  async disconnect() {
    // no-op nesta fase
  },
};
