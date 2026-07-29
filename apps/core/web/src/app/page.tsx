// AUTOSETUP — apps/core/web — página inicial v2.
// Painel escuro dominante, logotipo real (não texto solto), headline em
// monoespaçada grande — a tipografia técnica é a decisão central desta
// versão, não um detalhe.

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <Logo size={40} />
      <div className="flex flex-col gap-4 max-w-lg">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-amber">
          Sistema em operação
        </p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight text-paper">
          O sistema operacional do seu negócio
        </h1>
        <p className="font-mono text-xs text-paper-dim mt-1">
          LENS · SAGE · ATLAS · PULSE · PATHS · WINDOW · WORKERS · HUB
        </p>
      </div>
      <Link
        href="/diagnostico"
        className="font-sans text-sm font-semibold bg-amber text-ink rounded-md px-8 py-4 hover:brightness-110 transition-all"
      >
        Ver diagnóstico gratuito do meu negócio
      </Link>
    </main>
  );
}
