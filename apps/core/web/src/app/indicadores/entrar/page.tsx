"use client";

// 24/10/2026 (Pacote 1): o indicador entra com código + PIN antes de
// conectar o Mercado Pago. O servidor confere o PIN e devolve a URL de
// autorização com `state` assinado (api/indicadores/conectar). Antes bastava
// digitar qualquer código — inclusive o de outra pessoa.

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { EntradaComPin } from "@/components/EntradaComPin";
import { cabecalhosIndicador } from "@/lib/indicadorCliente";

export default function EntrarComoIndicadorPage() {
  const [acesso, setAcesso] = useState<{ codigo: string; pin: string } | null>(null);
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function conectar() {
    if (!acesso) return;
    setConectando(true);
    setErro(null);
    try {
      const res = await fetch("/api/indicadores/conectar", {
        method: "POST",
        headers: cabecalhosIndicador(acesso.pin, { "Content-Type": "application/json" }),
        body: JSON.stringify({ codigo: acesso.codigo }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErro(data.error ?? "Não foi possível iniciar a conexão com o Mercado Pago.");
        setConectando(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErro("Não foi possível conectar ao servidor.");
      setConectando(false);
    }
  }

  if (!acesso) {
    return (
      <EntradaComPin
        titulo="Seja um indicador AutoSetup"
        descricao="Escolha seu código (ex: seunome) e um PIN de 4 números. Depois você conecta sua conta do Mercado Pago."
        onEntrar={(codigo, pin) => setAcesso({ codigo, pin })}
      />
    );
  }

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
        <p className="font-mono text-xs text-paper-dim mt-3">Código: {acesso.codigo}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {erro && <p className="text-xs text-rust">{erro}</p>}
        <button
          type="button"
          onClick={conectar}
          disabled={conectando}
          className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-3 text-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {conectando ? "Abrindo o Mercado Pago..." : "Conectar minha conta Mercado Pago"}
        </button>
      </div>
    </main>
  );
}
