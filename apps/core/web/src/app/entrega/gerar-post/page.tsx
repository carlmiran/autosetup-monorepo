"use client";

// AUTOSETUP — apps/core/web/src/app/entrega/gerar-post/page.tsx
// Ferramenta interna de entrega — não linkada em nenhum menu público.
// Time usa isso pra gerar a imagem de um post real, a partir do tema e
// legenda (que já vêm prontos do plano de 7 dias do diagnóstico, ou
// digitados à mão). Custo real por geração: ~R$0,10-0,20 — cabe no
// preço já cobrado dos planos pagos (ver docs/checklist-entrega.md).

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function GerarPostPage() {
  const [tema, setTema] = useState("");
  const [legenda, setLegenda] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [imagem, setImagem] = useState<string | null>(null);

  async function gerar() {
    if (!tema.trim() || !legenda.trim()) {
      setErro("Preencha tema e legenda.");
      return;
    }
    setLoading(true);
    setErro(null);
    setImagem(null);
    try {
      const res = await fetch("/api/entrega/gerar-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, legenda }),
      });
      const data = (await res.json()) as { imagemBase64?: string; error?: string };
      if (!res.ok || !data.imagemBase64) {
        setErro(data.error ?? "Não foi possível gerar a imagem.");
      } else {
        setImagem(`data:image/png;base64,${data.imagemBase64}`);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Gerar post (entrega)</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Ferramenta interna. Cole o tema e a legenda que já vieram do
            plano de 7 dias do diagnóstico, ou digite à mão.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Tema do post
          <input
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 focus-visible:outline-amber"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ideia de legenda
          <textarea
            rows={3}
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 focus-visible:outline-amber"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-3 hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "Gerando imagem..." : "Gerar imagem"}
        </button>

        {erro && <p className="text-sm text-rust">{erro}</p>}

        {imagem && (
          <div className="border border-panel-line rounded-lg p-4 bg-panel flex flex-col gap-3 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagem} alt="Post gerado" className="rounded-lg max-w-full" />
            <a
              href={imagem}
              download="post-autosetup.png"
              className="text-sm underline text-amber"
            >
              Baixar imagem
            </a>
          </div>
        )}
      </main>
    </>
  );
}
