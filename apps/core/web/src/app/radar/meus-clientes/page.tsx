"use client";

// AUTOSETUP — apps/core/web/src/app/radar/meus-clientes/page.tsx
// Lista pessoal de clientes do indicador — sem login, identificado só
// pelo código dele. Fonte: pedido de Carlos (06/08/2026, 10/08/2026):
// vendedor precisa gerenciar o próprio relacionamento (criar, editar,
// apagar, compartilhar) enquanto atendimento automatizado não existe.

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

interface FormularioCliente {
  nomeCliente: string;
  whatsappCliente: string;
  notas: string;
  dataFollowup: string;
}

const formularioVazio: FormularioCliente = {
  nomeCliente: "",
  whatsappCliente: "",
  notas: "",
  dataFollowup: "",
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizarWhatsapp(v: string): string {
  return v.replace(/\D/g, "");
}

function textoParaCompartilhar(c: ClienteIndicador): string {
  const linhas = [
    `Cliente: ${c.nome_cliente}`,
    c.whatsapp_cliente ? `WhatsApp: ${c.whatsapp_cliente}` : null,
    c.notas ? `Anotações: ${c.notas}` : null,
    c.data_followup ? `Follow-up: ${c.data_followup}` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

function CampoTexto({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
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
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  const [form, setForm] = useState<FormularioCliente>(formularioVazio);
  const [salvando, setSalvando] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormularioCliente>(formularioVazio);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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
    if (!form.nomeCliente.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/indicadores/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigoConfirmado,
          nomeCliente: form.nomeCliente,
          whatsappCliente: form.whatsappCliente || undefined,
          notas: form.notas || undefined,
          dataFollowup: form.dataFollowup || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao salvar.");
      } else {
        setForm(formularioVazio);
        carregar(codigoConfirmado);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(c: ClienteIndicador) {
    setEditandoId(c.id);
    setFormEdicao({
      nomeCliente: c.nome_cliente,
      whatsappCliente: c.whatsapp_cliente ?? "",
      notas: c.notas ?? "",
      dataFollowup: c.data_followup ?? "",
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setFormEdicao(formularioVazio);
  }

  async function salvarEdicao(id: number) {
    if (!formEdicao.nomeCliente.trim()) return;
    setSalvandoEdicao(true);
    setErro(null);
    try {
      const res = await fetch("/api/indicadores/clientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          codigo: codigoConfirmado,
          nomeCliente: formEdicao.nomeCliente,
          whatsappCliente: formEdicao.whatsappCliente || undefined,
          notas: formEdicao.notas || undefined,
          dataFollowup: formEdicao.dataFollowup || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao atualizar.");
      } else {
        cancelarEdicao();
        carregar(codigoConfirmado);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function apagarCliente(id: number) {
    if (!window.confirm("Apagar esse cliente? Não dá pra desfazer.")) return;
    setErro(null);
    try {
      const res = await fetch(
        `/api/indicadores/clientes?id=${id}&codigo=${encodeURIComponent(codigoConfirmado)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao apagar.");
      } else {
        setClientes((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    }
  }

  async function copiar(c: ClienteIndicador) {
    try {
      await navigator.clipboard.writeText(textoParaCompartilhar(c));
      setCopiadoId(c.id);
      setTimeout(() => setCopiadoId((atual) => (atual === c.id ? null : atual)), 2000);
    } catch {
      setErro("Não foi possível copiar — seu navegador pode não permitir.");
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
          <CampoTexto
            placeholder="Nome do negócio ou da pessoa"
            value={form.nomeCliente}
            onChange={(v) => setForm({ ...form, nomeCliente: v })}
          />
          <CampoTexto
            placeholder="WhatsApp (opcional)"
            value={form.whatsappCliente}
            onChange={(v) => setForm({ ...form, whatsappCliente: v })}
          />
          <textarea
            placeholder="Anotações — o que ele quer, detalhes da venda..."
            rows={2}
            className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
          <label className="flex flex-col gap-1 text-xs text-paper-dim">
            Data pra fazer follow-up (opcional)
            <input
              type="date"
              className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
              value={form.dataFollowup}
              onChange={(e) => setForm({ ...form, dataFollowup: e.target.value })}
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
            const emEdicao = editandoId === c.id;

            if (emEdicao) {
              return (
                <div key={c.id} className="border border-amber rounded-lg p-3 bg-panel flex flex-col gap-2">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-amber">Editando</p>
                  <CampoTexto
                    placeholder="Nome do negócio ou da pessoa"
                    value={formEdicao.nomeCliente}
                    onChange={(v) => setFormEdicao({ ...formEdicao, nomeCliente: v })}
                  />
                  <CampoTexto
                    placeholder="WhatsApp (opcional)"
                    value={formEdicao.whatsappCliente}
                    onChange={(v) => setFormEdicao({ ...formEdicao, whatsappCliente: v })}
                  />
                  <textarea
                    placeholder="Anotações"
                    rows={2}
                    className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
                    value={formEdicao.notas}
                    onChange={(e) => setFormEdicao({ ...formEdicao, notas: e.target.value })}
                  />
                  <input
                    type="date"
                    className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
                    value={formEdicao.dataFollowup}
                    onChange={(e) => setFormEdicao({ ...formEdicao, dataFollowup: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => salvarEdicao(c.id)}
                      disabled={salvandoEdicao}
                      className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2 text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="font-sans rounded-md px-4 py-2 text-sm border border-panel-line text-paper"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

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

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-panel-line">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(c)}
                    className="font-mono text-[10px] uppercase tracking-widest text-amber underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => copiar(c)}
                    className="font-mono text-[10px] uppercase tracking-widest text-paper-dim underline"
                  >
                    {copiadoId === c.id ? "Copiado!" : "Copiar"}
                  </button>
                  {c.whatsapp_cliente && (
                    <a
                      href={`https://wa.me/${normalizarWhatsapp(c.whatsapp_cliente)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] uppercase tracking-widest text-mint underline"
                    >
                      Abrir WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => apagarCliente(c.id)}
                    className="font-mono text-[10px] uppercase tracking-widest text-rust underline ml-auto"
                  >
                    Apagar
                  </button>
                </div>
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
