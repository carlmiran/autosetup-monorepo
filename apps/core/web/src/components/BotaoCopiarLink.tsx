"use client";

// AUTOSETUP — src/components/BotaoCopiarLink.tsx
// Copia o link completo (com domínio) pra área de transferência. Rota
// relativa ganha o domínio atual na hora do clique.

import { useState } from "react";

export function BotaoCopiarLink({ href }: { href: string }) {
  const [estado, setEstado] = useState<"parado" | "copiado" | "falhou">("parado");

  async function copiar() {
    const url = href.startsWith("http") ? href : `${window.location.origin}${href}`;
    try {
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
    } catch {
      setEstado("falhou");
    }
    setTimeout(() => setEstado("parado"), 1800);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex-1 font-mono text-xs border border-panel-line text-paper rounded-md px-3 py-2 hover:border-amber hover:text-amber transition-colors"
    >
      {estado === "copiado" ? "✓ Copiado" : estado === "falhou" ? "Não copiou" : "Copiar link"}
    </button>
  );
}
