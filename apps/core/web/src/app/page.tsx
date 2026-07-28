// AUTOSETUP — apps/core/web — página inicial mínima real do Core.
// Conteúdo de marca/design (preto/dourado) é pendência de IMP separada
// — este é o scaffold estrutural do EBK 0.1, não a versão final de UI.

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">AutoSetup OS</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Core: LENS · SAGE · ATLAS · PULSE · PATHS · WINDOW · WORKERS · HUB
        </p>
      </div>
      <Link
        href="/diagnostico"
        className="bg-black text-white rounded px-6 py-3 text-sm font-medium"
      >
        Ver diagnóstico gratuito do meu negócio
      </Link>
    </main>
  );
}
