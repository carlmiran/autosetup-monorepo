"use client";

// AUTOSETUP — src/components/AvisoIndicadores.tsx
// Banner de aviso — mostra o aviso ativo mais recente, se existir.
// Usado em /radar, /radar/manual, /radar/meus-clientes,
// /radar/meu-desempenho.

import { useEffect, useState } from "react";

export function AvisoIndicadores() {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/avisos");
        const data = (await res.json()) as { aviso?: string | null };
        setAviso(data.aviso ?? null);
      } catch {
        // best-effort — não mostra nada se falhar, não trava a página
      }
    })();
  }, []);

  if (!aviso) return null;

  return (
    <div className="border border-amber-dim bg-panel rounded-lg px-4 py-3 text-sm text-paper mx-6 mt-4">
      <span className="font-mono text-[10px] tracking-widest uppercase text-amber mr-2">Aviso</span>
      {aviso}
    </div>
  );
}
