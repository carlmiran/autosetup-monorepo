import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function IndicadorConectadoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={32} />
      <div>
        <h1 className="font-display text-xl text-paper">Conta conectada</h1>
        <p className="text-sm text-paper-dim mt-2 max-w-md">
          Sua conta do Mercado Pago está ligada. A partir de agora, toda
          venda que vier pelo seu link já divide sua comissão
          automaticamente, direto na sua conta.
        </p>
      </div>
      <Link href="/" className="text-sm underline text-amber">
        Voltar ao início
      </Link>
    </main>
  );
}
