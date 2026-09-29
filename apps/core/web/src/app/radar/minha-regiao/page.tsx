"use client";

// AUTOSETUP — apps/core/web/src/app/radar/minha-regiao/page.tsx
// Cadastro da região de atuação do indicador, pro Prospector Autônomo
// (apps/core/worker-prospector) saber onde procurar negócios sozinho.
// Dois modos, decisão de Carlos (12/08/2026): usar a localização do
// navegador (mesmo padrão de /radar) ou digitar cidade/bairro
// manualmente. Protegido por PIN (mesmo componente de /radar/meus-clientes
// e /radar/meu-desempenho).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AvisoIndicadores } from "@/components/AvisoIndicadores";
import { EntradaComPin } from "@/components/EntradaComPin";

interface RegiaoIndicador {
  origem: "geolocalizacao" | "manual";
  endereco_referencia: string | null;
  lat: number;
  lng: number;
  raio_km: number;
  atualizado_em: string;
}

export default function MinhaRegiaoPage() {
  const [codigoInicial] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("codigo") ?? "",
  );
  const [codigoConfirmado, setCodigoConfirmado] = useState("");
  const [regiaoAtual, setRegiaoAtual] = useState<RegiaoIndicador | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [enderecoTexto, setEnderecoTexto] = useState("");
  const [raioKm, setRaioKm] = useState(5);
  const [salvando, setSalvando] = useState<"geolocalizacao" | "manual" | null>(null);

  useEffect(() => {
    if (!codigoConfirmado) return;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetch(`/api/indicadores/regiao?codigo=${encodeURIComponent(codigoConfirmado)}`);
        const data = (await res.json()) as { regiao?: RegiaoIndicador | null; error?: string };
        if (!res.ok) {
          setErro(data.error ?? "Erro ao carregar.");
        } else if (data.regiao) {
          setRegiaoAtual(data.regiao);
          setRaioKm(data.regiao.raio_km);
        }
      } catch {
        setErro("Não foi possível conectar ao servidor.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [codigoConfirmado]);

  async function salvar(body: Record<string, unknown>, origem: "geolocalizacao" | "manual") {
    setSalvando(origem);
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch("/api/indicadores/regiao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoConfirmado, raioKm, ...body }),
      });
      const data = (await res.json()) as { ok?: boolean; regiao?: RegiaoIndicador; error?: string };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível salvar.");
      } else {
        setRegiaoAtual(data.regiao ?? null);
        setSucesso("Região salva.");
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(null);
    }
  }

  function usarLocalizacaoAtual() {
    setErro(null);
    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta localização.");
      return;
    }
    setSalvando("geolocalizacao");
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        salvar(
          { origem: "geolocalizacao", lat: posicao.coords.latitude, lng: posicao.coords.longitude },
          "geolocalizacao",
        );
      },
      () => {
        setErro("Não conseguimos acessar sua localização — verifique a permissão do navegador.");
        setSalvando(null);
      },
    );
  }

  function salvarManual() {
    if (!enderecoTexto.trim()) {
      setErro("Digite a cidade ou bairro onde você atua.");
      return;
    }
    salvar({ origem: "manual", enderecoReferencia: enderecoTexto.trim() }, "manual");
  }

  if (!codigoConfirmado) {
    return (
      <EntradaComPin
        titulo="Minha Área de Atuação"
        descricao="Digite seu código de indicador e o PIN pra configurar onde o Prospector Autônomo deve procurar oportunidades por você."
        codigoInicial={codigoInicial}
        onEntrar={(c) => setCodigoConfirmado(c)}
      />
    );
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Minha Área de Atuação</h1>
          <p className="text-xs text-paper-dim mt-1">Código: {codigoConfirmado}</p>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Onde o Prospector Autônomo deve procurar negócios por você.
          </p>
        </div>
      </header>
      <AvisoIndicadores />

      <main className="mx-auto max-w-md px-6 py-10 flex flex-col gap-6">
        <div className="border border-amber-dim rounded-lg p-4 bg-panel text-xs text-paper-dim">
          O cron diário do Prospector ainda não está ativo — isso aqui só
          guarda sua região pra quando ele for ligado. Nada é buscado
          automaticamente ainda.
        </div>

        {carregando && <p className="text-sm text-paper-dim text-center">Carregando...</p>}

        {regiaoAtual && (
          <div className="border border-panel-line rounded-lg p-4 bg-panel text-sm">
            <p className="font-mono text-[10px] tracking-widest uppercase text-paper-dim mb-1">
              Região atual
            </p>
            <p className="text-paper">
              {regiaoAtual.origem === "manual"
                ? regiaoAtual.endereco_referencia ?? "Endereço digitado"
                : "Localização do navegador (coordenadas salvas)"}
            </p>
            <p className="text-xs text-paper-dim mt-1">Raio: {regiaoAtual.raio_km} km</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-paper-dim">Raio de busca (km)</label>
          <input
            type="number"
            min={1}
            max={50}
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={raioKm}
            onChange={(e) => setRaioKm(Number(e.target.value))}
          />
        </div>

        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          disabled={salvando !== null}
          className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-4 hover:brightness-110 transition-all disabled:opacity-50"
        >
          {salvando === "geolocalizacao" ? "Salvando..." : "📍 Usar minha localização atual"}
        </button>

        <div className="flex items-center gap-3 text-xs text-paper-dim">
          <div className="flex-1 h-px bg-panel-line" />
          ou
          <div className="flex-1 h-px bg-panel-line" />
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder='Cidade ou bairro (ex: "Pinheiros, São Paulo - SP")'
            className="border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={enderecoTexto}
            onChange={(e) => setEnderecoTexto(e.target.value)}
          />
          <button
            type="button"
            onClick={salvarManual}
            disabled={salvando !== null}
            className="font-sans font-semibold border border-amber text-amber rounded-md px-6 py-3 text-sm hover:bg-amber hover:text-ink transition-all disabled:opacity-50"
          >
            {salvando === "manual" ? "Localizando endereço..." : "Salvar esse endereço"}
          </button>
        </div>

        {erro && <p className="text-sm text-rust text-center">{erro}</p>}
        {sucesso && <p className="text-sm text-mint text-center">{sucesso}</p>}

        <Link href="/radar" className="text-xs underline text-amber text-center">
          Voltar pro Radar
        </Link>
      </main>
    </>
  );
}
