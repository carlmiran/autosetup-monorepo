// AUTOSETUP — apps/core/web/src/lib/rateLimit.ts
// Proteção real contra abuso de custo — cada chamada dessas rotas custa
// dinheiro de verdade (LLM, web_search, transcrição). Fonte: pedido de
// Carlos (29/07/2026) — "melhoramentos pra AutoSetup ficar mais robusto
// e pronto pra vender". Usa o mesmo D1 já existente, sem serviço novo.

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface LimiteConfig {
  /** Nome da rota, usado como parte da chave — cada rota tem seu próprio limite. */
  rota: string;
  /** Quantas chamadas permitidas dentro da janela de tempo. */
  maximo: number;
  /** Duração da janela, em minutos. */
  janelaMinutos: number;
}

export interface ResultadoRateLimit {
  permitido: boolean;
  restante: number;
}

/** Verifica e incrementa o contador de uso pra um IP+rota. Best-effort:
 * se o D1 não estiver disponível, permite a requisição (não bloqueia
 * o produto por causa de uma falha de infraestrutura secundária). */
export async function verificarRateLimit(
  request: Request,
  config: LimiteConfig,
): Promise<ResultadoRateLimit> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "desconhecido";
  const chave = `${config.rota}:${ip}`;

  try {
    const { env } = getCloudflareContext();
    const db = (env as { DB?: D1Database }).DB;
    if (!db) return { permitido: true, restante: config.maximo };

    const agora = new Date();
    const existente = await db
      .prepare("SELECT contagem, expira_em FROM rate_limits WHERE chave = ?")
      .bind(chave)
      .first<{ contagem: number; expira_em: string }>();

    if (!existente || new Date(existente.expira_em) < agora) {
      const expiraEm = new Date(agora.getTime() + config.janelaMinutos * 60_000).toISOString();
      await db
        .prepare(
          "INSERT INTO rate_limits (chave, contagem, expira_em) VALUES (?, 1, ?) " +
            "ON CONFLICT(chave) DO UPDATE SET contagem = 1, expira_em = excluded.expira_em",
        )
        .bind(chave, expiraEm)
        .run();
      return { permitido: true, restante: config.maximo - 1 };
    }

    if (existente.contagem >= config.maximo) {
      return { permitido: false, restante: 0 };
    }

    await db
      .prepare("UPDATE rate_limits SET contagem = contagem + 1 WHERE chave = ?")
      .bind(chave)
      .run();

    return { permitido: true, restante: config.maximo - existente.contagem - 1 };
  } catch (err) {
    console.error("[rateLimit] falha ao verificar — permitindo por segurança:", err);
    return { permitido: true, restante: config.maximo };
  }
}
