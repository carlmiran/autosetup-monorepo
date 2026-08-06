"use client";

// AUTOSETUP — apps/core/web/src/app/admin/comissoes/page.tsx
// Painel interno — o que pagar de comissão, pra quem. Não linkado
// publicamente. Fonte: pedido de Carlos (06/08/2026).

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

interface Comissao {
  id: number;
  criadoEm: string;
  plano: string;
  valorPlano: number;
  valorComissao: number;
  codigoIndicacao: string;
  emailCliente: string;
  status: string;
  comissaoPaga: boolean;
}

function paraCsv(linhas: Comissao[]): string {
  const cabecalho = "Data,Indicador,Plano,Valor do Plano,Comissao,Cliente,Status,Paga";
  const corpo = linhas.map((l) =>
    [
      l.criadoEm,
      l.codigoIndicacao,
      l.plano,
      l.valorPlano.toFixed(2),
      l.valorComissao.toFixed(2),
      l.emailCliente,
      l.status,
      l.comissaoPaga ? "Sim" : "Não",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [cabecalho, ...corpo].join("\n");
}

function baixarCsv(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch("/api/admin/comissoes");
        const data = (await res.json()) as { comissoes?: Comissao[]; error?: string };
        if (!res.ok) {
          setErro(data.error ?? "Erro ao carregar.");
        } else {
          setComissoes(data.comissoes ?? []);
        }
      } catch {
        setErro("Não foi possível conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function marcarPago(id: number, pago: boolean) {
    setComissoes((prev) => prev.map((c) => (c.id === id ? { ...c, comissaoPaga: pago } : c)));
    try {
      await fetch("/api/admin/comissoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pago }),
      });
    } catch {
      // best-effort — se falhar, o próximo carregar() corrige a tela
    }
  }

  const totalAberto = comissoes
    .filter((c) => !c.comissaoPaga)
    .reduce((soma, c) => soma + c.valorComissao, 0);

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">Comissões — painel interno</h1>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <p className="text-sm text-paper-dim">
            Total em aberto:{" "}
            <span className="text-amber font-semibold">
              R$ {totalAberto.toFixed(2).replace(".", ",")}
            </span>
          </p>
          <button
            type="button"
            onClick={() => baixarCsv(paraCsv(comissoes), "comissoes-autosetup.csv")}
            disabled={comissoes.length === 0}
            className="font-mono text-xs text-amber border border-amber-dim rounded-md px-3 py-2 hover:bg-panel disabled:opacity-40 transition-colors"
          >
            ⬇ Baixar CSV (planilha)
          </button>
        </div>

        {loading && <p className="text-sm text-paper-dim">Carregando...</p>}
        {erro && <p className="text-sm text-rust">{erro}</p>}

        {!loading && comissoes.length === 0 && !erro && (
          <p className="text-sm text-paper-dim">Nenhuma comissão registrada ainda.</p>
        )}

        <div className="flex flex-col gap-2">
          {comissoes.map((c) => (
            <div
              key={c.id}
              className="border border-panel-line rounded-lg p-4 bg-panel flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="text-sm">
                <p className="font-medium">
                  {c.codigoIndicacao} — {c.plano}
                </p>
                <p className="text-xs text-paper-dim mt-1">
                  Cliente: {c.emailCliente} · {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-amber text-sm">
                  R$ {c.valorComissao.toFixed(2).replace(".", ",")}
                </span>
                <label className="flex items-center gap-2 text-xs text-paper-dim">
                  <input
                    type="checkbox"
                    checked={c.comissaoPaga}
                    onChange={(e) => marcarPago(c.id, e.target.checked)}
                  />
                  Paga
                </label>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
