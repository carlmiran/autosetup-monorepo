import type { Metadata } from "next";
import "./globals.css";

// AUTOSETUP — apps/core/web
// Fontes reais via @fontsource (self-hosted, sem depender de rede
// externa em build/produção): Fraunces (display, autoridade+calor) e
// Public Sans (corpo, legibilidade em formulário longo no celular).
// Paleta preto-quente/dourado/verde — ver globals.css para o
// racional completo de psicodinâmica das cores.

export const metadata: Metadata = {
  title: "AutoSetup OS",
  description: "Cognitive Operating System para PMEs brasileiras.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-parchment text-ink">{children}</body>
    </html>
  );
}
