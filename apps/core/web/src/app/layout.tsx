import type { Metadata } from "next";
import "./globals.css";

// AUTOSETUP — apps/core/web
// v2 (28/07/2026): direção "painel de sistema operacional" — fundo
// escuro dominante, JetBrains Mono pra display/rótulos (o produto
// SE CHAMA "Operating System"), Public Sans pro corpo de texto.

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
      <body className="min-h-full flex flex-col font-sans bg-ink text-paper scanlines">
        {children}
      </body>
    </html>
  );
}
