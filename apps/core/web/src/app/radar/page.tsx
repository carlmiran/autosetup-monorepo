"use client";

// AUTOSETUP — apps/core/web/src/app/radar/page.tsx
// Ferramenta interna de prospecção: usa a localização do navegador
// (estilo "pedir um Uber") pra listar negócios reais próximos via
// Google Places, e gera uma análise comercial real de qualquer um deles
// como prospect. Fonte: pedido de Carlos (30/07/2026).

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AvisoIndicadores } from "@/components/AvisoIndicadores";

interface NegocioProximo {
  id: string;
  nome: string;
  endereco?: string;
  avaliacoes?: number;
  nota?: number;
  categoria?: string;
  statusHorario?: string;
}

interface AnaliseRadar {
  resumo: string;
  presencaDigital: string[];
  oportunidades: string[];
  abordagemSugerida: string;
}

export default function RadarPage() {
  const [status, setStatus] = useState<"parado" | "localizando" | "buscando" | "pronto">("parado");
  const [negocios, setNegocios] = useState<NegocioProximo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState("");
  const [codigo, setCodigo] = useState("");

  const [selecionado, setSelecionado] = useState<NegocioProximo | null>(null);
  const [analise, setAnalise] = useState<AnaliseRadar | null>(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);

  function buscarProximos() {
    setErro(null);
    setStatus("localizando");
    setNegocios([]);
    setSelecionado(null);
    setAnalise(null);

    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta localização.");
      setStatus("parado");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        setStatus("buscando");
        try {
          const res = await fetch("/api/radar/proximos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: posicao.coords.latitude,
              longitude: posicao.coords.longitude,
              tipo: tipo.trim() || undefined,
              codigo: codigo.trim() || undefined,
            }),
          });
          const data = (await res.json()) as { negocios?: NegocioProximo[]; error?: string };
          if (!res.ok) {
            setErro(data.error ?? "Não foi possível buscar negócios próximos.");
            setStatus("parado");
          } else {
            setNegocios(data.negocios ?? []);
            setStatus("pronto");
          }
        } catch {
          setErro("Não foi possível conectar ao servidor.");
          setStatus("parado");
        }
      },
      () => {
        setErro("Não conseguimos acessar sua localização — verifique a permissão do navegador.");
        setStatus("parado");
      },
    );
  }

  async function analisar(negocio: NegocioProximo) {
    setSelecionado(negocio);
    setAnalise(null);
    setErroAnalise(null);
    setLoadingAnalise(true);
    try {
      const res = await fetch("/api/radar/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(negocio),
      });
      const data = (await res.json()) as AnaliseRadar & { error?: string };
      if (!res.ok) {
        setErroAnalise(data.error ?? "Não foi possível gerar a análise.");
      } else {
        setAnalise(data);
      }
    } catch {
      setErroAnalise("Não foi possível conectar ao servidor.");
    } finally {
      setLoadingAnalise(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Radar de Oportunidades</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Negócios reais perto de você — clique num pra ver a análise
            comercial como possível cliente.
          </p>
          <Link href="/radar/manual" className="text-xs underline text-amber">
            Primeira vez? Leia o manual do indicador
          </Link>
          <Link href="/radar/meus-clientes" className="text-xs underline text-amber">
            Meus clientes e follow-ups
          </Link>
          <Link href="/radar/meu-desempenho" className="text-xs underline text-amber">
            Meu desempenho e comissão
          </Link>
        </div>
      </header>
      <AvisoIndicadores />

      <main className="mx-auto max-w-xl px-6 py-10">
        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            placeholder="Seu código de indicador (opcional — evita repetir negócio já visto)"
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <input
            type="text"
            placeholder='Tipo de negócio (opcional, ex: "barbershop", "beauty_salon")'
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
          <button
            type="button"
            onClick={buscarProximos}
            disabled={status === "localizando" || status === "buscando"}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-4 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {status === "localizando"
              ? "Localizando você..."
              : status === "buscando"
                ? "Buscando negócios..."
                : "📍 Ver negócios perto de mim"}
          </button>
        </div>

        {erro && <p className="text-sm text-rust mb-4">{erro}</p>}

        {negocios.length > 0 && (
          <div className="flex flex-col gap-2 mb-8">
            {negocios.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => analisar(n)}
                className={`text-left border rounded-lg p-3 transition-colors ${
                  selecionado?.id === n.id
                    ? "border-amber bg-panel"
                    : "border-panel-line bg-panel hover:border-amber-dim"
                }`}
              >
                <p className="text-sm font-medium">{n.nome}</p>
                <p className="text-xs text-paper-dim mt-1">
                  {n.categoria && <span>{n.categoria} · </span>}
                  {n.endereco}
                </p>
                {n.avaliacoes !== undefined && (
                  <p className="text-xs text-paper-dim mt-1">
                    ⭐ {n.nota ?? "—"} ({n.avaliacoes} avaliações)
                  </p>
                )}
                {n.statusHorario && (
                  <p
                    className={`text-xs mt-1 font-mono ${
                      n.statusHorario === "Aberto agora" ? "text-mint" : "text-rust"
                    }`}
                  >
                    {n.statusHorario}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {selecionado && (
          <div className="border border-panel-line rounded-xl p-6 bg-panel flex flex-col gap-4">
            <h2 className="font-display text-lg text-paper">{selecionado.nome}</h2>

            {loadingAnalise && (
              <p className="text-sm text-paper-dim">Analisando oportunidade comercial...</p>
            )}
            {erroAnalise && <p className="text-sm text-rust">{erroAnalise}</p>}

            {analise && (
              <>
                <div>
                  <h3 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
                    Resumo
                  </h3>
                  <p className="text-sm">{analise.resumo}</p>
                </div>
                {analise.presencaDigital.length > 0 && (
                  <div className="border-l-2 border-panel-line pl-4">
                    <h3 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
                      Presença digital
                    </h3>
                    <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                      {analise.presencaDigital.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analise.oportunidades.length > 0 && (
                  <div className="border-l-2 border-amber pl-4">
                    <h3 className="font-mono text-xs tracking-widest uppercase text-amber mb-1">
                      Oportunidades
                    </h3>
                    <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                      {analise.oportunidades.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bg-ink rounded-lg p-4 border border-panel-line">
                  <h3 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
                    Abordagem sugerida
                  </h3>
                  <p className="text-sm">{analise.abordagemSugerida}</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}
