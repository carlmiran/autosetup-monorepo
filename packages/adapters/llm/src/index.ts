// AUTOSETUP — @autosetup/adapter-llm
// LLM Gateway. Fonte: IMP-LLM-001 — "OpenAI inicialmente, nunca acoplado
// a um único modelo". Evolução pedida pelo Comitê de Arquitetura
// (26/07/2026): eliminar ponto único de falha via fallback automático
// entre providers.
//
// Cada provider só é tentado se sua própria chave de API estiver
// configurada. Se um provider configurado falhar na chamada real
// (rede, rate limit, erro da API), o Gateway tenta o próximo da lista
// — nunca finge sucesso, nunca inventa resposta.

import type { AdapterDefinition } from "@autosetup/contracts";

export interface LLMProvider {
  readonly name: string;
  complete: (prompt: string) => Promise<string>;
}

const DEFAULT_PRIORITY = ["openai", "anthropic", "gemini", "groq", "deepseek", "cerebras"] as const;

type ProviderName = (typeof DEFAULT_PRIORITY)[number];

class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  constructor(private readonly apiKey: string) {}
  async complete(prompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  constructor(private readonly apiKey: string) {}
  async complete(prompt: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.find((c) => c.type === "text")?.text ?? "";
  }
}

class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  constructor(private readonly apiKey: string) {}
  async complete(prompt: string): Promise<string> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates[0]?.content.parts[0]?.text ?? "";
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    readonly name: ProviderName,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey: string,
  ) {}
  async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`${this.name} ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message.content ?? "";
  }
}

interface EnvLike {
  [key: string]: string | undefined;
}

function buildAvailableProviders(env: EnvLike): Partial<Record<ProviderName, LLMProvider>> {
  const providers: Partial<Record<ProviderName, LLMProvider>> = {};
  if (env.OPENAI_API_KEY) providers.openai = new OpenAIProvider(env.OPENAI_API_KEY);
  if (env.ANTHROPIC_API_KEY) providers.anthropic = new AnthropicProvider(env.ANTHROPIC_API_KEY);
  if (env.GEMINI_API_KEY) providers.gemini = new GeminiProvider(env.GEMINI_API_KEY);
  if (env.GROQ_API_KEY)
    providers.groq = new OpenAICompatibleProvider(
      "groq",
      "https://api.groq.com/openai/v1",
      "llama-3.3-70b-versatile",
      env.GROQ_API_KEY,
    );
  if (env.DEEPSEEK_API_KEY)
    providers.deepseek = new OpenAICompatibleProvider(
      "deepseek",
      "https://api.deepseek.com",
      "deepseek-chat",
      env.DEEPSEEK_API_KEY,
    );
  if (env.CEREBRAS_API_KEY)
    providers.cerebras = new OpenAICompatibleProvider(
      "cerebras",
      "https://api.cerebras.ai/v1",
      "llama3.1-8b",
      env.CEREBRAS_API_KEY,
    );
  return providers;
}

function resolvePriority(env: EnvLike): ProviderName[] {
  const raw = env.AUTOSETUP_LLM_PRIORITY;
  if (!raw) return [...DEFAULT_PRIORITY];
  const parsed = raw.split(",").map((s) => s.trim()) as ProviderName[];
  return parsed.filter((p) => (DEFAULT_PRIORITY as readonly string[]).includes(p));
}

export interface GatewayAttempt {
  provider: ProviderName;
  ok: boolean;
  error?: string;
}

export interface GatewayResult {
  text: string;
  usedProvider: ProviderName;
  attempts: GatewayAttempt[];
}

export async function runGateway(
  prompt: string,
  providers: Partial<Record<ProviderName, LLMProvider>>,
  priority: ProviderName[],
): Promise<GatewayResult> {
  const attempts: GatewayAttempt[] = [];
  const configured = priority.filter((name) => providers[name]);

  if (configured.length === 0) {
    throw new Error(
      "Nenhum provider LLM configurado. Configure ao menos uma destas variáveis: " +
        "OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, CEREBRAS_API_KEY.",
    );
  }

  for (const name of configured) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      const text = await provider.complete(prompt);
      attempts.push({ provider: name, ok: true });
      return { text, usedProvider: name, attempts };
    } catch (err) {
      attempts.push({ provider: name, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  throw new Error(
    `Todos os providers configurados falharam: ${attempts.map((a) => `${a.provider} (${a.error})`).join("; ")}`,
  );
}

let activeEnv: EnvLike | null = null;

export const llmAdapter: AdapterDefinition<EnvLike> = {
  name: "llm-gateway",
  async connect(env) {
    activeEnv = env;
  },
  async disconnect() {
    activeEnv = null;
  },
};

export async function completeViaGateway(prompt: string): Promise<GatewayResult> {
  if (!activeEnv) {
    throw new Error("Gateway não conectado — chame llmAdapter.connect(env) primeiro.");
  }
  const providers = buildAvailableProviders(activeEnv);
  const priority = resolvePriority(activeEnv);
  return runGateway(prompt, providers, priority);
}
