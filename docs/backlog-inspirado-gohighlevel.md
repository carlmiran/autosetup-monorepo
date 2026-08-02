# Backlog — Melhorias Inspiradas na GoHighLevel

**Status**: Backlog priorizado, **gated atrás do feature freeze** (ver
`docs/cronograma-mestre.md`). Nada aqui entra em construção antes de
bater os 10 primeiros clientes pagantes do público atual. Fonte:
Carlos, 31/07/2026, a partir de comparação com a GoHighLevel
(plataforma de CRM/automação/funil pra agências, US$97-497/mês).

## Por que gated, não "próximo passo"

O feature freeze em vigor libera só melhorias em LENS/Comercial/
Conversão/Pagamento/Onboarding. As funcionalidades abaixo são
operacionais (CRM, automação configurável) — servem pra *gerenciar*
cliente já conquistado, não pra *conquistar* o primeiro. Construir isso
antes da primeira venda repetiria o padrão já corrigido várias vezes
nesta sessão.

## Backlog, em ordem de prioridade quando o freeze for liberado

1. **CRM com interface real** — hoje `leads`/`pagamentos` são só
   tabelas cruas no D1, sem tela de gestão. Prioridade mais alta deste
   backlog porque é a peça que mais rápido vira operação diária usável
   assim que houver clientes de verdade pra gerenciar.
2. **Pipeline visual** — estágios do funil (lead → diagnóstico →
   proposta → cliente), hoje só existe implicitamente no banco.
3. **Reputation monitoring contínuo** — o LENS já *lê* avaliação/nota
   real via Google Places; falta o monitoramento contínuo (verificar
   de novo periodicamente, avisar quando mudar) — extensão natural do
   que já existe, não construção do zero.
4. **Workflow builder configurável** — hoje toda automação é código
   fixo (ex: o fluxo do diagnóstico é hardcoded). Um builder visual
   ("form preenchido → espera X → manda mensagem Y") é grande esforço,
   fica por último deste backlog.
5. **Modo white-label / revenda** — conceitualmente parecido com o
   programa de indicadores já construído (`?ref=`, split de comissão),
   mas pra agências revenderem o AutoSetup com marca própria — variação
   do modelo de indicador, não uma peça nova do zero.
6. **Snapshots por nicho** — pacote de configuração replicável por
   nicho. Menor prioridade: o LENS já cobre parte dessa necessidade de
   forma mais flexível (perguntas geradas por IA na hora, por nicho,
   não pacote fixo pré-montado).

## O que NÃO está nesta lista

Funil/site builder genérico e voice AI/atendimento por voz não entraram
— o funil do AutoSetup é intencionalmente simples (diagnóstico → planos
→ checkout) e não precisa virar um builder genérico agora; atendimento
por voz é uma extensão distante do que já está bloqueado (WhatsApp
automatizado, que já depende de CNPJ/Meta).
