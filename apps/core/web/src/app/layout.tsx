import type { Metadata } from "next";
import "./globals.css";

// AUTOSETUP — apps/core/web
// Nota: next/font/google foi removido — a rede deste sandbox bloqueia
// fonts.googleapis.com. Usando system font stack por enquanto; trocar
// por fonte real da marca (preto/dourado, ver brand-system.css do
// autosetup-demo.html) é pendência de IMP, não desta task.

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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
