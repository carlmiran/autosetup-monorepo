# Plano — Serviço de Vídeo + Canal-Portfólio (não ativado)

**Status**: Planejamento aprovado por Carlos, **implementação/gasto real
ainda NÃO autorizados** (29/07/2026). Não colocar no `/planos` ao vivo
nem gerar cobrança até este documento ser marcado como "Aprovado para
execução".

## Motivação

Concorrência da AutoSetup Digital (agência de Carlos) já oferece vídeo.
Ideia: (1) oferecer vídeo como add-on pago dentro dos planos existentes,
e (2) criar um canal-portfólio multi-nicho ("dark channel", sem
identidade pessoal) que sirva de catálogo vivo — clientes em potencial
veem exemplos por nicho e encomendam uma versão pro próprio negócio.

## Pesquisa de mercado (feita em 29/07/2026, dados reais)

Preço por segundo de vídeo gerado por IA, mercado de julho/2026:

| Opção | Preço/segundo (R$) | Perfil |
|---|---|---|
| Econômico (Kling, Wan) | ~0,35–0,70 | Boa qualidade, mais barato |
| Meio-termo (Sora 2, Veo Fast) | ~0,50–1,50 | Qualidade maior, áudio nativo em alguns |
| Topo de linha (Veo Standard) | ~2,00–4,00 | Cinematográfico, 4K |

**Realidade de produção**: raramente sai bom na primeira tentativa —
prática de mercado é contar 2-3 gerações por vídeo final. Um vídeo de
20-30s na opção econômica sai por **R$15-65** já considerando retrabalho.

**Provider recomendado por Claude**: Kling 3.0 — melhor custo-benefício,
sem trava de acesso corporativo, boa consistência de movimento (
importante pra vídeo de pessoa/produto em close).

## O que falta tecnicamente (nenhum implementado ainda)

1. Conta própria no provider escolhido + chave de API — **Carlos precisa
   criar**, mesma regra de sempre: nunca passar a chave por chat, colar
   direto no painel de secrets da Cloudflare quando chegar a hora.
2. Costurar múltiplos clipes (a maioria dos modelos gera só 5-10s por
   vez) em um vídeo final com transição/legenda/trilha — **Cloudflare
   Workers não roda edição de vídeo nativamente**, precisa de serviço
   externo pra essa etapa. Não pesquisado a fundo ainda — próximo passo
   se o teste inicial for aprovado.
3. Canal do YouTube: precisa ser criado (conta Google + branding —
   reaproveitar a logo achatada já construída), e qualquer vídeo gerado
   por IA publicado lá **precisa ser sinalizado como conteúdo sintético**
   — exigência de política do YouTube, não opcional.

## Precificação planejada (não ativa)

- **Vídeo avulso** (1 reel/short, 15-30s): R$197 — cobre custo de
  geração + curadoria/edição da equipe, com margem real sobre o custo
  de ~R$15-65 por vídeo.
- **Pacote 4 vídeos/mês**: R$697/mês — desconto por volume, upsell pra
  quem já está no plano Completo (R$797/mês).
- Vídeo NÃO incluso de graça em nenhum plano — custo por unidade alto
  demais pra empacotar sem validar primeiro.

## Ordem de execução, quando Carlos aprovar o gasto

1. Carlos cria conta no Kling, decide orçamento de teste.
2. Gerar 3-5 vídeos de exemplo, multi-nicho (barbearia, estética,
   oficina — mesmos nichos já testados no diagnóstico), manualmente
   (direto no site do provider, sem código ainda) — mesma disciplina já
   usada antes (validar manual antes de automatizar).
3. Avaliar qualidade real antes de decidir se vale construir pipeline
   automatizado.
4. Só depois disso: criar o canal do YouTube, subir os exemplos, e
   então sim adicionar a oferta de vídeo no `/planos` ao vivo.
5. Pipeline automatizado (geração + costura + publicação) só entra em
   pauta depois do teste manual validar que o resultado é bom o
   suficiente pra vender.
