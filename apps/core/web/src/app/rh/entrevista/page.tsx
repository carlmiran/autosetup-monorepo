"use client";

// AUTOSETUP — apps/core/web/src/app/rh/entrevista/page.tsx
// Entrevista de alimentação do AutoSetup RH — não diagnostica um
// negócio, coleta conhecimento de domínio real de quem entende de RH
// (cliente zero), pra construir o produto em cima do que ela sabe de
// verdade, não do que a IA supõe sobre RH. Mesmo padrão do diagnóstico:
// perguntas abertas, opção de responder por áudio, rascunho salvo
// automaticamente (nunca perder o que foi preenchido).

import { useState } from "react";
import Link from "next/link";
import { CampoTextoComAudio } from "@/components/CampoTextoComAudio";
import { Logo } from "@/components/Logo";

const CHAVE_LOCALSTORAGE = "autosetup-rh-entrevista-rascunho";

const initialForm = {
  nome: "",
  formacao: "",
  fascinaRh: "",
  processosMalResolvidos: "",
  ferramentaIdeal: "",
  processoContratacaoIdeal: "",
  errosComuns: "",
  termosImportantes: "",
  nuncaAutomatizar: "",
  orgulho: "",
};

interface Resultado {
  resumoExecutivo: string;
  doresIdentificadas: string[];
  requisitosDeProduto: string[];
  vocabularioDeDominio: string[];
  limitesEticos: string[];
  entrevistaId?: number | null;
}

function restaurarRascunho(): { form: typeof initialForm; restaurado: boolean } {
  if (typeof window === "undefined") return { form: initialForm, restaurado: false };
  try {
    const salvo = window.localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (salvo) {
      const parsed = JSON.parse(salvo) as Partial<typeof initialForm>;
      const temDado = Object.values(parsed).some((v) => typeof v === "string" && v.trim());
      if (temDado) return { form: { ...initialForm, ...parsed }, restaurado: true };
    }
  } catch {
    // rascunho corrompido — ignora
  }
  return { form: initialForm, restaurado: false };
}

