"use client";

// AUTOSETUP — apps/core/web/src/app/admin/clientes/page.tsx
// Painel interno — leads (diagnósticos) e pagamentos, pra pós-venda/
// follow-up. Não linkado publicamente. Fonte: pedido de Carlos
// (06/08/2026). Duas listas separadas — ver nota real em
// api/admin/clientes/route.ts sobre por que não há cruzamento
// automático entre elas ainda.

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

interface Lead {
  id: number;
  criado_em: string;
  nome_contato: string | null;
  whatsapp_contato: string | null;
  nome_negocio: string;
  cidade: string;
  nicho: string;
  interesse_final: string | null;
  codigo_indicacao: string | null;
}

interface Pagamento {
  id: number;
  criado_em: string;
  plano: string;
  nome: string | null;
  email: string;
  status: string;
  codigo_indicacao: string | null;
}

function baixarCsv(cabecalho: string, linhas: string[][], nomeArquivo: string) {
  const corpo = linhas.map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  const conteudo = [cabecalho, ...corpo].join("\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ClientesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/clientes");
        const data = (await res.json()) as { leads?: Lead[]; pagamentos?: Pagamento[]; error?: string };
        if (!res.ok) {
          setErro(data.error ?? "Erro ao carregar.");
        } else {
          setLeads(data.leads ?? []);
          setPagamentos(data.pagamentos ?? []);
        }
      } catch {
        setErro("Não foi possível conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">Clientes — painel interno</h1>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 flex flex-col gap-10">
        {loading && <p className="text-sm text-paper-dim">Carregando...</p>}
        {erro && <p className="text-sm text-rust">{erro}</p>}

        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-mono text-xs tracking-widest uppercase text-amber">
              Diagnósticos ({leads.length})
            </h2>
            <button
              type="button"
              onClick={() =>
                baixarCsv(
                  "Data,Nome,WhatsApp,Negócio,Cidade,Nicho,Interesse,Indicador",
                  leads.map((l) => [
                    l.criado_em,
                    l.nome_contato ?? "",
                    l.whatsapp_contato ?? "",
                    l.nome_negocio,
                    l.cidade,
                    l.nicho,
                    l.interesse_final ?? "",
                    l.codigo_indicacao ?? "",
                  ]),
                  "diagnosticos-autosetup.csv",
                )
              }
              disabled={leads.length === 0}
              className="font-mono text-xs text-amber border border-amber-dim rounded-md px-3 py-2 hover:bg-panel disabled:opacity-40 transition-colors"
            >
              ⬇ Baixar CSV
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {leads.map((l) => (
              <div key={l.id} className="border border-panel-line rounded-lg p-3 bg-panel text-sm">
                <p className="font-medium">
                  {l.nome_negocio} <span className="text-paper-dim">— {l.nicho}, {l.cidade}</span>
                </p>
                <p className="text-xs text-paper-dim mt-1">
                  {l.nome_contato ?? "sem nome"} · {l.whatsapp_contato ?? "sem WhatsApp"} ·{" "}
                  {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                  {l.interesse_final && ` · Interesse: ${l.interesse_final}`}
                  {l.codigo_indicacao && ` · Indicado por: ${l.codigo_indicacao}`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-mono text-xs tracking-widest uppercase text-amber">
              Pagamentos ({pagamentos.length})
            </h2>
            <button
              type="button"
              onClick={() =>
                baixarCsv(
                  "Data,Plano,Nome,Email,Status,Indicador",
                  pagamentos.map((p) => [
                    p.criado_em,
                    p.plano,
                    p.nome ?? "",
                    p.email,
                    p.status,
                    p.codigo_indicacao ?? "",
                  ]),
                  "pagamentos-autosetup.csv",
                )
              }
              disabled={pagamentos.length === 0}
              className="font-mono text-xs text-amber border border-amber-dim rounded-md px-3 py-2 hover:bg-panel disabled:opacity-40 transition-colors"
            >
              ⬇ Baixar CSV
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {pagamentos.map((p) => (
              <div key={p.id} className="border border-panel-line rounded-lg p-3 bg-panel text-sm">
                <p className="font-medium">
                  {p.plano} <span className="text-paper-dim">— {p.status}</span>
                </p>
                <p className="text-xs text-paper-dim mt-1">
                  {p.nome ?? "sem nome"} · {p.email} ·{" "}
                  {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                  {p.codigo_indicacao && ` · Indicado por: ${p.codigo_indicacao}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
