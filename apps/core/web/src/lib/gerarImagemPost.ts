// AUTOSETUP — apps/core/web/src/lib/gerarImagemPost.ts
// Geração real de imagem pra post de rede social, a partir do roteiro
// já produzido pelo diagnóstico (tema + ideia de legenda). Fonte:
// decisão de Carlos (06/08/2026) — custo por imagem é baixo (~R$0,10 a
// R$0,20 via OpenAI GPT Image), embutido no preço dos planos pagos, não
// no diagnóstico gratuito. Por isso esta função NÃO é chamada
// automaticamente no fluxo do /diagnostico — só na entrega manual dos
// planos (Raio-X e mensais), feita pela equipe.

export interface ImagemPostResultado {
  /** Imagem em base64 (PNG), pronta pra salvar/enviar. */
  imagemBase64: string;
}

export async function gerarImagemPost(
  tema: string,
  legenda: string,
): Promise<ImagemPostResultado> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada — geração de imagem indisponível.");
  }

  const prompt = `Crie uma arte de post de rede social (formato quadrado, estilo fotografia profissional/editorial, sem texto sobreposto, sem logotipo) que ilustre visualmente: "${tema}". Contexto da legenda que vai acompanhar: "${legenda}". Estilo: limpo, moderno, cores quentes, adequado pra pequeno negócio local brasileiro. NUNCA inclua texto, letras ou palavras dentro da imagem.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "low",
      n: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI Images API retornou ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const imagemBase64 = data.data?.[0]?.b64_json;
  if (!imagemBase64) {
    throw new Error("A API não retornou imagem.");
  }

  return { imagemBase64 };
}
