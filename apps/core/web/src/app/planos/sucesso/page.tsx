// AUTOSETUP — apps/core/web/src/app/planos/sucesso/page.tsx
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function SucessoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={32} />
      <div>
        <h1 className="font-display text-xl text-paper">Pagamento em processamento</h1>
        <p className="text-sm text-paper-dim mt-2 max-w-md">
          Assim que o Mercado Pago confirmar, nossa equipe entra em contato
          pelo WhatsApp que você informou. Se algo der errado, fale com a
          gente direto.
        </p>
      </div>
      <Link href="/" className="text-sm underline text-amber">
        Voltar ao início
      </Link>
    </main>
  );
}
