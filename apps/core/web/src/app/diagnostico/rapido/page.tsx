"use client";

// AUTOSETUP — apps/core/web/src/app/diagnostico/rapido/page.tsx
// Versão curta do diagnóstico — 5 perguntas, mesmo motor real por
// trás (/api/diagnostico), mesmo padrão de campo com áudio. Fonte:
// pedido de Carlos (13/08/2026) — frustração recorrente e real de
// gente como o Fábio achando o formulário completo longo demais.
//
// Mantido do formulário antigo só o essencial: nome do negócio,
// cidade e nicho (os 3 já obrigatórios de verdade no backend) + o
// WhatsApp (necessário pra funcionar com o funil/parecer de
// prioridade que já existem em /radar/meus-clientes — sem isso, o
// cruzamento por WhatsApp não acha esse diagnóstico depois) + maior
// dificuldade (o campo de maior valor pra priorização, segundo
// avaliação anterior desta mesma sessão). Multinicho: nicho continua
// texto livre, sem nada específico de hospedagem nem de nenhum outro
// segmento.

import { useState } from "react";
import Link from "next/link";
import { CampoTextoComAudio } from "@/components/CampoTextoComAudio";
import { Logo } from "@/components/Logo";

interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  oportunidades: string[];
  proximoPasso: string;
  planoSeteDias: { dia: number; acao: string; conteudoSugerido?: string | null; prioridade?: string }[];
  comparacaoConcorrentes?: {
    concorrentes: { nome: string; destaque: string }[];
    posicionamento: string;
  } | null;
  codigoDesconto?: string | null;
  percentualDesconto?: number | null;
}

const formInicial = {
  nomeNegocio: "",
  cidade: "",
  nicho: "",
  whatsappContato: "",
  maiorDificuldade: "",
};

export default function DiagnosticoRapidoPage() {
  const [form, setForm] = useState(formInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);
  const [codigoIndicacao] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("ref") ?? "",
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultado(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000);

    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ ...form, codigoIndicacao: codigoIndicacao || undefined }),
      });
      const data = (await res.json()) as DiagnosticoResultado & { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao gerar diagnóstico.");
      } else {
        setResultado(data);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setErro("A geração demorou mais do que o esperado — tente de novo em alguns instantes.");
      } else {
        setErro("Não foi possível conectar ao servidor.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  if (resultado) {
    return (
      <>
        <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
          <Logo size={32} />
          <h1 className="font-display text-xl text-paper">Seu diagnóstico</h1>
        </header>
        <main className="mx-auto max-w-xl px-6 py-10 flex flex-col gap-6">
          <p className="text-sm">{resultado.resumo}</p>

          {resultado.pontosFavoraveis.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">Pontos favoráveis</h2>
              <ul className="list-disc pl-5 flex flex-col gap-1 text-sm">
                {resultado.pontosFavoraveis.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.oportunidades.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">Oportunidades</h2>
              <ul className="list-disc pl-5 flex flex-col gap-1 text-sm">
                {resultado.oportunidades.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.comparacaoConcorrentes && resultado.comparacaoConcorrentes.concorrentes.length > 0 && (
            <div>
              <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">Você x concorrência</h2>
              <p className="text-sm text-paper-dim mb-2">{resultado.comparacaoConcorrentes.posicionamento}</p>
              <ul className="list-disc pl-5 flex flex-col gap-1 text-sm">
                {resultado.comparacaoConcorrentes.concorrentes.map((c, i) => (
                  <li key={i}>
                    <strong>{c.nome}</strong> — {c.destaque}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">Plano de 7 dias</h2>
            <ol className="flex flex-col gap-3">
              {resultado.planoSeteDias.map((item) => (
                <li key={item.dia} className="border border-panel-line rounded-lg p-3 bg-ink">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-amber mb-1">Dia {item.dia}</p>
                  <p className="text-sm">{item.acao}</p>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-sm">{resultado.proximoPasso}</p>

          {resultado.codigoDesconto && (
            <div className="border border-mint rounded-lg p-4 bg-mint-dim text-center">
              <p className="text-xs text-mint font-mono tracking-widest uppercase mb-1">
                Você ganhou {resultado.percentualDesconto}% de desconto
              </p>
              <p className="font-mono text-lg text-mint font-bold tracking-wider">{resultado.codigoDesconto}</p>
              <p className="text-xs text-mint/70 mt-1">Vale na assinatura mensal (Essencial ou Completo).</p>
            </div>
          )}

          <Link href="/planos" className="underline text-amber font-semibold text-center text-sm">
            Ver planos completos
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Diagnóstico rápido</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            5 perguntas, pode responder falando. Mesmo diagnóstico real de sempre.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <form onSubmit={enviar} className="flex flex-col gap-5">
          <CampoTextoComAudio
            label="Nome do seu negócio"
            ajuda="Como as pessoas conhecem o seu negócio."
            required
            value={form.nomeNegocio}
            onChange={(v) => setForm({ ...form, nomeNegocio: v })}
          />
          <CampoTextoComAudio
            label="Cidade"
            ajuda="Onde o negócio funciona."
            required
            value={form.cidade}
            onChange={(v) => setForm({ ...form, cidade: v })}
          />
          <CampoTextoComAudio
            label="Que tipo de negócio é esse?"
            ajuda='Pode ser qualquer coisa — "pousada", "barbearia", "consultoria", o que for.'
            required
            value={form.nicho}
            onChange={(v) => setForm({ ...form, nicho: v })}
          />
          <CampoTextoComAudio
            label="Seu WhatsApp"
            ajuda="Pra gente te retornar e acompanhar o resultado."
            required
            value={form.whatsappContato}
            onChange={(v) => setForm({ ...form, whatsappContato: v })}
          />
          <CampoTextoComAudio
            label="Qual a maior dificuldade hoje?"
            ajuda="O que mais atrapalha o negócio a crescer, hoje."
            required
            value={form.maiorDificuldade}
            onChange={(v) => setForm({ ...form, maiorDificuldade: v })}
          />

          {erro && <p className="text-sm text-rust">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-3.5 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Gerando diagnóstico..." : "Ver meu diagnóstico"}
          </button>

          <p className="text-xs text-paper-dim text-center">
            Quer preencher com mais detalhe?{" "}
            <Link href="/diagnostico" className="underline text-amber">
              Use o diagnóstico completo
            </Link>
            .
          </p>
        </form>
      </main>
    </>
  );
}
