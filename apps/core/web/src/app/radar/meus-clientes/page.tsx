"use client";

// AUTOSETUP — apps/core/web/src/app/radar/meus-clientes/page.tsx
// Lista pessoal de clientes do indicador — sem login, identificado só
// pelo código dele. Fonte: pedido de Carlos (06/08/2026): vendedor
// precisa gerenciar o próprio relacionamento enquanto atendimento
// automatizado não existe.

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

interface ClienteIndicador {
  id: number;
  nome_cliente: string;
  whatsapp_cliente: string | null;
  notas: string | null;
  data_followup: string | null;
  criado_em: string;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MeusClientesPage() {
  const [codigo, setCodigo] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("codigo") ?? "",
  );
  const [codigoConfirmado, setCodigoConfirmado] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("codigo") ?? "",
  );
  const [clientes, setClientes] = useState<ClienteIndicador[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nomeCliente, setNomeCliente] = useState("");
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [dataFollowup, setDataFollowup] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar(codigoBusca: string) {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/indicadores/clientes?codigo=${encodeURIComponent(codigoBusca)}`);
      const data = (await res.json()) as { clientes?: ClienteIndicador[]; error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao carregar.");
      } else {
        setClientes(data.clientes ?? []);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  function entrar() {
    if (!codigo.trim()) return;
    setCodigoConfirmado(codigo.trim());
  }

  async function adicionarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeCliente.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/indicadores/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigoConfirmado,
          nomeCliente,
          whatsappCliente: whatsappCliente || undefined,
          notas: notas || undefined,
          dataFollowup: dataFollowup || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao salvar.");
      } else {
        setNomeCliente("");
        setWhatsappCliente("");
        setNotas("");
        setDataFollowup("");
        carregar(codigoConfirmado);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    if (!codigoConfirmado) return;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch(`/api/indicadores/clientes?codigo=${encodeURIComponent(codigoConfirmado)}`);
        const data = (await res.json()) as { clientes?: ClienteIndicador[]; error?: string };
        if (!res.ok) {
          setErro(data.error ?? "Erro ao carregar.");
        } else {
          setClientes(data.clientes ?? []);
        }
      } catch {
        setErro("Não foi possível conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, [codigoConfirmado]);

  if (!codigoConfirmado) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo size={32} />
        <div>
          <h1 className="font-display text-xl text-paper">Meus Clientes</h1>
          <p className="text-sm text-paper-dim mt-2 max-w-sm">
            Digite seu código de indicador pra ver (ou começar) sua lista.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <input
            type="text"
            placeholder="Seu código"
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <button
            type="button"
            onClick={entrar}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-3 text-sm hover:brightness-110 transition-all"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  const dataHoje = hoje();

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Meus Clientes</h1>
          <p className="text-xs text-paper-dim mt-1">Código: {codigoConfirmado}</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10 flex flex-col gap-8">
        <form onSubmit={adicionarCliente} className="border border-panel-line rounded-lg p-4 bg-panel flex flex-col gap-3">
          <p className="font-mono text-xs tracking-widest uppercase text-amber">Adicionar cliente</p>
          <input
            type="text"
            placeholder="Nome do negócio ou da pessoa"
            className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
          />
          <input
            type="text"
            placeholder="WhatsApp (opcional)"
            className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
            value={whatsappCliente}
            onChange={(e) => setWhatsappCliente(e.target.value)}
          />
          <textarea
            placeholder="Anotações — o que ele quer, detalhes da venda..."
            rows={2}
            className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          <label className="flex flex-col gap-1 text-xs text-paper-dim">
            Data pra fazer follow-up (opcional)
            <input
              type="date"
              className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
              value={dataFollowup}
              onChange={(e) => setDataFollowup(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={salvando}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2.5 text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar cliente"}
          </button>
        </form>

        {erro && <p className="text-sm text-rust">{erro}</p>}
        {loading && <p className="text-sm text-paper-dim">Carregando...</p>}

        <div className="flex flex-col gap-2">
          {clientes.map((c) => {
            const atrasado = c.data_followup && c.data_followup < dataHoje;
            const hojeMarcado = c.data_followup === dataHoje;
            return (
              <div
                key={c.id}
                className={`border rounded-lg p-3 bg-panel ${
                  atrasado ? "border-rust" : hojeMarcado ? "border-amber" : "border-panel-line"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.nome_cliente}</p>
                  {c.data_followup && (
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest ${
                        atrasado ? "text-rust" : hojeMarcado ? "text-amber" : "text-paper-dim"
                      }`}
                    >
                      {atrasado ? "Atrasado" : hojeMarcado ? "Hoje" : c.data_followup}
                    </span>
                  )}
                </div>
                {c.whatsapp_cliente && (
                  <p className="text-xs text-paper-dim mt-1">{c.whatsapp_cliente}</p>
                )}
                {c.notas && <p className="text-sm mt-2">{c.notas}</p>}
              </div>
            );
          })}
          {!loading && clientes.length === 0 && (
            <p className="text-sm text-paper-dim">Nenhum cliente cadastrado ainda.</p>
          )}
        </div>
      </main>
    </>
  );
}
