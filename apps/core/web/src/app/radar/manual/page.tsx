// AUTOSETUP — apps/core/web/src/app/radar/manual/page.tsx
// Manual real pra quem vai usar o Radar de Oportunidades pra
// prospectar e vender o AutoSetup — pensado pra pessoa sem experiência
// de vendas, ou vendedor de outra área migrando pra isso. Fonte:
// pedido de Carlos (06/08/2026).

import Link from "next/link";
import { Logo } from "@/components/Logo";

function Secao({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-amber text-sm">{numero}</span>
        <h2 className="font-display text-lg text-paper">{titulo}</h2>
        <span className="flex-1 h-px bg-panel-line" />
      </div>
      <div className="text-sm leading-relaxed flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function ManualRadarPage() {
  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">
            Manual do Indicador AutoSetup
          </h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Não precisa ter experiência de vendas. Esse guia te mostra
            exatamente o que fazer, o que dizer, e como funciona a
            comissão.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 flex flex-col gap-10">
        <Secao numero="01" titulo="O que é o AutoSetup, em uma frase">
          <p>
            É um diagnóstico gratuito, feito por inteligência artificial, que
            mostra pra um dono de negócio local (barbearia, estética, oficina,
            clínica, o que for) onde ele está perdendo cliente por falta de
            presença digital — e um plano prático pra resolver isso. Você não
            está vendendo &quot;tecnologia complicada&quot;, está oferecendo uma coisa
            grátis e útil que a maioria dos donos de negócio nunca teve
            acesso.
          </p>
        </Secao>

        <Secao numero="02" titulo="O que você vai fazer, resumido">
          <ol className="list-decimal pl-5 flex flex-col gap-2">
            <li>Usar o Radar de Oportunidades pra achar negócios reais perto de você.</li>
            <li>Escolher um negócio que pareça ter pouca presença digital.</li>
            <li>Abordar o dono (presencialmente ou por mensagem) e oferecer o diagnóstico grátis.</li>
            <li>Se ele topar, mandar o link do diagnóstico com o seu código.</li>
            <li>Se ele decidir contratar um plano depois, você ganha comissão.</li>
          </ol>
        </Secao>

        <Secao numero="03" titulo="Passo a passo do Radar">
          <p>
            Acesse{" "}
            <Link href="/radar" className="underline text-amber">
              autosetup-monorepo.teodoromiranda.workers.dev/radar
            </Link>{" "}
            pelo celular.
          </p>
          <ol className="list-decimal pl-5 flex flex-col gap-2">
            <li>Toque em &quot;Ver negócios perto de mim&quot; e autorize a localização quando o navegador pedir.</li>
            <li>
              Se quiser, digite um tipo de negócio no campo (ex:{" "}
              <code className="text-amber">barbershop</code>,{" "}
              <code className="text-amber">beauty_salon</code>) — ou deixe em
              branco pra ver tudo que tiver perto.
            </li>
            <li>Vai aparecer uma lista com nome, endereço, categoria e nota no Google de cada negócio.</li>
            <li>
              Toque num negócio da lista. A IA vai pesquisar a presença
              digital real dele (site, Instagram, Google Business) e te
              devolver uma análise: o que encontrou, o que está faltando, e
              uma sugestão de como abordar.
            </li>
            <li>
              Leia essa análise antes de ir até o negócio — ela é o seu
              &quot;roteiro&quot; de conversa.
            </li>
          </ol>
        </Secao>

        <Secao numero="04" titulo="Como abordar o dono do negócio">
          <p>
            Não decore um discurso de vendedor. Fale como se estivesse
            avisando um conhecido de algo útil. Um jeito simples de começar:
          </p>
          <div className="border border-panel-line rounded-lg p-4 bg-panel italic text-paper-dim">
            &quot;Oi, tudo bem? Eu trabalho com uma ferramenta que faz um
            diagnóstico gratuito de presença digital pra negócio local — mostra
            onde você pode estar perdendo cliente sem perceber. Leva uns
            minutos, é de graça, e você recebe o resultado na hora. Posso te
            mandar o link?&quot;
          </div>
          <p>
            Use o que a análise do Radar te mostrou como gancho real, se
            fizer sentido (ex: &quot;reparei que vocês não têm Instagram ativo — o
            diagnóstico já vai apontar isso e outras coisas&quot;) — mas nunca
            invente informação que a análise não confirmou.
          </p>
        </Secao>

        <Secao numero="05" titulo="O que explicar sobre o diagnóstico">
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>É <strong className="text-paper">100% gratuito</strong>, sem compromisso nenhum.</li>
            <li>Leva poucos minutos — dá pra responder digitando ou falando (tem opção de áudio).</li>
            <li>O resultado é gerado na hora, com pesquisa real sobre o negócio dele e os concorrentes da região.</li>
            <li>
              Depois do resultado, se ele quiser ir além, existe um plano de
              entrada por R$97 (sem mensalidade) e planos mensais — mas isso é
              decisão dele, ninguém é pressionado.
            </li>
          </ul>
          <p>
            Link pra mandar (sempre com o seu código, ver seção 07):
          </p>
          <div className="border border-panel-line rounded-lg p-3 bg-panel font-mono text-xs break-all">
            autosetup-monorepo.teodoromiranda.workers.dev/diagnostico?ref=SEUCODIGO
          </div>
        </Secao>

        <Secao numero="06" titulo="O que NÃO prometer">
          <p>
            Isso é importante pra sua credibilidade, não só regra da empresa:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>Não prometa resultado numérico garantido (&quot;vai triplicar as vendas&quot;) — o diagnóstico não promete isso, e você também não deve.</li>
            <li>Não diga que existe atendimento automático por WhatsApp — isso ainda não existe.</li>
            <li>Não prometa geração automática de posts/imagens pro plano gratuito — isso só existe nos planos pagos, feito com apoio de gente de verdade, não sozinho.</li>
          </ul>
        </Secao>

        <Secao numero="07" titulo="Como funciona sua comissão, hoje">
          <p>
            Sendo direto: o sistema já rastreia qual venda veio de qual
            indicação (o &quot;?ref=SEUCODIGO&quot; no link), mas{" "}
            <strong className="text-paper">o pagamento automático de comissão ainda não está ativo</strong> — está sendo testado
            antes de valer pra qualquer pessoa. Por enquanto, o valor da sua
            comissão é combinado diretamente com quem te passou essa
            oportunidade, e pago à parte, não pelo site.
          </p>
          <p>
            Isso vai mudar assim que o pagamento automático for validado — até
            lá, essa é a forma real de funcionar, sem enrolação.
          </p>
        </Secao>

        <Secao numero="08" titulo="Perguntas comuns">
          <p>
            <strong className="text-paper">&quot;E se a pessoa perguntar algo técnico que eu não sei responder?&quot;</strong>
            <br />
            Tudo bem não saber. Diga que vai confirmar e volta com a resposta certa — não invente.
          </p>
          <p>
            <strong className="text-paper">&quot;E se o negócio já parecer ter presença digital forte?&quot;</strong>
            <br />
            Melhor escolher outro na lista do Radar — o diagnóstico é mais interessante pra quem tem gargalo real pra mostrar.
          </p>
          <p>
            <strong className="text-paper">&quot;Posso abordar qualquer tipo de negócio?&quot;</strong>
            <br />
            Hoje o foco é negócio físico local — barbearia, estética, clínica, oficina e parecidos. Loja online e SaaS ainda não são o público certo pra essa ferramenta.
          </p>
        </Secao>
      </main>
    </>
  );
}
