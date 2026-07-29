// AUTOSETUP — src/components/Logo.tsx
// v2 (29/07/2026): adaptação achatada da marca original de Carlos
// (ChatGPT_Image_16_de_jun...png) — "A" com seta de crescimento
// atravessando, gráfico de barras ascendente. Removido: o efeito
// 3D/glossy/brilho e a engrenagem (fica ilegível em tamanho de ícone
// pequeno junto com os outros elementos). Cor única (âmbar), sem
// gradiente — combina com o painel escuro/mono da v2 do produto.

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {/* "A" — duas pernas, sem barra transversal (tratamento minimalista) */}
      <path d="M 10 32 L 19 8 L 22 8 L 15 32 Z" fill="var(--amber-dim)" />
      <path d="M 21 8 L 24 8 L 30 32 L 26 32 Z" fill="var(--amber-dim)" />
      {/* Seta de crescimento atravessando o "A" — elemento central da marca original */}
      <path d="M 6 27 L 27 10" stroke="var(--amber)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 21 9 L 29 8 L 27 16 Z" fill="var(--amber)" />
      {/* Gráfico de barras ascendente */}
      <rect x="30" y="26" width="2.5" height="6" fill="var(--amber)" />
      <rect x="33.5" y="22" width="2.5" height="10" fill="var(--amber)" />
      <rect x="37" y="18" width="2.5" height="14" fill="var(--amber)" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-display text-sm tracking-wide text-paper">
        AUTO<span className="text-amber">SETUP</span>
      </span>
    </div>
  );
}
