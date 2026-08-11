"use client";

// AUTOSETUP — apps/core/web/src/app/admin/avisos/page.tsx
// Painel interno — Carlos publica aviso pros indicadores. Não linkado
// publicamente.

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function AdminAvisosPage() {
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function publicar() {
    if (!mensagem.trim()) return;
    setSalvando(true);
    setErro(null);
    setOk(false);
    try {
      const res = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao publicar.");
      } else {
        setOk(true);
        setMensagem("");
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">Avisos — painel interno</h1>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10 flex flex-col gap-4">
        <p className="text-xs text-paper-dim">
          Aparece pra todo indicador que abrir o Radar, o Manual, Meus
          Clientes ou Meu Desempenho. Só um aviso fica ativo por vez —
          publicar um novo substitui o anterior.
        </p>
        <textarea
          rows={3}
          placeholder="Ex: novo percentual de comissão a partir de segunda-feira..."
          className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
        <button
          type="button"
          onClick={publicar}
          disabled={salvando}
          className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2.5 text-sm hover:brightness-110 transition-all disabled:opacity-50 self-start"
        >
          {salvando ? "Publicando..." : "Publicar aviso"}
        </button>
        {ok && <p className="text-sm text-mint">Publicado — já está visível pros indicadores.</p>}
        {erro && <p className="text-sm text-rust">{erro}</p>}
      </main>
    </>
  );
}
