// AUTOSETUP — apps/core/web/src/app/radar/termos/page.tsx
// Termos de colaboração pra quem indica/prospecta pro AutoSetup —
// esclarece que não há vínculo empregatício. Fonte: pedido de Carlos
// (06/08/2026). Texto honesto sobre o estado real do programa (ainda
// informal, sem contrato formal automatizado) — não substitui revisão
// jurídica se/quando isso virar contrato formal PJ/RPA (ver
// docs/plano-onboarding-vendedores.md).

import { Logo } from "@/components/Logo";

export default function TermosIndicadorPage() {
  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <h1 className="font-display text-xl text-paper">
          Termos da Colaboração — Indicador AutoSetup
        </h1>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 text-sm flex flex-col gap-6">
        <p className="text-xs text-paper-dim">Última atualização: 06 de agosto de 2026.</p>

        <div className="border border-amber-dim rounded-lg p-4 bg-panel">
          <p className="text-xs text-paper-dim">
            Este texto descreve como a colaboração funciona hoje, de forma
            simples e honesta. Não é um contrato formal registrado nem foi
            revisado por advogado — se algum dia isso virar uma relação
            contratual formal (PJ ou autônomo), um documento próprio será
            criado e revisado juridicamente antes.
          </p>
        </div>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Não há vínculo empregatício
          </h2>
          <p>
            Ao indicar negócios pro AutoSetup usando o Radar de Oportunidades
            ou qualquer outro meio, você não se torna funcionário, não tem
            carteira assinada, não tem jornada de trabalho fixa, não recebe
            salário, e não está subordinado a horário ou supervisão direta.
            É uma colaboração informal e voluntária — você decide quando e
            quanto prospectar, sem exclusividade.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Como a comissão funciona
          </h2>
          <p>
            Cada indicação sua é rastreada pelo link com seu código
            (<code className="text-amber">?ref=</code>). Hoje, o valor e o
            pagamento da comissão são combinados diretamente entre você e
            quem te passou essa oportunidade — não existe ainda um sistema
            automático de pagamento validado. Isso pode mudar no futuro, e
            você será avisado se e quando isso acontecer.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            O que se espera de você
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Representar o AutoSetup com honestidade — nunca prometer o que o produto não faz (ver o Manual do Indicador).</li>
            <li>Não coletar dado pessoal de ninguém além do que o próprio formulário do diagnóstico já pede.</li>
            <li>Avisar se algum prospect pedir pra não ser mais contatado.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Você pode parar quando quiser
          </h2>
          <p>
            Não há prazo mínimo nem penalidade por parar de indicar. A
            comissão de indicações já confirmadas antes de você parar
            continua valendo, combinada como sempre foi.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-2">
            Dúvidas
          </h2>
          <p>Fale direto com quem te passou essa oportunidade.</p>
        </section>
      </main>
    </>
  );
}
