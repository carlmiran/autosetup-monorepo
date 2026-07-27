// AUTOSETUP — teste real (não hipotético) da lógica de fallback do Gateway.
// Roda de verdade neste sandbox via tsx, sem precisar de chave de API —
// os providers são fakes injetados, só a LÓGICA de ordem/fallback é testada.

import { runGateway, type LLMProvider, type GatewayResult } from "./index";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FALHOU: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

async function main() {
  // Caso 1: primeiro provider da prioridade funciona -> Gateway usa ele, não tenta os outros.
  const chamadas: string[] = [];
  const providerQueFunciona: LLMProvider = {
    name: "openai",
    complete: async () => {
      chamadas.push("openai");
      return '{"ok":true}';
    },
  };
  const providerNuncaChamado: LLMProvider = {
    name: "anthropic",
    complete: async () => {
      chamadas.push("anthropic");
      return '{"ok":true}';
    },
  };
  const r1: GatewayResult = await runGateway(
    "prompt teste",
    { openai: providerQueFunciona, anthropic: providerNuncaChamado },
    ["openai", "anthropic"],
  );
  assert(r1.usedProvider === "openai", "usa o primeiro provider quando ele funciona");
  assert(chamadas.length === 1 && chamadas[0] === "openai", "não chama o segundo provider se o primeiro funcionou");

  // Caso 2: primeiro provider falha de verdade -> Gateway cai pro segundo.
  const chamadas2: string[] = [];
  const providerQueFalha: LLMProvider = {
    name: "openai",
    complete: async () => {
      chamadas2.push("openai");
      throw new Error("429 rate limited (simulado)");
    },
  };
  const providerFallback: LLMProvider = {
    name: "anthropic",
    complete: async () => {
      chamadas2.push("anthropic");
      return '{"ok":true}';
    },
  };
  const r2 = await runGateway(
    "prompt teste",
    { openai: providerQueFalha, anthropic: providerFallback },
    ["openai", "anthropic"],
  );
  assert(r2.usedProvider === "anthropic", "cai para o segundo provider quando o primeiro falha de verdade");
  assert(r2.attempts.length === 2 && !r2.attempts[0]!.ok && r2.attempts[1]!.ok, "registra a tentativa falha antes de usar a que funcionou");

  // Caso 3: nenhum provider configurado -> erro claro, não finge sucesso.
  let erro3: string | null = null;
  try {
    await runGateway("prompt teste", {}, ["openai", "anthropic"]);
  } catch (err) {
    erro3 = err instanceof Error ? err.message : String(err);
  }
  assert(erro3 !== null && erro3.includes("Nenhum provider"), "erro claro quando nenhum provider está configurado");

  // Caso 4: todos os providers configurados falham -> erro agregado, não finge sucesso.
  let erro4: string | null = null;
  try {
    await runGateway(
      "prompt teste",
      {
        openai: { name: "openai", complete: async () => { throw new Error("timeout"); } },
        anthropic: { name: "anthropic", complete: async () => { throw new Error("500"); } },
      },
      ["openai", "anthropic"],
    );
  } catch (err) {
    erro4 = err instanceof Error ? err.message : String(err);
  }
  assert(erro4 !== null && erro4.includes("openai") && erro4.includes("anthropic"), "erro agregado lista todos os providers que falharam, quando todos falham");

  if (process.exitCode === 1) {
    console.error("\n--- ALGUM TESTE FALHOU ---");
  } else {
    console.log("\n--- TODOS OS TESTES DO GATEWAY PASSARAM ---");
  }
}

main();
