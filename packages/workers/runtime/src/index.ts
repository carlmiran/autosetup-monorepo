// AUTOSETUP — @autosetup/workers-runtime
// Runtime que consome eventos do Event Bus e executa o Worker correspondente
// via @autosetup/workers-registry. Fonte: SPR-CORE-001 (Epic3+4, merged
// Worker+Adapter epics).

import type { DomainEvent } from "@autosetup/events";
import { getWorker } from "@autosetup/workers-registry";

export async function dispatch(event: DomainEvent, workerName: string): Promise<unknown> {
  const worker = getWorker(workerName);
  if (!worker) {
    throw new Error(`Nenhum worker registrado com o nome "${workerName}".`);
  }
  return worker.execute(event.payload, event);
}
