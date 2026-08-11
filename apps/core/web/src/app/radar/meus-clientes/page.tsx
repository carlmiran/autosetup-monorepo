"use client";

// AUTOSETUP — apps/core/web/src/app/radar/meus-clientes/page.tsx
// Lista pessoal de clientes do indicador — sem login, identificado só
// pelo código dele. Fonte: pedido de Carlos (06/08, 10/08, 11/08/2026):
// criar/editar/apagar/compartilhar, duas visualizações (Lista/Kanban),
// ícone de WhatsApp, e importação de planilha (scraper) em lote.

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Logo } from "@/components/Logo";
import { AvisoIndicadores } from "@/components/AvisoIndicadores";
import { EntradaComPin } from "@/components/EntradaComPin";

interface ItemParecer {
  prioridade: string;
  porQue: string;
  oQueDestrava: string;
  mensagemPronta: string;
}

interface EstadoParecer {
  itens: ItemParecer[];
  indice: number;
}

interface ClienteIndicador {
  id: number;
  nome_cliente: string;
  whatsapp_cliente: string | null;
  notas: string | null;
  data_followup: string | null;
  criado_em: string;
  fez_diagnostico?: boolean;
  data_diagnostico?: string | null;
}

interface FormularioCliente {
  nomeCliente: string;
  whatsappCliente: string;
  notas: string;
  dataFollowup: string;
}

type StatusFollowup = "atrasado" | "hoje" | "agendado" | "semData";

const formularioVazio: FormularioCliente = {
  nomeCliente: "",
  whatsappCliente: "",
  notas: "",
  dataFollowup: "",
};

const COLUNAS: { status: StatusFollowup; titulo: string; cor: string }[] = [
  { status: "atrasado", titulo: "Atrasado", cor: "text-rust border-rust" },
  { status: "hoje", titulo: "Hoje", cor: "text-amber border-amber" },
  { status: "agendado", titulo: "Agendado", cor: "text-mint border-mint" },
  { status: "semData", titulo: "Sem data", cor: "text-paper-dim border-panel-line" },
];

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusDe(c: ClienteIndicador, dataHoje: string): StatusFollowup {
  if (!c.data_followup) return "semData";
  if (c.data_followup < dataHoje) return "atrasado";
  if (c.data_followup === dataHoje) return "hoje";
  return "agendado";
}

function normalizarWhatsapp(v: string): string {
  return v.replace(/\D/g, "");
}

/** Tenta achar a coluna certa pelo nome do cabeçalho da planilha —
 * scraper de terceiro nunca usa nome padronizado, então isso é
 * heurística, não certeza. Sempre mostrado pro usuário conferir antes
 * de importar de verdade. */
function detectarColuna(colunas: string[], padroes: RegExp): string {
  return colunas.find((c) => padroes.test(c)) ?? "";
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
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function IconeWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.86.507 3.601 1.387 5.09L2 22l5.03-1.354A9.938 9.938 0 0 0 12 22c5.523 0 10-4.477 10-10S17.524 2 12.001 2zm0 18.09a8.06 8.06 0 0 1-4.11-1.126l-.294-.176-3.06.824.822-3.007-.192-.31A8.088 8.088 0 0 1 3.91 12c0-4.465 3.626-8.09 8.091-8.09 4.465 0 8.09 3.625 8.09 8.09 0 4.465-3.625 8.09-8.09 8.09z" />
    </svg>
  );
}

interface CardClienteProps {
  cliente: ClienteIndicador;
  dataHoje: string;
  emEdicao: boolean;
  formEdicao: FormularioCliente;
  salvandoEdicao: boolean;
  copiado: boolean;
  compacto?: boolean;
  gerandoParecer: boolean;
  parecer: EstadoParecer | null;
  erroParecer: string | null;
  onIniciarEdicao: () => void;
  onMudarFormEdicao: (f: FormularioCliente) => void;
  onSalvarEdicao: () => void;
  onCancelarEdicao: () => void;
  onCopiar: () => void;
  onApagar: () => void;
  onGerarParecer: () => void;
  onAvancarParecer: () => void;
}

