"use client";

// AUTOSETUP — apps/core/web/src/app/admin/connector/page.tsx
// Self-service de código de pareamento do Connector — substitui o INSERT
// manual via `wrangler d1 execute` (ver docs/traceability.md) por um
// formulário. Não linkado publicamente, mesmo padrão já usado em
// /admin/clientes — proteção real é a senha (CONNECTOR_ADMIN_SECRET)
// checada na API route, não a URL estar escondida.

import { useState } from "react";
import { Logo } from "@/components/Logo";

interface UnidadeCriada {
  unidade: string;
  propertyId: string;
  codigoPareamento: string;
}

interface RespostaCriar {
  criados?: UnidadeCriada[];
  instaladorUrl?: string;
  error?: string;
}

export default function ConnectorAdminPage() {
  const [secret, setSecret] = useState("");
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [multiplasUnidades, setMultiplasUnidades] = useState(false);
  const [unidadesTexto, setUnidadesTexto] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaCriar | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setResultado(null);

    const unidades = multiplasUnidades
      ? unidadesTexto
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0)
      : [];

    try {
      const res = await fetch("/api/admin/connector/criar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret,
          nomeNegocio,
          unidades,
          codigoIndicacao: codigoIndicacao || undefined,
        }),
      });
      const data = (await res.json()) as RespostaCriar;
      if (!res.ok) {
        setErro(data.error ?? "Erro ao criar código de pareamento.");
      } else {
        setResultado(data);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">Connector — novo código de pareamento</h1>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10 flex flex-col gap-8">
        <form onSubmit={criar} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs tracking-widest uppercase text-amber">Senha</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs tracking-widest uppercase text-amber">Nome do negócio</span>
            <input
              type="text"
              value={nomeNegocio}
              onChange={(e) => setNomeNegocio(e.target.value)}
              placeholder="ex.: Barbearia do Zé"
              required
              className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-paper-dim">
            <input
              type="checkbox"
              checked={multiplasUnidades}
              onChange={(e) => setMultiplasUnidades(e.target.checked)}
            />
            Tem mais de uma unidade (ex.: sede + anexo)
          </label>

          {multiplasUnidades && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs tracking-widest uppercase text-amber">
                Unidades (uma por linha)
              </span>
              <textarea
                value={unidadesTexto}
                onChange={(e) => setUnidadesTexto(e.target.value)}
                placeholder={"sede\nanexo"}
                rows={3}
                className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm font-mono focus-visible:outline-amber"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-xs tracking-widest uppercase text-amber">
              Código do indicador (opcional)
            </span>
            <input
              type="text"
              value={codigoIndicacao}
              onChange={(e) => setCodigoIndicacao(e.target.value)}
              placeholder="se veio de um vendedor"
              className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="font-sans font-semibold rounded-md px-6 py-3 text-sm bg-amber text-ink hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {enviando ? "Criando..." : "Criar código de pareamento"}
          </button>
        </form>

        {erro && <p className="text-sm text-rust">{erro}</p>}

        {resultado?.criados && (
          <section className="flex flex-col gap-3">
            <h2 className="font-mono text-xs tracking-widest uppercase text-amber">
              Criado{resultado.criados.length > 1 ? "s" : ""}
            </h2>
            {resultado.criados.map((c) => (
              <div key={c.codigoPareamento} className="border border-panel-line rounded-lg p-4 bg-panel text-sm flex flex-col gap-1">
                <p className="font-medium">{c.unidade}</p>
                <p className="text-paper-dim">property_id: <span className="font-mono">{c.propertyId}</span></p>
                <p className="text-paper-dim">
                  código: <span className="font-mono text-amber text-base">{c.codigoPareamento}</span>
                </p>
              </div>
            ))}
            {resultado.instaladorUrl && (
              <a
                href={resultado.instaladorUrl}
                className="font-sans font-semibold rounded-md px-6 py-3 text-sm bg-amber text-ink hover:brightness-110 transition-all text-center"
              >
                ⬇ Baixar instalador do Connector
              </a>
            )}
            <p className="text-xs text-paper-dim">
              Passe o código de pareamento certo pra cada pessoa junto com o instalador — ela digita o código na
              primeira execução do Connector, não aqui.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
