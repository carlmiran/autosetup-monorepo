"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function EntrarComoIndicadorPage() {
  const [codigo, setCodigo] = useState("");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={32} />
      <div>
        <h1 className="font-display text-xl text-paper">Seja um indicador AutoSetup</h1>
        <p className="text-sm text-paper-dim mt-2 max-w-md">
          Conecte sua conta do Mercado Pago uma vez, e ganhe comissão
          automática em toda venda que você trouxer — o pagamento cai
          direto na sua conta, sem repasse manual.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          placeholder="Escolha seu código (ex: seunome)"
          className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\s+/g, "").toLowerCase())}
        />
        <a
          href={codigo ? `/api/indicadores/conectar?codigo=${encodeURIComponent(codigo)}` : undefined}
          aria-disabled={!codigo}
          className={`font-sans font-semibold rounded-md px-6 py-3 text-sm transition-all ${
            codigo ? "bg-amber text-ink hover:brightness-110" : "bg-panel text-paper-dim pointer-events-none"
          }`}
        >
          Conectar minha conta Mercado Pago
        </a>
      </div>
    </main>
  );
}
