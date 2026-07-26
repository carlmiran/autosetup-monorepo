// AUTOSETUP — @autosetup/contracts
// Contrato único que todo Worker e Adapter implementa. Fonte: ADR-CORE-003
// (Core Extension Patterns) — Workers = Execution Extensions,
// Adapters = Integration Extensions. Ambos implementam este contrato,
// nunca um contrato próprio por vertical.

import type { DomainEvent } from "@autosetup/events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WorkerDefinition<TInput = any, TOutput = any> {
  /** Identificador único e estável do worker, usado no registry. */
  name: string;
  /** Executa o worker para um evento de entrada, retornando o resultado. */
  execute: (input: TInput, event: DomainEvent) => Promise<TOutput>;
}

export interface AdapterDefinition<TConfig = unknown> {
  name: string;
  connect: (config: TConfig) => Promise<void>;
  disconnect: () => Promise<void>;
}
