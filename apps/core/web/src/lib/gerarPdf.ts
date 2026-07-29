// AUTOSETUP — src/lib/gerarPdf.ts
// Gera o PDF real do diagnóstico (perguntas + respostas + análise), no
// navegador da própria pessoa — via pdf-lib, pura JS, sem depender de
// nenhum serviço externo. Fonte: pedido de Carlos (29/07/2026).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface CampoPdf {
  label: string;
  valor: string;
}

interface DadosPdf {
  nomeNegocio: string;
  campos: CampoPdf[];
  resumo: string;
  pontosFavoraveis: string[];
  achadosNaPesquisa: string[];
  oportunidades: string[];
  proximoPasso: string;
  distanciaAteAMeta?: string;
  planoSeteDias: { dia: number; acao: string; conteudoSugerido?: string | null }[];
}

const MARGEM = 50;
const LARGURA_PAGINA = 595.28; // A4
const ALTURA_PAGINA = 841.89;
const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;

function quebrarLinha(texto: string, tamanho: number, fonte: { widthOfTextAtSize: (t: string, s: number) => number }, larguraMax: number): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let linhaAtual = "";
  for (const palavra of palavras) {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMax && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = tentativa;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

export async function gerarPdfDiagnostico(dados: DadosPdf): Promise<void> {
  const doc = await PDFDocument.create();
  const fonteRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fonteBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let pagina = doc.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
  let y = ALTURA_PAGINA - MARGEM;

  const corAmbar = rgb(0.878, 0.663, 0.251);
  const corTexto = rgb(0.1, 0.1, 0.1);
  const corCinza = rgb(0.45, 0.45, 0.45);

  function novaPaginaSeNecessario(espacoNecessario: number) {
    if (y - espacoNecessario < MARGEM) {
      pagina = doc.addPage([LARGURA_PAGINA, ALTURA_PAGINA]);
      y = ALTURA_PAGINA - MARGEM;
    }
  }

  function titulo(texto: string, tamanho = 13) {
    novaPaginaSeNecessario(tamanho + 14);
    pagina.drawText(texto, { x: MARGEM, y, size: tamanho, font: fonteBold, color: corAmbar });
    y -= tamanho + 10;
  }

  function paragrafo(texto: string, tamanho = 10, cor = corTexto) {
    const linhas = quebrarLinha(texto, tamanho, fonteRegular, LARGURA_UTIL);
    for (const linha of linhas) {
      novaPaginaSeNecessario(tamanho + 4);
      pagina.drawText(linha, { x: MARGEM, y, size: tamanho, font: fonteRegular, color: cor });
      y -= tamanho + 4;
    }
    y -= 6;
  }

  function item(texto: string) {
    paragrafo(`•  ${texto}`, 10);
  }

  // Cabeçalho
  pagina.drawText("AutoSetup", { x: MARGEM, y, size: 20, font: fonteBold, color: corAmbar });
  y -= 26;
  pagina.drawText(`Diagnostico — ${dados.nomeNegocio}`, { x: MARGEM, y, size: 13, font: fonteRegular, color: corTexto });
  y -= 16;
  pagina.drawText(new Date().toLocaleDateString("pt-BR"), { x: MARGEM, y, size: 9, font: fonteRegular, color: corCinza });
  y -= 28;

  // Perguntas e respostas
  titulo("Suas respostas");
  for (const campo of dados.campos) {
    if (!campo.valor.trim()) continue;
    novaPaginaSeNecessario(24);
    pagina.drawText(campo.label, { x: MARGEM, y, size: 9, font: fonteBold, color: corCinza });
    y -= 13;
    paragrafo(campo.valor, 10);
  }

  y -= 8;
  titulo("Resumo");
  paragrafo(dados.resumo);

  if (dados.pontosFavoraveis.length > 0) {
    titulo("Pontos favoraveis", 12);
    dados.pontosFavoraveis.forEach(item);
  }

  if (dados.achadosNaPesquisa.length > 0) {
    titulo("O que encontramos pesquisando", 12);
    dados.achadosNaPesquisa.forEach(item);
  }

  if (dados.oportunidades.length > 0) {
    titulo("Oportunidades", 12);
    dados.oportunidades.forEach(item);
  }

  titulo("Proximo passo", 12);
  paragrafo(dados.proximoPasso);

  if (dados.distanciaAteAMeta) {
    titulo("Distancia ate sua meta", 12);
    paragrafo(dados.distanciaAteAMeta);
  }

  if (dados.planoSeteDias.length > 0) {
    titulo("Plano de 7 dias", 12);
    for (const diaItem of dados.planoSeteDias) {
      paragrafo(`Dia ${diaItem.dia}: ${diaItem.acao}`, 10);
      if (diaItem.conteudoSugerido) {
        paragrafo(`   Ideia de conteudo: ${diaItem.conteudoSugerido}`, 9, corCinza);
      }
    }
  }

  const bytes = await doc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `diagnostico-${dados.nomeNegocio.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
