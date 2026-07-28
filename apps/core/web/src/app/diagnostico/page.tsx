"use client";

// AUTOSETUP — apps/core/web/src/app/diagnostico/page.tsx
// Página real de diagnóstico self-service (LENS). Fonte: Constitutional
// Principle #24-25 — nenhum dado de exemplo é mostrado como se fosse
// real; tudo que aparece no resultado vem do que a própria pessoa
// digitou aqui, processado por IA real via /api/diagnostico.

import { useState } from "react";

interface DiagnosticoResultado {
  resumo: string;
  pontosFavoraveis: string[];
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
}

const initialForm = {
  nomeNegocio: "",
  cidade: "",
  nicho: "",
  temSite: false,
  temInstagram: false,
  temGoogleBusiness: false,
  numeroAvaliacoesGoogle: "",
  notaMediaGoogle: "",
  maiorDificuldade: "",
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
      const data = await res.json();
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
        Responda com os dados reais do seu negócio. A análise abaixo é gerada
        a partir exatamente do que você informar aqui — nada é inventado.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome do negócio
          <input
            required
            className="border rounded px-3 py-2"
            value={form.nomeNegocio}
            onChange={(e) => setForm({ ...form, nomeNegocio: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Cidade
          <input
            required
            className="border rounded px-3 py-2"
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nicho (ex: barbearia, estética, oficina mecânica)
          <input
            required
            className="border rounded px-3 py-2"
            value={form.nicho}
            onChange={(e) => setForm({ ...form, nicho: e.target.value })}
          />
        </label>

        <div className="flex gap-4 flex-wrap text-sm">
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

        <label className="flex flex-col gap-1 text-sm">
          Qual sua maior dificuldade hoje pra atrair ou converter clientes?
          <textarea
            required
            className="border rounded px-3 py-2"
            rows={3}
            value={form.maiorDificuldade}
            onChange={(e) => setForm({ ...form, maiorDificuldade: e.target.value })}
          />
        </label>

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
        </div>
      )}
    </main>
  );
}
