/**
 * Prospector Autônomo — Worker agendado (Cron Trigger)
 *
 * Roda 1x/dia. Para cada indicador com região cadastrada:
 *  1. Busca negócios próximos via Google Places Nearby Search
 *  2. Filtra os que já apareceram (reaproveita radar_visto)
 *  3. Calcula Opportunity Score (placeholder local — ver nota abaixo)
 *  4. Gera mensagem de abordagem via LLM Gateway (mesmo adapter do resto do monorepo)
 *  5. Grava em radar_pendentes pra o indicador ver ao abrir o app
 *
 * NOTA IMPORTANTE sobre calcularOpportunityScore: o README original deste
 * módulo presumia que já existia uma função compartilhada de Opportunity
 * Score, reaproveitável de `/radar`. Isso NÃO existe no monorepo — o
 * `/radar` atual (apps/core/web/src/lib/radar.ts) faz uma análise
 * qualitativa via IA (resumo/presença digital/oportunidades), sem nenhuma
 * fórmula numérica. `calcularScore()` abaixo é um placeholder heurístico
 * local até essa decisão de produto ser tomada (ver README.md deste
 * módulo, seção "Decisões pendentes").
 */

import { llmAdapter, completeViaGateway } from '@autosetup/adapter-llm';

interface Env {
  DB: D1Database;
  GOOGLE_PLACES_API_KEY: string;
  OPENAI_API_KEY: string;
}

interface IndicadorRegiao {
  codigo_indicador: string;
  lat: number;
  lng: number;
  raio_km: number;
}

interface PlaceResult {
  place_id: string;
  name: string;
  types: string[];
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
}

const MAX_NOVAS_POR_INDICADOR_DIA = 5;

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(rodarProspeccaoDiaria(env));
  },
};

async function rodarProspeccaoDiaria(env: Env) {
  // Depende da tabela `indicador_regiao` (migrations/0001_radar_pendentes.sql)
  // — populada por /radar/minha-regiao, suporta geolocalização do navegador
  // e endereço digitado manualmente (decisão de 12/08/2026). Enquanto a
  // migration não for aplicada em produção, esta query sempre retorna
  // vazio e o cron não tem o que fazer.
  const { results: regioes } = await env.DB.prepare(
    `SELECT codigo_indicador, lat, lng, raio_km FROM indicador_regiao`
  ).all<IndicadorRegiao>();

  if (!regioes || regioes.length === 0) {
    console.log('[prospector] nenhuma região de indicador cadastrada — nada a fazer');
    return;
  }

  await llmAdapter.connect({ OPENAI_API_KEY: env.OPENAI_API_KEY });
  try {
    for (const regiao of regioes) {
      try {
        await prospectarParaIndicador(env, regiao);
      } catch (err) {
        // um indicador falhando não pode derrubar os outros
        console.error(`[prospector] falha no indicador ${regiao.codigo_indicador}:`, err);
      }
    }
  } finally {
    await llmAdapter.disconnect();
  }
}

async function prospectarParaIndicador(env: Env, regiao: IndicadorRegiao) {
  const candidatos = await buscarNegociosProximos(env, regiao);

  const jaVistos = await negociosJaVistos(
    env,
    regiao.codigo_indicador,
    candidatos.map((c) => c.place_id)
  );

  const novos = candidatos.filter((c) => !jaVistos.has(c.place_id));
  const limitados = novos.slice(0, MAX_NOVAS_POR_INDICADOR_DIA);

  for (const negocio of limitados) {
    const score = calcularScore(negocio);
    const mensagem = await gerarMensagemAbordagem(negocio);

    await env.DB.prepare(
      `INSERT INTO radar_pendentes
         (id, codigo_indicador, place_id, nome_negocio, nicho, endereco,
          opportunity_score, mensagem_abordagem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(codigo_indicador, place_id) DO NOTHING`
    )
      .bind(
        crypto.randomUUID(),
        regiao.codigo_indicador,
        negocio.place_id,
        negocio.name,
        negocio.types[0] ?? null,
        negocio.vicinity,
        score,
        mensagem
      )
      .run();

    // marca como visto, igual o /radar já faz hoje
    await env.DB.prepare(
      `INSERT INTO radar_visto (codigo_indicador, place_id, visto_em)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(codigo_indicador, place_id) DO NOTHING`
    )
      .bind(regiao.codigo_indicador, negocio.place_id)
      .run();
  }

  console.log(
    `[prospector] indicador ${regiao.codigo_indicador}: ${limitados.length} oportunidades novas`
  );
}

async function buscarNegociosProximos(
  env: Env,
  regiao: IndicadorRegiao
): Promise<PlaceResult[]> {
  const raioMetros = regiao.raio_km * 1000;
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${regiao.lat},${regiao.lng}`);
  url.searchParams.set('radius', String(raioMetros));
  url.searchParams.set('key', env.GOOGLE_PLACES_API_KEY);

  const resp = await fetch(url.toString());
  const data = await resp.json<{ results: PlaceResult[] }>();
  return data.results ?? [];
}

async function negociosJaVistos(
  env: Env,
  codigoIndicador: string,
  placeIds: string[]
): Promise<Set<string>> {
  if (placeIds.length === 0) return new Set();

  const placeholders = placeIds.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT place_id FROM radar_visto
     WHERE codigo_indicador = ? AND place_id IN (${placeholders})`
  )
    .bind(codigoIndicador, ...placeIds)
    .all<{ place_id: string }>();

  return new Set((results ?? []).map((r) => r.place_id));
}

function calcularScore(negocio: PlaceResult): number {
  // Placeholder heurístico — ver nota no topo do arquivo. Substituir pela
  // fórmula real assim que a decisão de produto for tomada (README.md,
  // "Decisões pendentes").
  const semAvaliacoes = !negocio.user_ratings_total || negocio.user_ratings_total < 5;
  const notaBaixa = (negocio.rating ?? 5) < 4;
  let score = 0.5;
  if (semAvaliacoes) score += 0.3;
  if (notaBaixa) score += 0.2;
  return Math.min(score, 1);
}

async function gerarMensagemAbordagem(negocio: PlaceResult): Promise<string> {
  const prompt = `Escreva uma mensagem curta de abordagem comercial (WhatsApp, 2-3 frases,
tom consultivo, sem urgência falsa, sem prova social inventada) para o negócio
"${negocio.name}" (${negocio.types[0] ?? 'negócio local'}, ${negocio.vicinity}).
O objetivo é oferecer um diagnóstico digital gratuito, não vender direto.`;

  const resultado = await completeViaGateway(prompt);
  return resultado.text;
}
