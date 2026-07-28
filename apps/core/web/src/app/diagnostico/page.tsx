"use client";

// AUTOSETUP — apps/core/web/src/app/diagnostico/page.tsx
// Página real de diagnóstico self-service (LENS). Fonte: Constitutional
// Principle #24-25 — nenhum dado de exemplo é mostrado como se fosse
// real; tudo que aparece no resultado vem do que a própria pessoa
// digitou/falou aqui, processado por IA real via /api/diagnostico.
//
// Pedido de Carlos (27/07/2026): microcopy explicando cada campo, opção
// de responder por áudio (a voz carrega a parte emocional que texto não
// carrega), e perguntas mais profundas sobre rotina/dores/sobrecarga.

import { useState } from "react";
import { CampoTextoComAudio } from "@/components/CampoTextoComAudio";

interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
  distanciaAteAMeta?: string;
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
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold mb-2">Diagnóstico gratuito do seu negócio</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Responda com os dados reais do seu negócio — digitando ou falando,
        você escolhe. A análise abaixo é gerada a partir exatamente do que
        você informar aqui — nada é inventado.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="border rounded p-3 flex flex-col gap-3 bg-neutral-50">
          <p className="text-xs text-neutral-500">
            Pra te enviar o resultado e, se fizer sentido, tirar dúvidas
            depois. Nunca usamos esses dados pra outra coisa.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Seu nome
            <input
              className="border rounded px-3 py-2"
              value={form.nomeContato}
              onChange={(e) => setForm({ ...form, nomeContato: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Seu WhatsApp (com DDD)
            <input
              type="tel"
              placeholder="(35) 99999-0000"
              className="border rounded px-3 py-2"
              value={form.whatsappContato}
              onChange={(e) => setForm({ ...form, whatsappContato: e.target.value })}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <span className="text-xs text-neutral-500">
            Digite o nome da sua empresa. Mesmo que ela ainda não exista
            formalmente, mesmo que seja só um projeto no papel — pode
            colocar o nome que você já tem em mente.
          </span>
          <input
            required
            className="border rounded px-3 py-2"
            value={form.nomeNegocio}
            onChange={(e) => setForm({ ...form, nomeNegocio: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Cidade
          <span className="text-xs text-neutral-500">
            A cidade onde o negócio atua (ou vai atuar). Ajuda a entender a
            concorrência e o público local.
          </span>
          <input
            required
            className="border rounded px-3 py-2"
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nicho
          <span className="text-xs text-neutral-500">
            O tipo de negócio, em poucas palavras — ex: barbearia, clínica de
            estética, oficina mecânica, salão de beleza.
          </span>
          <input
            required
            placeholder="ex: barbearia, estética, oficina mecânica"
            className="border rounded px-3 py-2"
            value={form.nicho}
            onChange={(e) => setForm({ ...form, nicho: e.target.value })}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm">Presença digital hoje</span>
          <span className="text-xs text-neutral-500">
            Marque o que você já tem — não tem problema nenhum não ter
            nada ainda, isso também é um dado útil pro diagnóstico.
          </span>
          <div className="flex gap-4 flex-wrap text-sm mt-1">
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

        <div className="border rounded p-3 flex flex-col gap-3 bg-neutral-50">
          <p className="text-xs text-neutral-500">
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
              className="border rounded px-3 py-2"
              value={form.linkInstagram}
              onChange={(e) => setForm({ ...form, linkInstagram: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Link do Google Business / Google Maps (opcional)
            <input
              type="url"
              placeholder="https://maps.app.goo.gl/..."
              className="border rounded px-3 py-2"
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
              className="border rounded px-3 py-2"
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
              className="border rounded px-3 py-2"
              value={form.notaMediaGoogle}
              onChange={(e) => setForm({ ...form, notaMediaGoogle: e.target.value })}
            />
          </label>
        </div>

        <hr className="border-neutral-200" />
        <p className="text-xs text-neutral-500 -mt-2">
          As perguntas abaixo são as mais importantes — quanto mais real e
          detalhada a resposta, melhor o diagnóstico. Pode digitar ou apertar
          o botão de gravar e responder falando, do seu jeito.
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
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Gerando diagnóstico real..." : "Ver meu diagnóstico"}
        </button>
      </form>

      {erro && (
        <div className="mt-6 border border-red-300 bg-red-50 text-red-800 rounded p-4 text-sm">
          {erro}
        </div>
      )}

      {resultado && (
        <div className="mt-6 border rounded p-4 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">Resumo</h2>
            <p className="text-sm">{resultado.resumo}</p>
          </div>
          <div>
            <h2 className="font-semibold">Pontos favoráveis</h2>
            <ul className="list-disc pl-5 text-sm">
              {resultado.pontosFavoraveis.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          {resultado.achadosNaPesquisa && resultado.achadosNaPesquisa.length > 0 && (
            <div>
              <h2 className="font-semibold">O que encontramos pesquisando</h2>
              <ul className="list-disc pl-5 text-sm">
                {resultado.achadosNaPesquisa.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="font-semibold">Oportunidades</h2>
            <ul className="list-disc pl-5 text-sm">
              {resultado.oportunidades.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Próximo passo</h2>
            <p className="text-sm">{resultado.proximoPasso}</p>
          </div>
          {resultado.distanciaAteAMeta && (
            <div>
              <h2 className="font-semibold">Distância até sua meta</h2>
              <p className="text-sm">{resultado.distanciaAteAMeta}</p>
            </div>
          )}
          <BlocoFechamento leadId={resultado.leadId ?? null} />
        </div>
      )}
    </main>
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
    <div className="border-t pt-4 mt-2 flex flex-col gap-3">
      <p className="text-sm">
        Esse diagnóstico é só o começo. O AutoSetup pode transformar isso num{" "}
        <strong>cronograma de desenvolvimento</strong> — um passo a passo com
        acompanhamento contínuo pra sua empresa sair de onde está hoje e
        chegar mais perto da meta que você descreveu.
      </p>
      <p className="text-sm font-medium">
        Isso faz sentido pro seu dia a dia e pro seu negócio?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => registrarInteresse("sim")}
          className="border rounded px-4 py-2 text-sm bg-black text-white"
        >
          Sim, quero saber mais
        </button>
        <button
          type="button"
          onClick={() => registrarInteresse("nao")}
          className="border rounded px-4 py-2 text-sm"
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
            className="text-sm underline text-blue-700"
          >
            Continuar conversa no WhatsApp →
          </a>
        ) : (
          <p className="text-xs text-neutral-500">
            Contato ainda não configurado neste ambiente — fale com quem te
            enviou este link.
          </p>
        ))}
      {interesse === "nao" && (
        <p className="text-xs text-neutral-500">
          Sem problema — o diagnóstico acima já é seu, fique à vontade pra
          voltar quando fizer sentido.
        </p>
      )}
    </div>
  );
}
