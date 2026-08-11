"use client";

// AUTOSETUP — src/components/EntradaComPin.tsx
// Entrada compartilhada de código+PIN pro indicador — usada em
// /radar/meus-clientes e /radar/meu-desempenho. Primeira vez que um
// código é digitado, reivindica com um PIN de 4 dígitos; da próxima
// vez, precisa do mesmo PIN. Evita colisão de código entre pessoas
// diferentes usando o mesmo texto por coincidência.

import { useState } from "react";

export function EntradaComPin({
  titulo,
  descricao,
  onEntrar,
  codigoInicial,
}: {
  titulo: string;
  descricao: string;
  onEntrar: (codigo: string) => void;
  codigoInicial?: string;
}) {
  const [codigo, setCodigo] = useState(codigoInicial ?? "");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!codigo.trim() || !/^\d{4}$/.test(pin)) {
      setErro("Preencha o código e um PIN de 4 números.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/indicadores/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim(), pin }),
      });
      const data = (await res.json()) as { ok?: boolean; novo?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível validar.");
      } else {
        onEntrar(codigo.trim());
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="font-display text-xl text-paper">{titulo}</h1>
        <p className="text-sm text-paper-dim mt-2 max-w-sm">{descricao}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="text"
          placeholder="Seu código"
          className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <input
          type="tel"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN de 4 números"
          className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <p className="text-xs text-paper-dim">
          Primeira vez usando esse código? O PIN que você digitar agora
          fica salvo — use o mesmo da próxima vez.
        </p>
        {erro && <p className="text-xs text-rust">{erro}</p>}
        <button
          type="button"
          onClick={entrar}
          disabled={loading}
          className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-3 text-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}