export default function EntrevistaRhPage() {
  const [form, setForm] = useState(() => restaurarRascunho().form);
  const [restaurado, setRestaurado] = useState(() => restaurarRascunho().restaurado);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function salvarRascunho(novoForm: typeof initialForm) {
    setForm(novoForm);
    try {
      window.localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(novoForm));
    } catch {
      // localStorage indisponível — segue sem salvar
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultado(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000);

    try {
      const res = await fetch("/api/rh/entrevista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as Resultado & { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao processar a entrevista.");
      } else {
        setResultado(data);
        try {
          window.localStorage.removeItem(CHAVE_LOCALSTORAGE);
        } catch {
          // ignora
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setErro("Demorou mais que o esperado. Suas respostas continuam salvas — tente de novo.");
      } else {
        setErro("Não foi possível conectar. Suas respostas continuam salvas — tente de novo.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">AutoSetup RH — Entrevista de construção</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Esse questionário não avalia ninguém — ele existe pra você nos
            contar o que sabe de verdade sobre RH, pra gente construir o
            produto em cima disso. Responda com calma, digitando ou
            gravando áudio.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {restaurado && (
          <div className="border border-mint/30 bg-mint-dim rounded-lg p-3 text-sm text-mint mb-5 flex items-center justify-between gap-2">
            <span>Recuperamos o que você já tinha respondido antes.</span>
            <button
              type="button"
              onClick={() => {
                salvarRascunho(initialForm);
                setRestaurado(false);
              }}
              className="font-mono text-xs underline shrink-0"
            >
              Começar do zero
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1 text-sm">
            Seu nome
            <input
              required
              className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 focus-visible:outline-amber"
              value={form.nome}
              onChange={(e) => salvarRascunho({ ...form, nome: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Sua formação/experiência com RH até agora
            <span className="text-xs text-paper-dim">
              Faculdade, cursos, experiência prática — o que for.
            </span>
            <input
              className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 focus-visible:outline-amber"
              value={form.formacao}
              onChange={(e) => salvarRascunho({ ...form, formacao: e.target.value })}
            />
          </label>

          <CampoTextoComAudio
            label="O que te fascina em RH? O que te fez escolher essa área?"
            ajuda="Sem filtro — queremos entender de verdade o que te move aqui."
            required
            value={form.fascinaRh}
            onChange={(v) => salvarRascunho({ ...form, fascinaRh: v })}
          />

          <CampoTextoComAudio
            label="Quais processos de RH você acha mais mal resolvidos em pequenas empresas?"
            ajuda="Pense em empresas pequenas, sem RH dedicado — o que costuma dar errado?"
            required
            value={form.processosMalResolvidos}
            onChange={(v) => salvarRascunho({ ...form, processosMalResolvidos: v })}
          />

          <CampoTextoComAudio
            label="Se você pudesse construir uma ferramenta de RH do zero pra pequenos negócios, o que ela resolveria primeiro?"
            ajuda="Essa é a pergunta mais importante — capriche."
            required
            value={form.ferramentaIdeal}
            onChange={(v) => salvarRascunho({ ...form, ferramentaIdeal: v })}
          />

          <CampoTextoComAudio
            label="Como seria o processo ideal de contratação pra uma empresa pequena?"
            ajuda="Do anúncio da vaga até a pessoa começar a trabalhar."
            value={form.processoContratacaoIdeal}
            onChange={(v) => salvarRascunho({ ...form, processoContratacaoIdeal: v })}
          />

          <CampoTextoComAudio
            label="Que erros você já viu (ou aprendeu) que pequenas empresas cometem com contratação, avaliação ou demissão?"
            ajuda="Casos reais ou de aula, tanto faz."
            value={form.errosComuns}
            onChange={(v) => salvarRascunho({ ...form, errosComuns: v })}
          />

          <CampoTextoComAudio
            label="Quais termos/conceitos de RH são importantes o sistema entender e usar do jeito certo?"
            ajuda="Vocabulário técnico que a gente não pode errar."
            value={form.termosImportantes}
            onChange={(v) => salvarRascunho({ ...form, termosImportantes: v })}
          />

          <CampoTextoComAudio
            label="Existe algo em RH que nunca deveria ser automatizado, só feito por gente?"
            ajuda="Isso ajuda a gente a saber onde parar."
            value={form.nuncaAutomatizar}
            onChange={(v) => salvarRascunho({ ...form, nuncaAutomatizar: v })}
          />

          <CampoTextoComAudio
            label="O que faria você se orgulhar de ter ajudado a construir?"
            ajuda="Pensa no resultado final — o que faria valer a pena."
            value={form.orgulho}
            onChange={(v) => salvarRascunho({ ...form, orgulho: v })}
          />

          <button
            type="submit"
            disabled={loading}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-4 mt-2 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Organizando suas respostas..." : "Enviar contribuição"}
          </button>
          {loading && (
            <p className="text-xs text-paper-dim text-center -mt-3">
              Pode levar até 1 minuto. Suas respostas já estão salvas de
              qualquer forma.
            </p>
          )}
        </form>

        {erro && (
          <div className="mt-6 border border-rust/40 bg-rust-dim text-rust rounded-lg p-4 text-sm">
            {erro}
          </div>
        )}

        {resultado && (
          <div className="mt-8 border border-panel-line rounded-xl p-6 flex flex-col gap-6 bg-panel">
            <div>
              <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
                Resumo da sua contribuição
              </h2>
              <p className="text-sm">{resultado.resumoExecutivo}</p>
            </div>

            {resultado.doresIdentificadas.length > 0 && (
              <div className="border-l-2 border-rust pl-4">
                <h2 className="font-mono text-xs tracking-widest uppercase text-rust mb-1">
                  Dores identificadas
                </h2>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  {resultado.doresIdentificadas.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.requisitosDeProduto.length > 0 && (
              <div className="border-l-2 border-amber pl-4">
                <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-1">
                  Requisitos de produto
                </h2>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  {resultado.requisitosDeProduto.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.vocabularioDeDominio.length > 0 && (
              <div className="border-l-2 border-mint pl-4">
                <h2 className="font-mono text-xs tracking-widest uppercase text-mint mb-1">
                  Vocabulário de domínio
                </h2>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  {resultado.vocabularioDeDominio.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.limitesEticos.length > 0 && (
              <div className="border-l-2 border-panel-line pl-4">
                <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
                  Limites éticos apontados
                </h2>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  {resultado.limitesEticos.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-paper-dim border-t border-panel-line pt-4">
              Obrigado pela contribuição — isso vai direto pro PRD do AutoSetup RH.
            </p>
          </div>
        )}
        <footer className="text-center mt-10">
          <Link href="/privacidade" className="text-xs text-paper-dim underline">
            Privacidade e Termos de Uso
          </Link>
        </footer>
      </main>
    </>
  );
}
