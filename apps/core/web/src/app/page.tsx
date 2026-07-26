// AUTOSETUP — apps/core/web — página inicial mínima real do Core.
// Conteúdo de marca/design (preto/dourado) é pendência de IMP separada
// — este é o scaffold estrutural do EBK 0.1, não a versão final de UI.

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">AutoSetup OS</h1>
      <p className="text-sm text-neutral-500">
        Core: LENS · SAGE · ATLAS · PULSE · PATHS · WINDOW · WORKERS · HUB
      </p>
    </main>
  );
}
