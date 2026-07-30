// AUTOSETUP — apps/core/web/src/app/planos/page.tsx
// Preços e planos reais. Fonte: pedido de Carlos (29/07/2026) — "assuma
// o destrave de dinheiro". Calibrado pela faixa real de gestão de redes
// sociais pra pequeno negócio no Brasil (R$300-800 freelancer/pequena
// agência, R$1.000-3.000 agência estabelecida) — AutoSetup fica
// competitivo por baixo disso. Estimativa fundamentada, não testada com
// venda real — ajustar conforme resposta de mercado.

import Link from "next/link";
import { Logo } from "@/components/Logo";

interface Plano {
  nome: string;
  preco: string;
  periodo?: string;
  descricao: string;
  itens: string[];
  destaque?: boolean;
}

const planos: Plano[] = [
  {
    nome: "Raio-X + Plano de Ação",
    preco: "R$ 97",
    periodo: "pagamento único",
    descricao: "Pra quem quer começar sem compromisso mensal.",
    itens: [
      "Diagnóstico aprofundado com revisão humana",
      "Plano de conteúdo de 30 dias",
      "1 arte de exemplo pronta pra publicar",
    ],
  },
  {
    nome: "Parceria Mensal Essencial",
    preco: "R$ 397",
    periodo: "por mês",
    descricao: "Pra quem quer presença constante sem virar tarefa sua.",
    itens: [
      "8 posts por mês (conteúdo + arte)",
      "Acompanhamento quinzenal via WhatsApp",
      "1 relatório mensal comparando com a concorrência",
    ],
    destaque: true,
  },
  {
    nome: "Parceria Mensal Completa",
    preco: "R$ 797",
    periodo: "por mês",
    descricao: "Pra quem quer ritmo forte de crescimento.",
    itens: [
      "16 posts por mês + carrosséis",
      "Acompanhamento semanal via WhatsApp",
      "Monitoramento de concorrência",
      "Call estratégica mensal",
      "Prioridade de atendimento",
    ],
  },
];

export default function PlanosPage() {
  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Planos</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Sem letra miúda. Escolha o que faz sentido pro momento do seu
            negócio — dá pra trocar de plano depois.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {planos.map((plano) => (
            <div
              key={plano.nome}
              className={`border rounded-xl p-6 flex flex-col gap-4 bg-panel ${
                plano.destaque ? "border-amber" : "border-panel-line"
              }`}
            >
              {plano.destaque && (
                <span className="font-mono text-[10px] tracking-widest uppercase text-amber">
                  Mais escolhido
                </span>
              )}
              <div>
                <h2 className="font-display text-lg text-paper">{plano.nome}</h2>
                <p className="text-xs text-paper-dim mt-1">{plano.descricao}</p>
              </div>
              <div>
                <span className="font-display text-2xl text-amber">{plano.preco}</span>
                {plano.periodo && (
                  <span className="text-xs text-paper-dim ml-2">{plano.periodo}</span>
                )}
              </div>
              <ul className="flex flex-col gap-2 text-sm flex-1">
                {plano.itens.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-mint">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 border border-panel-line rounded-xl p-6 bg-panel text-center">
          <h2 className="font-display text-lg text-paper">Personalizado</h2>
          <p className="text-sm text-paper-dim mt-1">
            Negócio maior, rede de unidades ou franquia? Vamos montar sob
            consulta.
          </p>
        </div>

        <p className="text-xs text-paper-dim text-center mt-8">
          Todo plano começa pelo{" "}
          <Link href="/diagnostico" className="underline text-amber">
            diagnóstico gratuito
          </Link>
          .
        </p>
      </main>
    </>
  );
}
