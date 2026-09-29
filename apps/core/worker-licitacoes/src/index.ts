/**
 * Radar de Licitações Públicas — Worker agendado (Cron Trigger)
 *
 * Roda 1x/dia. Para cada perfil de cliente ativo:
 *  1. Consulta a API pública do PNCP (sem autenticação) por licitações
 *     publicadas no período (ex.: últimas 24h)
 *  2. Filtra localmente por palavra-chave / UF / valor máximo do perfil
 *  3. Gera um resumo em linguagem simples via LLM Gateway (mesmo adapter
 *     usado no resto do monorepo, não uma chamada direta à OpenAI)
 *  4. Envia e-mail (Resend, mesmo padrão de apps/core/web/src/lib/resend.ts)
 *     e grava histórico
 */

import { llmAdapter, completeViaGateway } from '@autosetup/adapter-llm';

interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;
  NOTIFICATION_FROM_EMAIL: string;
}

interface PerfilLicitacao {
  id: string;
  cliente_email: string;
  palavras_chave: string; // csv
  uf: string | null;
  valor_max: number | null;
}

interface ContratacaoPNCP {
  numeroControlePNCP: string;
  objetoCompra: string;
  orgaoEntidade: { razaoSocial: string };
  unidadeOrgao: { ufSigla: string };
  valorTotalEstimado: number | null;
  dataEncerramentoProposta: string | null;
}

const PNCP_BASE = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao';

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(rodarRadarLicitacoes(env));
  },
};

async function rodarRadarLicitacoes(env: Env) {
  const { results: perfis } = await env.DB.prepare(
    `SELECT id, cliente_email, palavras_chave, uf, valor_max
     FROM licitacao_perfil WHERE ativo = 1`
  ).all<PerfilLicitacao>();

  if (!perfis || perfis.length === 0) {
    console.log('[licitacoes] nenhum perfil ativo — nada a fazer');
    return;
  }

  // Busca uma vez o lote do dia (mesma janela pra todos os perfis, filtro é local)
  const contratacoesDoDia = await buscarContratacoesPublicadasHoje();

  await llmAdapter.connect({ OPENAI_API_KEY: env.OPENAI_API_KEY });
  try {
    for (const perfil of perfis) {
      try {
        await processarPerfil(env, perfil, contratacoesDoDia);
      } catch (err) {
        console.error(`[licitacoes] falha no perfil ${perfil.id}:`, err);
      }
    }
  } finally {
    await llmAdapter.disconnect();
  }
}

async function buscarContratacoesPublicadasHoje(): Promise<ContratacaoPNCP[]> {
  const hoje = formatarDataPNCP(new Date());
  const todas: ContratacaoPNCP[] = [];

  // Modalidades mais comuns pra PME: 6 = Pregão Eletrônico, 8 = Dispensa
  // (ajustar conforme a tabela de domínio do PNCP se quiser cobrir mais)
  const modalidades = [6, 8];

  for (const modalidade of modalidades) {
    let pagina = 1;
    let temMaisPaginas = true;

    while (temMaisPaginas && pagina <= 5) {
      // limite de 5 páginas/modalidade/dia — ajustar depois de ver volume real
      const url = new URL(PNCP_BASE);
      url.searchParams.set('dataInicial', hoje);
      url.searchParams.set('dataFinal', hoje);
      url.searchParams.set('codigoModalidadeContratacao', String(modalidade));
      url.searchParams.set('pagina', String(pagina));

      const resp = await fetch(url.toString());
      if (!resp.ok) break;

      const data = await resp.json<{ data: ContratacaoPNCP[]; totalPaginas: number }>();
      todas.push(...(data.data ?? []));
      temMaisPaginas = pagina < (data.totalPaginas ?? 1);
      pagina++;
    }
  }

  return todas;
}

function formatarDataPNCP(d: Date): string {
  // formato exigido pelo PNCP: AAAAMMDD
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function processarPerfil(
  env: Env,
  perfil: PerfilLicitacao,
  contratacoes: ContratacaoPNCP[]
) {
  const palavras = perfil.palavras_chave
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const relevantes = contratacoes.filter((c) => {
    const objeto = (c.objetoCompra ?? '').toLowerCase();
    const bateKeyword = palavras.some((p) => objeto.includes(p));
    const bateUF = !perfil.uf || c.unidadeOrgao?.ufSigla === perfil.uf;
    const bateValor =
      !perfil.valor_max ||
      !c.valorTotalEstimado ||
      c.valorTotalEstimado <= perfil.valor_max;
    return bateKeyword && bateUF && bateValor;
  });

  for (const c of relevantes) {
    const jaEnviada = await env.DB.prepare(
      `SELECT 1 FROM licitacao_encontrada WHERE perfil_id = ? AND numero_controle_pncp = ?`
    )
      .bind(perfil.id, c.numeroControlePNCP)
      .first();

    if (jaEnviada) continue;

    const resumo = await gerarResumoSimples(c);

    await env.DB.prepare(
      `INSERT INTO licitacao_encontrada
         (id, perfil_id, numero_controle_pncp, objeto, orgao, uf,
          valor_estimado, data_encerramento_proposta, resumo_simples, enviado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(
        crypto.randomUUID(),
        perfil.id,
        c.numeroControlePNCP,
        c.objetoCompra,
        c.orgaoEntidade?.razaoSocial ?? '',
        c.unidadeOrgao?.ufSigla ?? '',
        c.valorTotalEstimado,
        c.dataEncerramentoProposta,
        resumo
      )
      .run();

    await enviarEmail(env, perfil.cliente_email, c, resumo);
  }
}

async function gerarResumoSimples(c: ContratacaoPNCP): Promise<string> {
  const prompt = `Resuma esta licitação pública em linguagem simples pra um
pequeno empresário sem experiência com licitações, em até 4 frases:
o que o órgão quer comprar/contratar, prazo pra enviar proposta, e o que
geralmente é exigido pra participar (documentação básica). Não invente dado
que não está aqui.

Órgão: ${c.orgaoEntidade?.razaoSocial}
Objeto: ${c.objetoCompra}
Valor estimado: ${c.valorTotalEstimado ?? 'não informado'}
Prazo proposta: ${c.dataEncerramentoProposta ?? 'não informado'}`;

  const resultado = await completeViaGateway(prompt);
  return resultado.text;
}

async function enviarEmail(
  env: Env,
  destinatario: string,
  c: ContratacaoPNCP,
  resumo: string
) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.NOTIFICATION_FROM_EMAIL,
        to: [destinatario],
        subject: `Nova licitação compatível: ${c.orgaoEntidade?.razaoSocial ?? ''}`,
        html: `<p>${resumo}</p><p>Nº controle PNCP: ${c.numeroControlePNCP}</p>`,
      }),
    });

    if (!res.ok) {
      console.error('[licitacoes] falha ao enviar e-mail:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[licitacoes] erro ao enviar e-mail:', err);
  }
}
