// AUTOSETUP — @autosetup/workers-registry
// Catálogo de Workers do Core. Fonte: SPR-CORE-001 (Epic5), ADR-CORE-003.
// Implementação real: Map em memória para esta fase (EBK 0.1). Trocar por
// storage persistente é decisão IMP futura, não muda este contrato.

import type { WorkerDefinition } from "@autosetup/contracts";

const registry = new Map<string, WorkerDefinition>();

export function registerWorker(worker: WorkerDefinition): void {
  if (registry.has(worker.name)) {
    throw new Error(`Worker "${worker.name}" já está registrado.`);
  }
  registry.set(worker.name, worker);
}

export function getWorker(name: string): WorkerDefinition | undefined {
  return registry.get(name);
}

export function listWorkers(): string[] {
  return Array.from(registry.keys());
}
