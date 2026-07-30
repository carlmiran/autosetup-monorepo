// AUTOSETUP — apps/core/web/src/lib/mercadoPago.ts
// Integração real com Mercado Pago. Fonte: pedido de Carlos
// (30/07/2026) — checkout de verdade pros planos.
//
// Dois mecanismos distintos, confirmados na documentação oficial:
// - Pagamento único (Raio-X, R$97): API de Preferências (Checkout Pro)
// - Assinatura mensal (Essencial/Completo): API de Preapproval

const MP_BASE = "https://api.mercadopago.com";

export interface PlanoConfig {
  id: string;
  nome: string;
  valor: number;
  tipo: "unico" | "assinatura";
}

export const PLANOS: Record<string, PlanoConfig> = {
  raiox: { id: "raiox", nome: "Raio-X + Plano de Ação", valor: 97, tipo: "unico" },
  essencial: { id: "essencial", nome: "Parceria Mensal Essencial", valor: 397, tipo: "assinatura" },
  completo: { id: "completo", nome: "Parceria Mensal Completa", valor: 797, tipo: "assinatura" },
};

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada — pagamento indisponível neste ambiente.");
  }
  return token;
}

/** Pagamento único — cria uma Preferência e retorna a URL de checkout
 * (init_point) pra redirecionar o cliente.
 *
 * Split de comissão (opcional): quando "comissao" é informado, usa o
 * parâmetro marketplace_fee do Mercado Pago pra tentar rotear a
 * comissão pra conta conectada do indicador. ATENÇÃO REAL: a mecânica
 * exata de "marketplace_fee" pra rotear a um terceiro dinâmico
 * (indicador diferente a cada venda) tem nuance que não consegui
 * confirmar 100% sem teste real contra a API — Carlos precisa validar
 * isso no ambiente de sandbox do Mercado Pago, com conta de teste,
 * ANTES de usar com dinheiro real. Ver docs/plano-comissao-indicadores.md. */
export async function criarPreferencia(
  plano: PlanoConfig,
  email: string,
  urlBase: string,
  comissao?: { mpUserId: string; valor: number },
): Promise<{ checkoutUrl: string; mpId: string }> {
  const token = getAccessToken();

  const res = await fetch(`${MP_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: `AutoSetup — ${plano.nome}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: plano.valor,
        },
      ],
      payer: { email },
      back_urls: {
        success: `${urlBase}/planos/sucesso`,
        failure: `${urlBase}/planos`,
        pending: `${urlBase}/planos`,
      },
      auto_return: "approved",
      external_reference: `${plano.id}:${email}:${Date.now()}`,
      ...(comissao ? { marketplace_fee: comissao.valor } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago retornou ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { checkoutUrl: data.init_point, mpId: data.id };
}

/** Assinatura mensal — cria uma Preapproval sem plano associado (mais
 * simples de operar sem precisar cadastrar um "plano" formal antes) e
 * retorna a URL de checkout pra o cliente autorizar a cobrança
 * recorrente. */
export async function criarAssinatura(
  plano: PlanoConfig,
  email: string,
  urlBase: string,
): Promise<{ checkoutUrl: string; mpId: string }> {
  const token = getAccessToken();

  const res = await fetch(`${MP_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: `AutoSetup — ${plano.nome}`,
      external_reference: `${plano.id}:${email}:${Date.now()}`,
      payer_email: email,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plano.valor,
        currency_id: "BRL",
      },
      back_url: `${urlBase}/planos/sucesso`,
      status: "pending",
    }),
  });

  if (!res.ok) {
    throw new Error(`Mercado Pago retornou ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { checkoutUrl: data.init_point, mpId: data.id };
}