function CardCliente({
  cliente: c,
  dataHoje,
  emEdicao,
  formEdicao,
  salvandoEdicao,
  copiado,
  compacto,
  gerandoParecer,
  parecer,
  erroParecer,
  onIniciarEdicao,
  onMudarFormEdicao,
  onSalvarEdicao,
  onCancelarEdicao,
  onCopiar,
  onApagar,
  onGerarParecer,
  onAvancarParecer,
}: CardClienteProps) {
  const atrasado = c.data_followup && c.data_followup < dataHoje;
  const hojeMarcado = c.data_followup === dataHoje;

  if (emEdicao) {
    return (
      <div className="border border-amber rounded-lg p-3 bg-panel flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-widest uppercase text-amber">Editando</p>
        <CampoTexto
          placeholder="Nome do negócio ou da pessoa"
          value={formEdicao.nomeCliente}
          onChange={(v) => onMudarFormEdicao({ ...formEdicao, nomeCliente: v })}
        />
        <CampoTexto
          placeholder="WhatsApp (opcional)"
          value={formEdicao.whatsappCliente}
          onChange={(v) => onMudarFormEdicao({ ...formEdicao, whatsappCliente: v })}
        />
        <textarea
          placeholder="Anotações"
          rows={2}
          className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
          value={formEdicao.notas}
          onChange={(e) => onMudarFormEdicao({ ...formEdicao, notas: e.target.value })}
        />
        <input
          type="date"
          className="border border-panel-line bg-ink text-paper rounded-md px-3 py-2 text-sm focus-visible:outline-amber"
          value={formEdicao.dataFollowup}
          onChange={(e) => onMudarFormEdicao({ ...formEdicao, dataFollowup: e.target.value })}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSalvarEdicao}
            disabled={salvandoEdicao}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2 text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {salvandoEdicao ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={onCancelarEdicao}
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
      className={`border rounded-lg p-3 bg-panel ${
        atrasado ? "border-rust" : hojeMarcado ? "border-amber" : "border-panel-line"
      } ${compacto ? "w-64 shrink-0" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{c.nome_cliente}</p>
        {c.data_followup && !compacto && (
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              atrasado ? "text-rust" : hojeMarcado ? "text-amber" : "text-paper-dim"
            }`}
          >
            {atrasado ? "Atrasado" : hojeMarcado ? "Hoje" : c.data_followup}
          </span>
        )}
      </div>
      {c.whatsapp_cliente && <p className="text-xs text-paper-dim mt-1">{c.whatsapp_cliente}</p>}
      {c.fez_diagnostico && (
        <p className="text-xs text-mint mt-1">
          ✓ Fez o diagnóstico{c.data_diagnostico ? ` em ${new Date(c.data_diagnostico).toLocaleDateString("pt-BR")}` : ""}
        </p>
      )}
      {c.notas && <p className="text-sm mt-2">{c.notas}</p>}

      {c.fez_diagnostico && !compacto && (
        <div className="mt-3 pt-3 border-t border-panel-line">
          {!parecer && (
            <button
              type="button"
              onClick={onGerarParecer}
              disabled={gerandoParecer}
              className="font-mono text-[10px] uppercase tracking-widest text-amber border border-amber-dim rounded-md px-2 py-1.5 disabled:opacity-40"
            >
              {gerandoParecer ? "Analisando..." : "✨ Gerar parecer de prioridade"}
            </button>
          )}
          {erroParecer && <p className="text-xs text-rust mt-2">{erroParecer}</p>}
          {parecer && parecer.indice < parecer.itens.length && (
            <div className="bg-ink border border-amber-dim rounded-lg p-3 flex flex-col gap-2">
              <p className="font-mono text-[10px] tracking-widest uppercase text-amber">
                Passo {parecer.indice + 1} de {parecer.itens.length} — {parecer.itens[parecer.indice].prioridade}
              </p>
              <p className="text-xs text-paper-dim">{parecer.itens[parecer.indice].porQue}</p>
              <p className="text-xs text-mint">
                Ao resolver: {parecer.itens[parecer.indice].oQueDestrava}
              </p>
              <p className="text-sm italic border-t border-panel-line pt-2">
                {parecer.itens[parecer.indice].mensagemPronta}
              </p>
              <button
                type="button"
                onClick={onAvancarParecer}
                disabled={gerandoParecer}
                className="font-mono text-[10px] uppercase tracking-widest text-amber underline self-start disabled:opacity-40"
              >
                ✓ Marcar resolvido e ver próximo passo
              </button>
            </div>
          )}
          {parecer && parecer.indice >= parecer.itens.length && (
            <p className="text-xs text-mint">✓ Todos os passos identificados foram resolvidos.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-panel-line flex-wrap">
        <button
          type="button"
          onClick={onIniciarEdicao}
          className="font-mono text-[10px] uppercase tracking-widest text-amber underline"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onCopiar}
          className="font-mono text-[10px] uppercase tracking-widest text-paper-dim underline"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
        {c.whatsapp_cliente && (
          <a
            href={`https://wa.me/${normalizarWhatsapp(c.whatsapp_cliente)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir conversa no WhatsApp"
            title="Abrir conversa no WhatsApp"
            className="text-mint hover:brightness-125 transition-all"
          >
            <IconeWhatsApp />
          </a>
        )}
        <button
          type="button"
          onClick={onApagar}
          className="font-mono text-[10px] uppercase tracking-widest text-rust underline ml-auto"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

export default function MeusClientesPage() {
  const [codigoInicial] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("codigo") ?? "",
  );
  const [codigoConfirmado, setCodigoConfirmado] = useState("");
  const [clientes, setClientes] = useState<ClienteIndicador[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<number | null>(null);
  const [gerandoParecerId, setGerandoParecerId] = useState<number | null>(null);
  const [pareceres, setPareceres] = useState<Record<number, EstadoParecer>>({});
  const [errosParecer, setErrosParecer] = useState<Record<number, string>>({});
  const [visualizacao, setVisualizacao] = useState<"lista" | "kanban">("lista");

  const [form, setForm] = useState<FormularioCliente>(formularioVazio);
  const [salvando, setSalvando] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormularioCliente>(formularioVazio);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [mostrarImportacao, setMostrarImportacao] = useState(false);
  const [linhasCsv, setLinhasCsv] = useState<Record<string, string>[]>([]);
  const [colunasCsv, setColunasCsv] = useState<string[]>([]);
  const [colNome, setColNome] = useState("");
  const [colWhatsapp, setColWhatsapp] = useState("");
  const [colNotas, setColNotas] = useState("");
  const [importando, setImportando] = useState(false);
  const [progressoImportacao, setProgressoImportacao] = useState<{ feito: number; total: number; falhas: number } | null>(null);

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

  function lerArquivoCsv(arquivo: File) {
    setErro(null);
    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: (resultado) => {
        const colunas = resultado.meta.fields ?? [];
        if (colunas.length === 0 || resultado.data.length === 0) {
          setErro("Não consegui ler nenhuma linha dessa planilha.");
          return;
        }
        setColunasCsv(colunas);
        setLinhasCsv(resultado.data);
        setColNome(detectarColuna(colunas, /nome|negocio|negócio|empresa|company|name/i) || colunas[0]);
        setColWhatsapp(detectarColuna(colunas, /whats|celular|telefone|phone|fone/i));
        setColNotas(detectarColuna(colunas, /nota|obs|coment|categ|nicho|endere/i));
        setProgressoImportacao(null);
      },
      error: () => {
        setErro("Não consegui ler esse arquivo — confirma que é um CSV real.");
      },
    });
  }

  async function importarPlanilha() {
    if (!colNome || linhasCsv.length === 0) return;
    setImportando(true);
    setErro(null);
    let feito = 0;
    let falhas = 0;

    for (const linha of linhasCsv) {
      const nome = linha[colNome]?.trim();
      if (!nome) {
        falhas++;
        setProgressoImportacao({ feito, total: linhasCsv.length, falhas });
        continue;
      }
      try {
        const res = await fetch("/api/indicadores/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: codigoConfirmado,
            nomeCliente: nome,
            whatsappCliente: colWhatsapp ? linha[colWhatsapp]?.trim() || undefined : undefined,
            notas: colNotas ? linha[colNotas]?.trim() || undefined : undefined,
          }),
        });
        if (res.ok) {
          feito++;
        } else {
          falhas++;
        }
      } catch {
        falhas++;
      }
      setProgressoImportacao({ feito, total: linhasCsv.length, falhas });
    }

    setImportando(false);
    setLinhasCsv([]);
    setColunasCsv([]);
    carregar(codigoConfirmado);
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

  async function gerarParecer(clienteId: number) {
    setGerandoParecerId(clienteId);
    setErrosParecer((prev) => ({ ...prev, [clienteId]: "" }));
    try {
      const res = await fetch("/api/indicadores/parecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoConfirmado, clienteId }),
      });
      const data = (await res.json()) as EstadoParecer & { error?: string };
      if (!res.ok) {
        setErrosParecer((prev) => ({ ...prev, [clienteId]: data.error ?? "Erro ao gerar parecer." }));
      } else {
        setPareceres((prev) => ({ ...prev, [clienteId]: data }));
      }
    } catch {
      setErrosParecer((prev) => ({ ...prev, [clienteId]: "Não foi possível conectar ao servidor." }));
    } finally {
      setGerandoParecerId(null);
    }
  }

  async function avancarParecer(clienteId: number) {
    if (!window.confirm("Confirma que essa prioridade foi resolvida de verdade? Isso libera o próximo passo.")) return;
    setGerandoParecerId(clienteId);
    try {
      const res = await fetch("/api/indicadores/parecer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoConfirmado, clienteId }),
      });
      const data = (await res.json()) as EstadoParecer & { error?: string };
      if (!res.ok) {
        setErrosParecer((prev) => ({ ...prev, [clienteId]: data.error ?? "Erro ao avançar." }));
      } else {
        setPareceres((prev) => ({ ...prev, [clienteId]: data }));
      }
    } catch {
      setErrosParecer((prev) => ({ ...prev, [clienteId]: "Não foi possível conectar ao servidor." }));
    } finally {
      setGerandoParecerId(null);
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
      <EntradaComPin
        titulo="Meus Clientes"
        descricao="Digite seu código de indicador e um PIN de 4 números pra ver (ou começar) sua lista."
        codigoInicial={codigoInicial}
        onEntrar={(c) => setCodigoConfirmado(c)}
      />
    );
  }

  const dataHoje = hoje();

  function propsCard(c: ClienteIndicador, compacto = false): CardClienteProps {
    return {
      cliente: c,
      dataHoje,
      emEdicao: editandoId === c.id,
      formEdicao,
      salvandoEdicao,
      copiado: copiadoId === c.id,
      compacto,
      gerandoParecer: gerandoParecerId === c.id,
      parecer: pareceres[c.id] ?? null,
      erroParecer: errosParecer[c.id] || null,
      onIniciarEdicao: () => iniciarEdicao(c),
      onMudarFormEdicao: setFormEdicao,
      onSalvarEdicao: () => salvarEdicao(c.id),
      onCancelarEdicao: cancelarEdicao,
      onCopiar: () => copiar(c),
      onApagar: () => apagarCliente(c.id),
      onGerarParecer: () => gerarParecer(c.id),
      onAvancarParecer: () => avancarParecer(c.id),
    };
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Meus Clientes</h1>
          <p className="text-xs text-paper-dim mt-1">Código: {codigoConfirmado}</p>
        </div>
        <div className="flex border border-panel-line rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setVisualizacao("lista")}
            className={`font-mono text-xs px-4 py-1.5 uppercase tracking-widest ${
              visualizacao === "lista" ? "bg-amber text-ink" : "text-paper-dim"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao("kanban")}
            className={`font-mono text-xs px-4 py-1.5 uppercase tracking-widest ${
              visualizacao === "kanban" ? "bg-amber text-ink" : "text-paper-dim"
            }`}
          >
            Kanban
          </button>
        </div>
      </header>
      <AvisoIndicadores />

      <main className={visualizacao === "lista" ? "mx-auto max-w-xl px-6 py-10 flex flex-col gap-8" : "px-4 py-10 flex flex-col gap-8"}>
        <div className={visualizacao === "lista" ? "" : "mx-auto max-w-xl w-full"}>
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

          <div className="border border-panel-line rounded-lg p-4 bg-panel flex flex-col gap-3 mt-4">
            <button
              type="button"
              onClick={() => setMostrarImportacao((v) => !v)}
              className="font-mono text-xs tracking-widest uppercase text-amber text-left"
            >
              {mostrarImportacao ? "▾" : "▸"} Importar planilha (CSV)
            </button>

            {mostrarImportacao && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-paper-dim">
                  Sobe um CSV (de scraper ou qualquer planilha exportada). A
                  gente tenta adivinhar as colunas certas — confere antes de
                  importar.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) lerArquivoCsv(arquivo);
                  }}
                  className="text-sm text-paper-dim file:mr-3 file:font-sans file:font-semibold file:bg-amber file:text-ink file:rounded-md file:px-3 file:py-2 file:border-0 file:text-sm"
                />

                {colunasCsv.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <label className="flex flex-col gap-1">
                        Coluna do nome (obrigatório)
                        <select
                          className="border border-panel-line bg-ink text-paper rounded-md px-2 py-1.5"
                          value={colNome}
                          onChange={(e) => setColNome(e.target.value)}
                        >
                          {colunasCsv.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        Coluna do WhatsApp (opcional)
                        <select
                          className="border border-panel-line bg-ink text-paper rounded-md px-2 py-1.5"
                          value={colWhatsapp}
                          onChange={(e) => setColWhatsapp(e.target.value)}
                        >
                          <option value="">— nenhuma —</option>
                          {colunasCsv.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        Coluna das anotações (opcional)
                        <select
                          className="border border-panel-line bg-ink text-paper rounded-md px-2 py-1.5"
                          value={colNotas}
                          onChange={(e) => setColNotas(e.target.value)}
                        >
                          <option value="">— nenhuma —</option>
                          {colunasCsv.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="border border-panel-line rounded-md p-2 text-xs text-paper-dim overflow-x-auto">
                      <p className="font-mono uppercase tracking-widest text-amber mb-1">
                        Prévia ({linhasCsv.length} linhas encontradas)
                      </p>
                      {linhasCsv.slice(0, 3).map((linha, i) => (
                        <p key={i} className="truncate">
                          {linha[colNome] || "(sem nome)"}
                          {colWhatsapp && linha[colWhatsapp] ? ` · ${linha[colWhatsapp]}` : ""}
                        </p>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={importarPlanilha}
                      disabled={importando}
                      className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2.5 text-sm hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {importando
                        ? `Importando... ${progressoImportacao?.feito ?? 0}/${linhasCsv.length}`
                        : `Importar ${linhasCsv.length} contatos`}
                    </button>
                  </>
                )}

                {progressoImportacao && !importando && (
                  <p className="text-xs text-mint">
                    Importação concluída: {progressoImportacao.feito} adicionados
                    {progressoImportacao.falhas > 0 && `, ${progressoImportacao.falhas} falharam`}.
                  </p>
                )}
              </div>
            )}
          </div>

          {erro && <p className="text-sm text-rust mt-4">{erro}</p>}
          {loading && <p className="text-sm text-paper-dim mt-4">Carregando...</p>}
        </div>

        {visualizacao === "lista" ? (
          <div className="flex flex-col gap-2">
            {clientes.map((c) => (
              <CardCliente key={c.id} {...propsCard(c)} />
            ))}
            {!loading && clientes.length === 0 && (
              <p className="text-sm text-paper-dim">Nenhum cliente cadastrado ainda.</p>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUNAS.map((coluna) => {
              const clientesDaColuna = clientes.filter((c) => statusDe(c, dataHoje) === coluna.status);
              return (
                <div key={coluna.status} className="flex flex-col gap-3 shrink-0 w-64">
                  <p className={`font-mono text-xs tracking-widest uppercase pb-2 border-b-2 ${coluna.cor}`}>
                    {coluna.titulo} ({clientesDaColuna.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {clientesDaColuna.map((c) => (
                      <CardCliente key={c.id} {...propsCard(c, true)} />
                    ))}
                    {clientesDaColuna.length === 0 && (
                      <p className="text-xs text-paper-dim">Nada aqui.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
