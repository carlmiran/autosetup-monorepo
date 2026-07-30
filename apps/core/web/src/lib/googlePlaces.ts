// AUTOSETUP — apps/core/web/src/lib/googlePlaces.ts
// Busca real de concorrentes via Google Places API (New) — dado
// estruturado direto do Google (nome, endereço, avaliações, nota),
// mais confiável que a IA "lendo a internet" via web_search. Fonte:
// pedido de Carlos (30/07/2026) — precisão da comparação com
// concorrentes precisava melhorar.
//
// Gracioso: se GOOGLE_PLACES_API_KEY não estiver configurada, retorna
// lista vazia — o chamador cai de volta pro método antigo (busca via
// IA), nunca quebra o diagnóstico por causa disso.

export interface ConcorrenteReal {
  nome: string;
  endereco?: string;
  avaliacoes?: number;
  nota?: number;
}

interface PlaceResultado {
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
}

export interface NegocioProximo {
  id: string;
  nome: string;
  endereco?: string;
  avaliacoes?: number;
  nota?: number;
  categoria?: string;
  latitude?: number;
  longitude?: number;
}

interface PlaceNearbyResultado {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
}

/** Busca negócios reais perto de uma coordenada (estilo "pedir um Uber")
 * — não exige nicho. Se "tipoNegocio" for informado, filtra por
 * categoria; senão, traz o que houver de estabelecimentos comerciais na
 * área. Fonte: pedido de Carlos (30/07/2026) — navegar concorrentes
 * reais por localização, clicar num pra analisar como prospect. */
export async function buscarNegociosProximos(
  latitude: number,
  longitude: number,
  raioMetros = 1500,
  tipoNegocio?: string,
): Promise<NegocioProximo[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: { center: { latitude, longitude }, radius: raioMetros },
      },
      languageCode: "pt-BR",
      maxResultCount: 20,
    };
    if (tipoNegocio) {
      body.includedTypes = [tipoNegocio];
    }

    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating," +
          "places.userRatingCount,places.primaryTypeDisplayName,places.location",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[googlePlaces] erro no nearby:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { places?: PlaceNearbyResultado[] };
    return (data.places ?? [])
      .filter((p) => p.displayName?.text && p.id)
      .map((p) => ({
        id: p.id!,
        nome: p.displayName!.text!,
        endereco: p.formattedAddress,
        avaliacoes: p.userRatingCount,
        nota: p.rating,
        categoria: p.primaryTypeDisplayName?.text,
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
      }));
  } catch (err) {
    console.error("[googlePlaces] falha no nearby:", err);
    return [];
  }
}

export async function buscarConcorrentesGooglePlaces(
  nicho: string,
  cidade: string,
): Promise<ConcorrenteReal[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: `${nicho} em ${cidade}`,
        languageCode: "pt-BR",
        maxResultCount: 5,
      }),
    });

    if (!res.ok) {
      console.error("[googlePlaces] erro:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as { places?: PlaceResultado[] };
    return (data.places ?? [])
      .filter((p) => p.displayName?.text)
      .slice(0, 3)
      .map((p) => ({
        nome: p.displayName!.text!,
        endereco: p.formattedAddress,
        avaliacoes: p.userRatingCount,
        nota: p.rating,
      }));
  } catch (err) {
    console.error("[googlePlaces] falha na busca:", err);
    return [];
  }
}
