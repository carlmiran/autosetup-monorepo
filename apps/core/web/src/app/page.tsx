// AUTOSETUP — apps/core/web — página inicial.
// Hero em "ink" (autoridade) — o primeiro contato precisa parecer sério,
// não um app qualquer. O botão em "brass" é a única cor quente da tela,
// pra guiar o olho direto pra ação.

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-ink text-parchment px-6 py-20 text-center">
      <div className="flex flex-col gap-3 max-w-md">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-brass-light">
          AutoSetup
        </p>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">
          O sistema operacional do seu negócio
        </h1>
        <p className="font-sans text-sm text-parchment/70 mt-2">
          Core: LENS · SAGE · ATLAS · PULSE · PATHS · WINDOW · WORKERS · HUB
        </p>
      </div>
      <Link
        href="/diagnostico"
        className="font-sans text-sm font-semibold bg-brass text-ink rounded-full px-8 py-4 hover:bg-brass-light transition-colors"
      >
        Ver diagnóstico gratuito do meu negócio
      </Link>
    </main>
  );
}
