"use client";

// AUTOSETUP — apps/core/web/src/app/radar/meu-desempenho/page.tsx
// Painel pessoal do indicador — resolve o maior gargalo identificado
// em 11/08/2026: quem indica trabalhava sem ver o próprio resultado.
// Sem login, identificado só pelo código, mesmo padrão do resto.

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

interface Desempenho {
  diagnosticosGerados: number;
  demonstraramInteresse: number;
  vendasConfirmadas: number;
  comissaoTotal: number;
  comissaoPaga: number;
  comissaoPendente: number;
}

function Numero({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className="border border-panel-line rounded-lg p-4 bg-panel text-center">
      <p className={`font-display text-2xl ${destaque ? "text-amber" : "text-paper"}`}>{valor}</p>
      <p className="font-mono text-[10px] tracking-widest uppercase text-paper-dim mt-1">{rotulo}</p>
    </div>
  );
}

export default function MeuDesempenhoPage() {
  const [codigo, setCodigo] = useState("");
  const [codigoConfirmado, setCodigoConfirmado] = useState("");
  const [dados, setDados] = useState<Desempenho | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function consultar() {
    if (!codigo.trim()) return;
    setLoading(true);
    setErro(null);
    setCodigoConfirmado(codigo.trim());
    try {
      const res = await fetch(`/api/indicadores/desempenho?codigo=${encodeURIComponent(codigo.trim())}`);
      const data = (await res.json()) as Desempenho & { error?: string };
      if (!res.ok) {
        setErro((data as { error?: string }).error ?? "Erro ao carregar.");
      } else {
        setDados(data);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Meu Desempenho</h1>
          <p className="text-sm text-paper-dim mt-2 max-w-sm mx-auto">
            Veja o que suas indicações já geraram, com o seu código.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-10 flex flex-col gap-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Seu código de indicador"
            className="flex-1 border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 text-sm focus-visible:outline-amber"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <button
            type="button"
            onClick={consultar}
            disabled={loading}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-4 py-2.5 text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "..." : "Ver"}
          </button>
        </div>

        {erro && <p className="text-sm text-rust">{erro}</p>}

        {dados && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Numero valor={String(dados.diagnosticosGerados)} rotulo="Diagnósticos gerados" />
              <Numero valor={String(dados.demonstraramInteresse)} rotulo="Demonstraram interesse" />
              <Numero valor={String(dados.vendasConfirmadas)} rotulo="Vendas confirmadas" destaque />
              <Numero
                valor={`R$ ${dados.comissaoPendente.toFixed(2).replace(".", ",")}`}
                rotulo="Comissão a receber"
                destaque
              />
            </div>

            <div className="border border-panel-line rounded-lg p-4 bg-panel text-sm text-paper-dim">
              <p>
                Comissão total gerada: <span className="text-paper">R$ {dados.comissaoTotal.toFixed(2).replace(".", ",")}</span>
              </p>
              <p className="mt-1">
                Já paga: <span className="text-paper">R$ {dados.comissaoPaga.toFixed(2).replace(".", ",")}</span>
              </p>
              <p className="text-xs mt-3">
                O pagamento da comissão ainda é combinado diretamente com
                quem te passou a oportunidade — não é automático ainda.{" "}
                <Link href="/radar/termos" className="underline text-amber">
                  Ver termos completos
                </Link>
                .
              </p>
            </div>

            {dados.diagnosticosGerados === 0 && (
              <p className="text-sm text-paper-dim text-center">
                Ainda não tem diagnóstico registrado com esse código —{" "}
                <Link href="/radar/manual" className="underline text-amber">
                  reveja o manual
                </Link>{" "}
                pra conferir se está usando o link certo.
              </p>
            )}
          </>
        )}

        {!dados && codigoConfirmado && !loading && !erro && (
          <p className="text-sm text-paper-dim text-center">Nenhum dado encontrado pra esse código ainda.</p>
        )}
      </main>
    </>
  );
}
