"use client";

// AUTOSETUP — apps/core/web/src/app/diagnostico/page.tsx
// v3 (29/07/2026): NUNCA MAIS PERDER O QUE A PESSOA PREENCHEU.
// Pedido de Carlos após um erro real em produção ("page could not be
// found" depois de clicar em "Ver meu diagnóstico"): o formulário
// inteiro é salvo no localStorage do navegador a cada mudança
// (debounced), e restaurado automaticamente se a pessoa recarregar ou
// a página falhar. Limpo só depois de um diagnóstico gerado com
// sucesso. Também: timeout explícito no fetch com mensagem clara em
// vez de deixar o navegador mostrar erro genérico.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CampoTextoComAudio } from "@/components/CampoTextoComAudio";
import { Logo } from "@/components/Logo";

const CHAVE_LOCALSTORAGE = "autosetup-diagnostico-rascunho";

interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
  distanciaAteAMeta?: string;
  planoSeteDias: { dia: number; acao: string; conteudoSugerido?: string | null; prioridade?: string }[];
  comparacaoConcorrentes?: {
    concorrentes: { nome: string; destaque: string }[];
    posicionamento: string;
  } | null;
  historicoAnterior?: { data: string; resumo: string }[];
  leadId?: number | null;
  codigoDesconto?: string | null;
  percentualDesconto?: number | null;
}

interface PerguntaNicho {
  pergunta: string;
  ajuda: string;
}

const initialForm = {
  nomeContato: "",
  whatsappContato: "",
  codigoIndicacao: "",
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
  precosServicos: "",
  linkInstagram: "",
  linkGoogleBusiness: "",
};

function SecaoDivisoria({ numero, titulo }: { numero: string; titulo: string }) {
  return (
    <div className="flex items-center gap-3 mt-4 mb-1">
      <span className="font-mono text-amber text-xs">{numero}</span>
      <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-paper-dim">
        {titulo}
      </span>
      <span className="flex-1 h-px bg-panel-line" />
    </div>
  );
}

function inputClass(extra = "") {
  return `border border-panel-line bg-panel text-paper rounded-md px-3 py-2.5 focus-visible:outline-amber placeholder:text-paper-dim/50 ${extra}`;
}

function restaurarRascunho(): { form: typeof initialForm; restaurado: boolean } {
  if (typeof window === "undefined") return { form: initialForm, restaurado: false };

  const refDaUrl = new URLSearchParams(window.location.search).get("ref") ?? "";

  try {
    const salvo = window.localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (salvo) {
      const parsed = JSON.parse(salvo) as Partial<typeof initialForm>;
      const temAlgumDado = Object.values(parsed).some(
        (v) => typeof v === "string" && v.trim().length > 0,
      );
      if (temAlgumDado) {
        return {
          form: { ...initialForm, ...parsed, codigoIndicacao: refDaUrl || parsed.codigoIndicacao || "" },
          restaurado: true,
        };
      }
    }
  } catch {
    // rascunho corrompido — ignora silenciosamente, não impede o uso
  }
  return { form: { ...initialForm, codigoIndicacao: refDaUrl }, restaurado: false };
}

