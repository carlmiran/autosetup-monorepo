// AUTOSETUP — @autosetup/adapter-llm
// Camada de abstração de provider LLM. Fonte: IMP-LLM-001 — OpenAI
// inicialmente, nunca acoplado a um único modelo.
//
// Esta é a única peça desta fase com uma implementação mínima real
// (não um stub) — o contrato de troca de provider é o ponto crítico
// que IMP-LLM-001 exige ficar certo desde o início.

import type { AdapterDefinition } from "@autosetup/contracts";

export interface LLMProvider {
  complete: (prompt: string) => Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY ausente — configure .env a partir de .env.example.");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API retornou ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }
}

let activeProvider: LLMProvider | null = null;

export const llmAdapter: AdapterDefinition<{ apiKey: string }> = {
  name: "llm",
  async connect(config) {
    // Ponto único de troca de provider — IMP-LLM-001. Trocar aqui nunca
    // exige mudar quem consome `llmAdapter`.
    activeProvider = new OpenAIProvider(config.apiKey);
  },
  async disconnect() {
    activeProvider = null;
  },
};

export function getActiveLLMProvider(): LLMProvider {
  if (!activeProvider) {
    throw new Error("Nenhum provider LLM conectado — chame llmAdapter.connect() primeiro.");
  }
  return activeProvider;
}
