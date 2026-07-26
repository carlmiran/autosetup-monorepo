// AUTOSETUP — apps/core/worker-runner
// Prova de ponta a ponta do padrão Worker (ADR-CORE-003) nesta fase
// EBK 0.1: registra um worker real ("echo"), monta um DomainEvent
// sintético e despacha via @autosetup/workers-runtime. Não é uma
// simulação — o código realmente registra, resolve e executa.

import type { DomainEvent } from "@autosetup/events";
import type { WorkerDefinition } from "@autosetup/contracts";
import { registerWorker } from "@autosetup/workers-registry";
import { dispatch } from "@autosetup/workers-runtime";

const echoWorker: WorkerDefinition<{ message: string }, { echoed: string }> = {
  name: "echo",
  async execute(input) {
    return { echoed: input.message };
  },
};

registerWorker(echoWorker);

async function main() {
  const event: DomainEvent<{ message: string }> = {
    id: "evt-ebk-0.1-smoke-test",
    type: "smoke.test",
    tenantId: "tenant-dev",
    occurredAt: new Date(),
    payload: { message: "EBK 0.1 — caminho Event->Registry->Runtime->Worker funcionando." },
  };

  const result = await dispatch(event, "echo");
  console.log("[worker-runner] resultado:", result);
}

main().catch((err) => {
  console.error("[worker-runner] falhou:", err);
  process.exitCode = 1;
});
