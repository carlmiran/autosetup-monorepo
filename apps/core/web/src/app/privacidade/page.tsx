// AUTOSETUP — apps/core/web/src/app/privacidade/page.tsx
// Política de privacidade e termos de uso reais. Fonte: pedido de
// Carlos (29/07/2026) — robustez pra estar pronto pra vender. Texto
// honesto sobre o que o sistema de fato faz, alinhado com RFC-001
// (Sensibilidade de Dados) e o que está implementado até agora — não
// promete capacidade que não existe.

import { Logo } from "@/components/Logo";

export default function PrivacidadePage() {
  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">Privacidade e Termos de Uso</h1>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 text-sm flex flex-col gap-6">
        <p className="text-xs text-paper-dim">Última atualização: 29 de julho de 2026.</p>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            O que coletamos
          </h2>
          <p>
            Quando você usa o diagnóstico gratuito ou a entrevista do AutoSetup RH,
            coletamos o que você informa diretamente: nome, WhatsApp (se você
            escolher informar), respostas sobre seu negócio, e, se você optar por
            gravar áudio, o conteúdo transcrito dessas gravações. Não coletamos
            nada que você não digitou ou falou voluntariamente no formulário.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Como usamos
          </h2>
          <p>
            Suas respostas são processadas por inteligência artificial (OpenAI)
            para gerar o diagnóstico ou a síntese que você recebe na tela. Se você
            informar WhatsApp, guardamos isso pra poder reconhecer você caso volte
            a usar o diagnóstico depois, e pra eventual contato sobre os planos do
            AutoSetup — nunca pra outra finalidade, e nunca compartilhado com
            terceiros pra fins de marketing.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Onde fica guardado
          </h2>
          <p>
            Seus dados ficam num banco de dados da Cloudflare (D1), a mesma
            infraestrutura que hospeda o site. Áudio gravado é enviado pra
            transcrição e não é armazenado como arquivo de áudio — só o texto
            resultante.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Seus direitos (LGPD)
          </h2>
          <p>
            Você pode pedir a exclusão dos seus dados a qualquer momento, entrando
            em contato pelo WhatsApp disponível no site. Vamos apagar o que você
            pediu do nosso banco de dados.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Sobre o diagnóstico gerado por IA
          </h2>
          <p>
            O diagnóstico é gerado por inteligência artificial a partir do que
            você informa, e pode incluir uma pesquisa real na web sobre seu
            negócio e concorrentes do mesmo nicho. Não garantimos resultado
            específico de vendas ou crescimento — o diagnóstico é uma análise,
            não uma promessa.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Contato
          </h2>
          <p>
            Dúvidas sobre privacidade ou seus dados: fale conosco pelo WhatsApp
            disponível no fechamento do diagnóstico.
          </p>
        </section>
      </main>
    </>
  );
}
