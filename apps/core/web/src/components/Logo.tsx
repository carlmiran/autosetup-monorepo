// AUTOSETUP — src/components/Logo.tsx
// Marca real, não genérica: 8 nós ao redor de um núcleo central — é
// literalmente o diagrama dos 8 componentes do Core (LENS, SAGE, ATLAS,
// PULSE, PATHS, WINDOW, WORKERS, e HUB no centro). Substitui o selo
// circular da v1 (lia como "carimbo de cartório", não como logotipo de
// produto de tecnologia).

export function LogoMark({ size = 28 }: { size?: number }) {
  const pontos = Array.from({ length: 8 }, (_, i) => {
    const angulo = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: 16 + Math.cos(angulo) * 11, y: 16 + Math.sin(angulo) * 11 };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {pontos.map((p, i) => (
        <line
          key={`linha-${i}`}
          x1={16}
          y1={16}
          x2={p.x}
          y2={p.y}
          stroke="var(--amber-dim)"
          strokeWidth="0.75"
        />
      ))}
      {pontos.map((p, i) => (
        <circle key={`no-${i}`} cx={p.x} cy={p.y} r="1.6" fill="var(--amber)" />
      ))}
      <circle cx="16" cy="16" r="3" fill="var(--ink)" stroke="var(--amber)" strokeWidth="1.25" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-display text-sm tracking-wide text-paper">AutoSetup</span>
    </div>
  );
}