export default function DiagnosticoPage() {
  const [form, setForm] = useState<typeof initialForm>(() => restaurarRascunho().form);
  const [restaurado, setRestaurado] = useState<boolean>(() => restaurarRascunho().restaurado);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);

  const [perguntasNicho, setPerguntasNicho] = useState<PerguntaNicho[]>([]);
  const [respostasNicho, setRespostasNicho] = useState<string[]>([]);
  const [loadingNicho, setLoadingNicho] = useState(false);
  const [erroNicho, setErroNicho] = useState<string | null>(null);

  // Salva o rascunho a cada mudança (debounced), pra nunca perder o que
  // a pessoa já digitou/gravou — mesmo se a geração do diagnóstico falhar.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(form));
      } catch {
        // localStorage indisponível (modo privado, etc.) — segue sem salvar
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form]);

  function limparRascunho() {
    try {
      window.localStorage.removeItem(CHAVE_LOCALSTORAGE);
    } catch {
      // ignora
    }
  }

  async function gerarPerguntasNicho() {
    if (!form.nicho.trim()) return;
    setLoadingNicho(true);
    setErroNicho(null);
    try {
      const res = await fetch("/api/perguntas-nicho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicho: form.nicho }),
      });
      const data = (await res.json()) as { perguntas?: PerguntaNicho[]; error?: string };
      if (!res.ok || !data.perguntas) {
        setErroNicho(data.error ?? "Não consegui gerar perguntas pra esse nicho.");
      } else {
        setPerguntasNicho(data.perguntas);
        setRespostasNicho(data.perguntas.map(() => ""));
      }
    } catch {
      setErroNicho("Não foi possível conectar ao servidor.");
    } finally {
      setLoadingNicho(false);
    }
  }

  function normalizarLink(valor: string): string {
    const limpo = valor.trim();
    if (!limpo) return "";
    return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    setResultado(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110_000); // 110s — a busca de concorrentes pode demorar

    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...form,
          linkInstagram: normalizarLink(form.linkInstagram),
          linkGoogleBusiness: normalizarLink(form.linkGoogleBusiness),
          numeroAvaliacoesGoogle: form.numeroAvaliacoesGoogle
            ? Number(form.numeroAvaliacoesGoogle)
            : null,
          notaMediaGoogle: form.notaMediaGoogle ? Number(form.notaMediaGoogle) : null,
          perguntasNicho: perguntasNicho
            .map((q, i) => ({ pergunta: q.pergunta, resposta: respostasNicho[i] ?? "" }))
            .filter((qa) => qa.resposta.trim().length > 0),
        }),
      });
      const data = (await res.json()) as DiagnosticoResultado & { error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao gerar diagnóstico.");
      } else {
        setResultado(data);
        limparRascunho(); // só limpa depois de um diagnóstico gerado com sucesso
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setErro(
          "A geração demorou mais do que o esperado (a busca por concorrentes reais pode levar mais de um minuto). Suas respostas continuam salvas neste navegador — tente novamente em alguns instantes.",
        );
      } else {
        setErro(
          "Não foi possível conectar ao servidor de diagnóstico. Suas respostas continuam salvas neste navegador — tente novamente.",
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <>
      <header className="border-b border-panel-line px-6 py-6 flex flex-col items-center gap-4">
        <Logo size={32} />
        <div className="text-center">
          <h1 className="font-display text-xl text-paper">Diagnóstico do seu negócio</h1>
          <p className="font-sans text-sm text-paper-dim mt-2 max-w-md mx-auto">
            Responda com os dados reais — digitando ou falando, você escolhe.
            A análise é gerada exatamente a partir do que você informar aqui.
            Nada é inventado.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {restaurado && (
          <div className="border border-mint/30 bg-mint-dim rounded-lg p-3 text-sm text-mint mb-5 flex items-center justify-between gap-2">
            <span>Recuperamos o que você já tinha preenchido antes.</span>
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setRestaurado(false);
                limparRascunho();
              }}
              className="font-mono text-xs underline shrink-0"
            >
              Começar do zero
            </button>
          </div>
        )}

        <div className="border border-panel-line rounded-lg p-4 bg-panel text-xs text-paper-dim mb-2">
          Esse diagnóstico é pra quem já tem (ou está começando) um negócio
          próprio. Ainda não tem negócio, mas quer uma renda?{" "}
          <Link href="/radar/manual" className="underline text-amber">
            Veja como ganhar comissão indicando negócios pro AutoSetup
          </Link>{" "}
          — não precisa de CNPJ nem experiência de vendas.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <SecaoDivisoria numero="01" titulo="Perguntas essenciais" />
          <p className="text-xs text-paper-dim -mt-2">
            Só isso já gera um diagnóstico real. O resto do formulário é
            opcional — quanto mais você responder, mais afiado o resultado,
            mas essas 5 perguntas bastam pra começar.
          </p>

          <label className="flex flex-col gap-1 text-sm">
            Nome do negócio
            <span className="text-xs text-paper-dim">
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
            <span className="text-xs text-paper-dim">
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
            <span className="text-xs text-paper-dim">
              O tipo de negócio, em poucas palavras — ex: barbearia, clínica de
              estética, oficina mecânica, organização de eventos.
            </span>
            <input
              required
              placeholder="ex: barbearia, estética, organização de eventos"
              className={inputClass()}
              value={form.nicho}
              onChange={(e) => setForm({ ...form, nicho: e.target.value })}
            />
          </label>

          {perguntasNicho.length === 0 && (
            <button
              type="button"
              onClick={gerarPerguntasNicho}
              disabled={!form.nicho.trim() || loadingNicho}
              className="self-start font-mono text-xs text-amber border border-amber-dim rounded-md px-3 py-2 hover:bg-panel disabled:opacity-40 transition-colors"
            >
              {loadingNicho ? "Analisando nicho..." : "▸ Analisar meu nicho"}
            </button>
          )}
          {erroNicho && <p className="text-xs text-rust">{erroNicho}</p>}

          {perguntasNicho.length > 0 && (
            <div className="border border-panel-line rounded-lg p-4 flex flex-col gap-4 bg-panel">
              <p className="text-xs text-paper-dim">
                Perguntas específicas pro seu nicho — medem o quanto você está
                por dentro do que está rolando no seu mercado agora.
              </p>
              {perguntasNicho.map((q, i) => (
                <CampoTextoComAudio
                  key={i}
                  label={q.pergunta}
                  ajuda={q.ajuda}
                  value={respostasNicho[i] ?? ""}
                  onChange={(v) =>
                    setRespostasNicho((prev) => prev.map((r, idx) => (idx === i ? v : r)))
                  }
                />
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Seu WhatsApp (com DDD)
            <span className="text-xs text-paper-dim">
              Pra te enviar o resultado e, se fizer sentido, tirar dúvidas
              depois. Nunca usamos esse dado pra outra coisa.
            </span>
            <input
              type="tel"
              required
              placeholder="(35) 99999-0000"
              className={inputClass()}
              value={form.whatsappContato}
              onChange={(e) => setForm({ ...form, whatsappContato: e.target.value })}
            />
          </label>

          <CampoTextoComAudio
            label="Qual sua maior dificuldade hoje pra atrair ou converter clientes?"
            ajuda="Pense em algo concreto que aconteceu recentemente — não precisa ser bonito, precisa ser real."
            required
            value={form.maiorDificuldade}
            onChange={(v) => setForm({ ...form, maiorDificuldade: v })}
          />

          <label className="flex flex-col gap-1 text-sm">
            Seu nome (opcional)
            <input
              className={inputClass()}
              value={form.nomeContato}
              onChange={(e) => setForm({ ...form, nomeContato: e.target.value })}
            />
          </label>

          <SecaoDivisoria numero="02" titulo="Presença digital" />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-paper-dim">
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

          <div className="border border-panel-line rounded-lg p-4 flex flex-col gap-3 bg-panel">
            <p className="text-xs text-paper-dim">
              A gente já pesquisa concorrentes reais do seu nicho automaticamente.
              Se quiser, cole também seu Instagram/Google Business — assim
              comparamos o que você disse com o que está publicamente visível.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Link do Instagram (opcional)
              <span className="text-xs text-paper-dim">
                Pode colar do jeito que copiar — com ou sem &quot;https://&quot; na frente,
                a gente ajusta sozinho.
              </span>
              <input
                type="text"
                inputMode="url"
                placeholder="instagram.com/seunegocio"
                className={inputClass()}
                value={form.linkInstagram}
                onChange={(e) => setForm({ ...form, linkInstagram: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Link do Google Business / Google Maps (opcional)
              <input
                type="text"
                inputMode="url"
                placeholder="maps.app.goo.gl/..."
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

          <SecaoDivisoria numero="03" titulo="O dia a dia" />
          <p className="text-xs text-paper-dim -mt-2">
            Quanto mais real e detalhada a resposta, melhor o diagnóstico.
            Pode digitar ou apertar o botão de gravar e responder falando, do
            seu jeito.
          </p>

          <CampoTextoComAudio
            label="Como é o seu dia a dia no negócio?"
            ajuda='Ex: quando você começa o dia, quais são as primeiras ações que você toma? Com quem você fala primeiro?'
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

          <SecaoDivisoria numero="04" titulo="Onde você quer chegar" />

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

          <SecaoDivisoria numero="05" titulo="Operação" />

          <CampoTextoComAudio
            label="Quantas pessoas trabalham com você hoje, e quantos clientes/pedidos você atende por mês, mais ou menos?"
            ajuda='Ex: "Somos em 4 pessoas e atendemos cerca de 30 clientes por dia."'
            value={form.tamanhoEquipe}
            onChange={(v) => setForm({ ...form, tamanhoEquipe: v })}
          />

          <CampoTextoComAudio
            label="Por onde os seus clientes chegam e conversam com você hoje?"
            ajuda="Ex: WhatsApp, Instagram Direct, telefone, balcão/presencial, e-mail, site."
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

          <CampoTextoComAudio
            label="Quanto você cobra pelos seus principais serviços ou produtos? (opcional)"
            ajuda='Ex: "corte R$40, barba R$25" ou "consulta de 1h R$150". Com isso, o diagnóstico consegue calcular impacto financeiro real, não só estimativa.'
            value={form.precosServicos}
            onChange={(v) => setForm({ ...form, precosServicos: v })}
          />

          <button
            type="submit"
            disabled={loading}
            className="font-sans font-semibold bg-amber text-ink rounded-md px-6 py-4 mt-2 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? "Gerando diagnóstico real..." : "Ver meu diagnóstico"}
          </button>
          {loading && (
            <p className="text-xs text-paper-dim text-center -mt-3">
              Estamos pesquisando concorrentes reais do seu nicho — pode levar
              até 1 minuto. Não feche esta tela, suas respostas já estão salvas
              de qualquer forma.
            </p>
          )}
        </form>

        {erro && (
          <div className="mt-6 border border-rust/40 bg-rust-dim text-rust rounded-lg p-4 text-sm">
            {erro}
          </div>
        )}

        {resultado && <ResultadoDiagnostico resultado={resultado} form={form} />}

        <footer className="text-center mt-10">
          <Link href="/privacidade" className="text-xs text-paper-dim underline">
            Privacidade e Termos de Uso
          </Link>
        </footer>
      </main>
    </>
  );
}

function StatusReadout() {
  return (
    <div className="flex items-center gap-2 border border-amber-dim rounded-md px-3 py-1.5 self-start">
      <span className="w-1.5 h-1.5 rounded-full bg-mint" />
      <span className="font-mono text-[10px] tracking-widest uppercase text-amber">
        AutoSetup · Diagnóstico gerado
      </span>
    </div>
  );
}

function ResultadoDiagnostico({
  resultado,
  form,
}: {
  resultado: DiagnosticoResultado;
  form: typeof initialForm;
}) {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  async function baixarPdf() {
    setGerandoPdf(true);
    try {
      const { gerarPdfDiagnostico } = await import("@/lib/gerarPdf");
      await gerarPdfDiagnostico({
        nomeNegocio: form.nomeNegocio,
        campos: [
          { label: "Cidade", valor: form.cidade },
          { label: "Nicho", valor: form.nicho },
          { label: "Maior dificuldade", valor: form.maiorDificuldade },
          { label: "Rotina diária", valor: form.rotinaDiaria },
          { label: "O que atrapalha", valor: form.oQueAtrapalha },
          { label: "Sobrecarga", valor: form.sobrecarga },
          { label: "Visão sobre o negócio", valor: form.visaoNegocio },
          { label: "Meta financeira", valor: form.metaFinanceira },
          { label: "Tamanho de equipe", valor: form.tamanhoEquipe },
          { label: "Canais de atendimento", valor: form.canaisAtendimento },
          { label: "Ferramentas atuais", valor: form.ferramentasAtuais },
          { label: "Perda financeira", valor: form.perdaFinanceira },
        ],
        resumo: resultado.resumo,
        pontosFavoraveis: resultado.pontosFavoraveis,
        achadosNaPesquisa: resultado.achadosNaPesquisa,
        oportunidades: resultado.oportunidades,
        proximoPasso: resultado.proximoPasso,
        distanciaAteAMeta: resultado.distanciaAteAMeta,
        planoSeteDias: resultado.planoSeteDias,
      });
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="mt-8 border border-panel-line rounded-xl p-6 flex flex-col gap-6 bg-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusReadout />
        <button
          type="button"
          onClick={baixarPdf}
          disabled={gerandoPdf}
          className="font-mono text-xs text-amber border border-amber-dim rounded-md px-3 py-2 hover:bg-ink disabled:opacity-40 transition-colors"
        >
          {gerandoPdf ? "Gerando PDF..." : "⬇ Baixar PDF"}
        </button>
      </div>

      {resultado.historicoAnterior && resultado.historicoAnterior.length > 0 && (
        <div className="border border-mint/30 bg-mint-dim rounded-lg p-3 text-sm text-mint">
          Reconhecemos você — encontramos {resultado.historicoAnterior.length}{" "}
          diagnóstico(s) anterior(es) com esse WhatsApp. O texto abaixo já leva
          isso em conta.
        </div>
      )}
      <div>
        <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">Resumo</h2>
        <p className="text-sm">{resultado.resumo}</p>
      </div>

      <div className="border-l-2 border-mint pl-4">
        <h2 className="font-mono text-xs tracking-widest uppercase text-mint mb-1">
          Pontos favoráveis
        </h2>
        <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
          {resultado.pontosFavoraveis.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {resultado.achadosNaPesquisa && resultado.achadosNaPesquisa.length > 0 && (
        <div className="border-l-2 border-panel-line pl-4">
          <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
            O que encontramos pesquisando
          </h2>
          <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
            {resultado.achadosNaPesquisa.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-l-2 border-amber pl-4">
        <h2 className="font-mono text-xs tracking-widest uppercase text-amber mb-1">
          Oportunidades
        </h2>
        <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
          {resultado.oportunidades.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
          Próximo passo
        </h2>
        <p className="text-sm">{resultado.proximoPasso}</p>
      </div>

      {resultado.distanciaAteAMeta && (
        <div className="bg-ink rounded-lg p-4 border border-panel-line">
          <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-1">
            Distância até sua meta
          </h2>
          <p className="text-sm">{resultado.distanciaAteAMeta}</p>
        </div>
      )}

      {resultado.comparacaoConcorrentes && (
        <div className="border-l-2 border-rust pl-4">
          <h2 className="font-mono text-xs tracking-widest uppercase text-rust mb-1">
            Você x concorrência
          </h2>
          <p className="text-sm">{resultado.comparacaoConcorrentes.posicionamento}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {resultado.comparacaoConcorrentes.concorrentes.map((c, i) => (
              <li key={i} className="text-sm border border-panel-line rounded-lg p-2 bg-ink">
                <span className="font-mono text-[10px] tracking-widest uppercase text-paper-dim block mb-1">
                  {c.nome}
                </span>
                {c.destaque}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultado.planoSeteDias && resultado.planoSeteDias.length > 0 && (
        <div>
          <h2 className="font-mono text-xs tracking-widest uppercase text-paper-dim mb-2">
            Plano de 7 dias
          </h2>
          <ol className="flex flex-col gap-3">
            {resultado.planoSeteDias.map((item) => (
              <li key={item.dia} className="border border-panel-line rounded-lg p-3 bg-ink">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-amber">
                    Dia {item.dia}
                  </p>
                  {item.prioridade && (
                    <span
                      className={`font-mono text-[9px] tracking-widest uppercase rounded px-2 py-0.5 ${
                        item.prioridade === "alta"
                          ? "bg-rust-dim text-rust"
                          : item.prioridade === "média"
                            ? "bg-panel text-amber border border-amber-dim"
                            : "text-paper-dim"
                      }`}
                    >
                      {item.prioridade}
                    </span>
                  )}
                </div>
                <p className="text-sm">{item.acao}</p>
                {item.conteudoSugerido && (
                  <p className="text-sm mt-2 italic text-paper-dim border-t border-panel-line pt-2">
                    Ideia de conteúdo: {item.conteudoSugerido}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {resultado.codigoDesconto && (
        <div className="border border-mint rounded-lg p-4 bg-mint-dim text-center">
          <p className="text-xs text-mint font-mono tracking-widest uppercase mb-1">
            Você ganhou {resultado.percentualDesconto}% de desconto
          </p>
          <p className="text-sm text-mint mb-2">
            Suas respostas foram detalhadas de verdade — isso vale um desconto
            na assinatura mensal (Essencial ou Completo).
          </p>
          <p className="font-mono text-lg text-mint font-bold tracking-wider">
            {resultado.codigoDesconto}
          </p>
          <p className="text-xs text-mint/70 mt-1">
            Use esse código ao assinar um dos planos mensais.
          </p>
        </div>
      )}

      <BlocoFechamento leadId={resultado.leadId ?? null} codigoDesconto={resultado.codigoDesconto} />
    </div>
  );
}

function BlocoFechamento({ leadId, codigoDesconto }: { leadId: number | null; codigoDesconto?: string | null }) {
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
    <div className="-mx-6 -mb-6 mt-2 bg-ink border-t border-panel-line rounded-b-xl p-6 flex flex-col gap-3">
      <p className="text-sm">
        Esse plano de 7 dias é só o começo — o AutoSetup constrói soluções
        sob medida pra cada negócio, com uma equipe de verdade apoiada por
        IA, evoluindo pra fazer cada vez mais desse trabalho de forma
        automatizada. Nossa equipe produz as artes dos posts/carrosséis com
        base no seu plano, você aprova (ou já manda materiais/fotos que
        quiser usar), e a gente organiza tudo pra você publicar. Isso faz
        parte da consultoria/parceria contratada — hoje é acompanhado por
        gente de verdade, não é automático.
      </p>
      <p className="text-sm">
        Tem um plano de entrada por{" "}
        <Link
          href={codigoDesconto ? `/planos?desconto=${encodeURIComponent(codigoDesconto)}` : "/planos"}
          className="underline text-amber font-semibold"
        >
          R$ 97, sem compromisso mensal
        </Link>
        , se quiser começar leve.
      </p>
      <p className="text-sm font-medium">
        Isso faz sentido pro seu dia a dia e pro seu negócio?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => registrarInteresse("sim")}
          className="font-sans font-semibold rounded-md px-5 py-2.5 text-sm bg-amber text-ink hover:brightness-110 transition-all"
        >
          Sim, quero saber mais
        </button>
        <button
          type="button"
          onClick={() => registrarInteresse("nao")}
          className="font-sans rounded-md px-5 py-2.5 text-sm border border-panel-line text-paper"
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
            className="text-sm underline text-amber"
          >
            Continuar conversa no WhatsApp →
          </a>
        ) : (
          <p className="text-xs text-paper-dim">
            Contato ainda não configurado neste ambiente — fale com quem te
            enviou este link.
          </p>
        ))}
      {interesse === "nao" && (
        <p className="text-xs text-paper-dim">
          Sem problema — o diagnóstico acima já é seu, fique à vontade pra
          voltar quando fizer sentido.
        </p>
      )}
    </div>
  );
}
