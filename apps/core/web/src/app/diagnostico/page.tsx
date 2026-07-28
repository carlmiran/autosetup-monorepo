"use client";

// AUTOSETUP — apps/core/web/src/app/diagnostico/page.tsx
// Página real de diagnóstico self-service (LENS). Fonte: Constitutional
// Principle #24-25 — nenhum dado de exemplo é mostrado como se fosse
// real; tudo que aparece no resultado vem do que a própria pessoa
// digitou/falou aqui, processado por IA real via /api/diagnostico.
//
// Design (28/07/2026, pedido de Carlos): paleta ink/brass/forest com
// psicodinâmica de cor deliberada — ver globals.css para o racional.
// O formulário virou uma "ficha de diagnóstico" com seções nomeadas
// (não uma lista solta de campos), e o resultado abre com um selo —
// referência ao carimbo/selo de documento oficial, familiar pra quem
// já lidou com nota fiscal/contrato no Brasil — pra comunicar "isso é
// uma análise séria", não um formulário qualquer.

import { useState } from "react";
import { CampoTextoComAudio } from "@/components/CampoTextoComAudio";

interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
  distanciaAteAMeta?: string;
  planoSeteDias: { dia: number; acao: string; conteudoSugerido?: string | null }[];
  leadId?: number | null;
}

const initialForm = {
  nomeContato: "",
  whatsappContato: "",
  nomeNegocio: "",
  cidade: "",
  nicho: "",
  temSite: false,
  temInstagram: false,
  temGoogleBusiness: false,
  numeroAvaliacoesGoogle: "",
  notaMediaGoogle: "",
  maiorDificuldade: "",
  rotinaDiaria: "",
  oQueAtrapalha: "",
  sobrecarga: "",
  visaoNegocio: "",
  metaFinanceira: "",
  tamanhoEquipe: "",
  canaisAtendimento: "",
  ferramentasAtuais: "",
  perdaFinanceira: "",
  linkInstagram: "",
  linkGoogleBusiness: "",
};

function SecaoDivisoria({ numero, titulo }: { numero: string; titulo: string }) {
  return (
    <div className="flex items-center gap-3 mt-4 mb-1">
      <span className="font-display italic text-brass text-lg leading-none">{numero}</span>
      <span className="font-sans text-xs tracking-[0.2em] uppercase text-ink/50">{titulo}</span>
      <span className="flex-1 h-px bg-ink/15" />
    </div>
  );
}

function inputClass(extra = "") {
  return `border border-ink/15 bg-white rounded-lg px-3 py-2.5 focus-visible:outline-brass ${extra}`;
}

export default function DiagnosticoPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          numeroAvaliacoesGoogle: form.numeroAvaliacoesGoogle
            ? Number(form.numeroAvaliacoesGoogle)
            : null,
          notaMediaGoogle: form.notaMediaGoogle ? Number(form.notaMediaGoogle) : null,
        }),
      });
      const data = (await res.json()) as DiagnosticoResultado & { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao gerar diagnóstico.");
      } else {
        setResultado(data);
      }
    } catch {
      setErro("Não foi possível conectar ao servidor de diagnóstico.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="bg-ink text-parchment px-6 py-10 text-center">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-brass-light mb-2">
          AutoSetup · Diagnóstico
        </p>
        <h1 className="font-display text-3xl">Ficha de diagnóstico do seu negócio</h1>
        <p className="font-sans text-sm text-parchment/70 mt-3 max-w-md mx-auto">
          Responda com os dados reais — digitando ou falando, você escolhe.
          A análise é gerada exatamente a partir do que você informar aqui.
          Nada é inventado.
        </p>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SecaoDivisoria numero="01" titulo="Contato" />
          <div className="border border-ink/10 rounded-xl p-4 flex flex-col gap-3 bg-parchment-soft">
            <p className="text-xs text-ink/60">
              Pra te enviar o resultado e, se fizer sentido, tirar dúvidas
              depois. Nunca usamos esses dados pra outra coisa.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Seu nome
              <input
                className={inputClass()}
                value={form.nomeContato}
                onChange={(e) => setForm({ ...form, nomeContato: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Seu WhatsApp (com DDD)
              <input
                type="tel"
                placeholder="(35) 99999-0000"
                className={inputClass()}
                value={form.whatsappContato}
                onChange={(e) => setForm({ ...form, whatsappContato: e.target.value })}
              />
            </label>
          </div>

          <SecaoDivisoria numero="02" titulo="Sobre o negócio" />

          <label className="flex flex-col gap-1 text-sm">
            Nome do negócio
            <span className="text-xs text-ink/50">
              Digite o nome da sua empresa. Mesmo que ela ainda não exista
              formalmente, mesmo que seja só um projeto no papel — pode
              colocar o nome que você já tem em mente.
            </span>
            <input
              required
              className={inputClass()}
              value={form.nomeNegocio}
              onChange={(e) => setForm({ ...form, nomeNegocio: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Cidade
            <span className="text-xs text-ink/50">
              A cidade onde o negócio atua (ou vai atuar). Ajuda a entender a
              concorrência e o público local.
            </span>
            <input
              required
              className={inputClass()}
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Nicho
            <span className="text-xs text-ink/50">
              O tipo de negócio, em poucas palavras — ex: barbearia, clínica de
              estética, oficina mecânica, salão de beleza.
            </span>
            <input
              required
              placeholder="ex: barbearia, estética, oficina mecânica"
              className={inputClass()}
              value={form.nicho}
              onChange={(e) => setForm({ ...form, nicho: e.target.value })}
            />
          </label>

          <SecaoDivisoria numero="03" titulo="Presença digital" />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink/50">
              Marque o que você já tem — não tem problema nenhum não ter
              nada ainda, isso também é um dado útil pro diagnóstico.
            </span>
            <div className="flex gap-4 flex-wrap text-sm mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.temSite}
                  onChange={(e) => setForm({ ...form, temSite: e.target.checked })}
                />
                Tenho site próprio
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.temInstagram}
                  onChange={(e) => setForm({ ...form, temInstagram: e.target.checked })}
                />
                Tenho Instagram ativo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.temGoogleBusiness}
                  onChange={(e) => setForm({ ...form, temGoogleBusiness: e.target.checked })}
                />
                Tenho Google Business
              </label>
            </div>
          </div>

          <div className="border border-ink/10 rounded-xl p-4 flex flex-col gap-3 bg-parchment-soft">
            <p className="text-xs text-ink/60">
              Opcional: cole o link do seu Instagram e/ou do seu Google Business.
              Com isso, fazemos uma pesquisa real na web pra comparar o que você
              disse com o que está publicamente visível — o diagnóstico fica
              mais preciso.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Link do Instagram (opcional)
              <input
                type="url"
                placeholder="https://instagram.com/seunegocio"
                className={inputClass()}
                value={form.linkInstagram}
                onChange={(e) => setForm({ ...form, linkInstagram: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Link do Google Business / Google Maps (opcional)
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass()}
                value={form.linkGoogleBusiness}
                onChange={(e) => setForm({ ...form, linkGoogleBusiness: e.target.value })}
              />
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex flex-col gap-1 text-sm flex-1">
              Nº de avaliações no Google (se souber)
              <input
                type="number"
                min={0}
                className={inputClass()}
                value={form.numeroAvaliacoesGoogle}
                onChange={(e) => setForm({ ...form, numeroAvaliacoesGoogle: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm flex-1">
              Nota média no Google (se souber)
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                className={inputClass()}
                value={form.notaMediaGoogle}
                onChange={(e) => setForm({ ...form, notaMediaGoogle: e.target.value })}
              />
            </label>
          </div>

          <SecaoDivisoria numero="04" titulo="O dia a dia" />
          <p className="text-xs text-ink/50 -mt-2">
            Estas são as perguntas mais importantes — quanto mais real e
            detalhada a resposta, melhor o diagnóstico. Pode digitar ou
            apertar o botão de gravar e responder falando, do seu jeito.
          </p>

          <CampoTextoComAudio
            label="Qual sua maior dificuldade hoje pra atrair ou converter clientes?"
            ajuda="Pense em algo concreto que aconteceu recentemente — não precisa ser bonito, precisa ser real."
            required
            value={form.maiorDificuldade}
            onChange={(v) => setForm({ ...form, maiorDificuldade: v })}
          />

          <CampoTextoComAudio
            label="Como é o seu dia a dia no negócio?"
            ajuda='Ex: quando você começa o dia, quais são as primeiras ações que você toma? Com quem você fala primeiro? Conte como se estivesse explicando pra alguém que nunca viu seu negócio funcionando.'
            value={form.rotinaDiaria}
            onChange={(v) => setForm({ ...form, rotinaDiaria: v })}
          />

          <CampoTextoComAudio
            label="O que atrapalha o bom fluxo do seu dia?"
            ajuda="Aquela coisa que te tira do sério, que trava tudo, que te faz perder tempo toda semana."
            value={form.oQueAtrapalha}
            onChange={(v) => setForm({ ...form, oQueAtrapalha: v })}
          />

          <CampoTextoComAudio
            label="O que sobrecarrega você? O que te faz pensar 'preciso de mais uma pessoa pra me ajudar'?"
            ajuda="Não precisa ter resposta pronta — só descreva o que pesa mais no seu dia hoje."
            value={form.sobrecarga}
            onChange={(v) => setForm({ ...form, sobrecarga: v })}
          />

          <SecaoDivisoria numero="05" titulo="Onde você quer chegar" />

          <CampoTextoComAudio
            label="Você acha que seu negócio está indo bem? Está satisfeito com os rendimentos hoje?"
            ajuda="Seja sincero — isso não vai contra você, ajuda a gente a entender de onde você está partindo."
            value={form.visaoNegocio}
            onChange={(v) => setForm({ ...form, visaoNegocio: v })}
          />

          <CampoTextoComAudio
            label="Qual valor você gostaria de ganhar com o negócio quando ele estiver plenamente desenvolvido?"
            ajuda="Pode ser um número aproximado, ou descrever como seria sua vida financeira e a estrutura da empresa nesse cenário ideal."
            value={form.metaFinanceira}
            onChange={(v) => setForm({ ...form, metaFinanceira: v })}
          />

          <SecaoDivisoria numero="06" titulo="Operação" />

          <CampoTextoComAudio
            label="Quantas pessoas trabalham com você hoje, e quantos clientes/pedidos você atende por mês, mais ou menos?"
            ajuda='Ex: "Somos em 4 pessoas e atendemos cerca de 30 clientes por dia."'
            value={form.tamanhoEquipe}
            onChange={(v) => setForm({ ...form, tamanhoEquipe: v })}
          />

          <CampoTextoComAudio
            label="Por onde os seus clientes chegam e conversam com você hoje?"
            ajuda="Ex: WhatsApp, Instagram Direct, telefone, balcão/presencial, e-mail, site. Se souber, diga qual consome mais tempo da sua equipe."
            value={form.canaisAtendimento}
            onChange={(v) => setForm({ ...form, canaisAtendimento: v })}
          />

          <CampoTextoComAudio
            label="Quais ferramentas ou sistemas você já usa hoje pra organizar o negócio?"
            ajuda="Ex: Bling, Conta Azul, Excel, caderno, Trello, ou só WhatsApp mesmo — não tem certo ou errado."
            value={form.ferramentasAtuais}
            onChange={(v) => setForm({ ...form, ferramentasAtuais: v })}
          />

          <CampoTextoComAudio
            label="Você sente que está perdendo vendas ou clientes por demorar a atender ou por falta de organização?"
            ajuda="Seja sincero — já aconteceu de esquecer de retornar um orçamento, ou o cliente esperar demais?"
            value={form.perdaFinanceira}
            onChange={(v) => setForm({ ...form, perdaFinanceira: v })}
          />

          <button
            type="submit"
            disabled={loading}
            className="font-sans font-semibold bg-brass text-ink rounded-full px-6 py-4 mt-2 hover:bg-brass-light transition-colors disabled:opacity-50"
          >
            {loading ? "Gerando diagnóstico real..." : "Ver meu diagnóstico"}
          </button>
        </form>

        {erro && (
          <div className="mt-6 border border-clay/30 bg-clay-soft text-clay rounded-xl p-4 text-sm">
            {erro}
          </div>
        )}

        {resultado && <ResultadoDiagnostico resultado={resultado} />}
      </main>
    </>
  );
}

function Selo() {
  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="33" fill="none" stroke="var(--brass)" strokeWidth="1.5" />
        <circle cx="36" cy="36" r="27" fill="none" stroke="var(--brass)" strokeWidth="1" strokeDasharray="2 3" />
        <text
          x="36"
          y="33"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontStyle="italic"
          fontSize="11"
          fill="var(--brass)"
        >
          AutoSetup
        </text>
        <text
          x="36"
          y="45"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="6"
          letterSpacing="1"
          fill="var(--brass)"
        >
          DIAGNÓSTICO REAL
        </text>
      </svg>
    </div>
  );
}

function ResultadoDiagnostico({ resultado }: { resultado: DiagnosticoResultado }) {
  return (
    <div className="mt-8 border border-ink/10 rounded-2xl p-6 flex flex-col gap-6 bg-white">
      <Selo />
      <div>
        <h2 className="font-display text-lg text-ink">Resumo</h2>
        <p className="text-sm mt-1">{resultado.resumo}</p>
      </div>

      <div className="border-l-2 border-forest pl-4">
        <h2 className="font-display text-lg text-forest">Pontos favoráveis</h2>
        <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
          {resultado.pontosFavoraveis.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {resultado.achadosNaPesquisa && resultado.achadosNaPesquisa.length > 0 && (
        <div className="border-l-2 border-ink/20 pl-4">
          <h2 className="font-display text-lg">O que encontramos pesquisando</h2>
          <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
            {resultado.achadosNaPesquisa.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-l-2 border-brass pl-4">
        <h2 className="font-display text-lg text-brass">Oportunidades</h2>
        <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
          {resultado.oportunidades.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-display text-lg text-ink">Próximo passo</h2>
        <p className="text-sm mt-1">{resultado.proximoPasso}</p>
      </div>

      {resultado.distanciaAteAMeta && (
        <div className="bg-parchment-soft rounded-xl p-4">
          <h2 className="font-display text-lg text-ink">Distância até sua meta</h2>
          <p className="text-sm mt-1">{resultado.distanciaAteAMeta}</p>
        </div>
      )}

      {resultado.planoSeteDias && resultado.planoSeteDias.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-ink mb-2">Plano de 7 dias</h2>
          <ol className="flex flex-col gap-3">
            {resultado.planoSeteDias.map((item) => (
              <li key={item.dia} className="border border-ink/10 rounded-lg p-3">
                <p className="text-xs font-sans tracking-widest uppercase text-brass mb-1">
                  Dia {item.dia}
                </p>
                <p className="text-sm">{item.acao}</p>
                {item.conteudoSugerido && (
                  <p className="text-sm mt-2 italic text-ink/70 border-t border-ink/10 pt-2">
                    Ideia de conteúdo: {item.conteudoSugerido}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <BlocoFechamento leadId={resultado.leadId ?? null} />
    </div>
  );
}

function BlocoFechamento({ leadId }: { leadId: number | null }) {
  const [interesse, setInteresse] = useState<"sim" | "nao" | null>(null);
  const numeroWhatsApp = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO;

  function registrarInteresse(valor: "sim" | "nao") {
    setInteresse(valor);
    if (leadId) {
      fetch("/api/interesse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, interesse: valor }),
      }).catch(() => {
        // best-effort — não bloqueia a experiência se falhar
      });
    }
  }

  return (
    <div className="-mx-6 -mb-6 mt-2 bg-ink text-parchment rounded-b-2xl p-6 flex flex-col gap-3">
      <p className="text-sm">
        Esse plano de 7 dias é só o começo — o AutoSetup pode ir além do
        texto: nossa equipe produz as artes dos posts/carrosséis com base
        no seu plano, você aprova (ou já manda materiais/fotos que quiser
        usar), e a gente organiza tudo pra você publicar. Isso faz parte
        da consultoria/parceria contratada — hoje é acompanhado por
        gente de verdade, não é automático.
      </p>
      <p className="text-sm font-medium">
        Isso faz sentido pro seu dia a dia e pro seu negócio?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => registrarInteresse("sim")}
          className="font-sans font-semibold rounded-full px-5 py-2.5 text-sm bg-brass text-ink hover:bg-brass-light transition-colors"
        >
          Sim, quero saber mais
        </button>
        <button
          type="button"
          onClick={() => registrarInteresse("nao")}
          className="font-sans rounded-full px-5 py-2.5 text-sm border border-parchment/30 text-parchment"
        >
          Ainda não
        </button>
      </div>
      {interesse === "sim" &&
        (numeroWhatsApp ? (
          <a
            href={`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
              "Vi meu diagnóstico no AutoSetup e quero saber mais sobre o cronograma de desenvolvimento.",
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline text-brass-light"
          >
            Continuar conversa no WhatsApp →
          </a>
        ) : (
          <p className="text-xs text-parchment/60">
            Contato ainda não configurado neste ambiente — fale com quem te
            enviou este link.
          </p>
        ))}
      {interesse === "nao" && (
        <p className="text-xs text-parchment/60">
          Sem problema — o diagnóstico acima já é seu, fique à vontade pra
          voltar quando fizer sentido.
        </p>
      )}
    </div>
  );
}
