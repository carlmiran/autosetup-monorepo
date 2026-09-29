# AutoSetup Connector — Auditoria e prompts para o Claude Code

Salve este arquivo em `docs/prompts/connector-auditoria.md` dentro do monorepo. No Claude Code, peça uma fase por vez:
"Execute a Fase N de docs/prompts/connector-auditoria.md".

Cada fase para antes do push. Você revisa o diff e faz o push manualmente.

---

## Achados da auditoria (feita a partir do histórico do projeto, sem ver o código atual)

Nota de 0 a 10: quanto maior, mais urgente. Onde está escrito "verificar", o risco é provável, mas o Claude Code precisa confirmar no código antes de corrigir.

| # | Área | Achado | Nota |
|---|------|--------|------|
| A1 | Produto | Os dados sincronizados não alimentam nada. LENS e dashboard leem `reservas`/`hospedes`, não as tabelas do grid diário. O cliente instala e não vê resultado. Foi exatamente essa a objeção do piloto ("você não está construindo nada"). | 10 |
| S1 | Segurança | Códigos de pareamento previsíveis (ex.: `NEGOCIO-001`) somados a um `/parear` sem limite de tentativas permitem que alguém adivinhe códigos e pareie como outro cliente. Verificar o formato gerado pelo `/admin/connector` e se há rate limit. | 9 |
| S2 | Segurança | Upload de arquivos: verificar limite de tamanho, lista de extensões permitidas, proteção contra zip bomb (xlsx é um zip) e nome de arquivo usado como chave no R2 (path traversal). | 9 |
| S3 | Segurança | Autenticação do admin: verificar se o `CONNECTOR_ADMIN_SECRET` trafega em header (não em query string, que fica nos logs), se a comparação é em tempo constante e se há limite de tentativas. | 8 |
| G1 | Genericidade | Nomes de cliente real ainda no produto (varredura já pedida). Tabelas e colunas com vocabulário de hospedagem (`ocupacao_diaria`, `hospedes_observados`, `anotacoes_faturamento`). | 8 |
| S4 | Segurança | Token do dispositivo após o pareamento: verificar como fica guardado no PC do cliente (texto puro em %APPDATA%?), se tem validade e se o `/revogar` invalida de verdade. | 7 |
| S5 | Escopo | O agente só pode ler a pasta autorizada. Verificar se ele segue atalhos, symlinks ou junctions que apontam para fora dela, e se ignora arquivos temporários do Excel (`~$*.xlsx`) e ocultos. | 7 |
| R1 | Confiabilidade | O Excel salva em etapas (arquivo temporário e depois renomeia). Sem espera (debounce) e sem checar se o arquivo está travado, o agente envia arquivo pela metade. | 7 |
| R2 | Confiabilidade | Sem internet: verificar se existe fila local com nova tentativa. Sem isso, a alteração se perde. | 7 |
| L1 | LGPD | Planilhas trazem dados pessoais de terceiros (clientes do cliente). Verificar retenção no R2 (ficam para sempre?), apagamento ao revogar, e se a Política de Privacidade menciona o Connector e o papel do AutoSetup como operador. | 7 |
| R3 | Confiabilidade | Idempotência: o mesmo arquivo salvo 5 vezes sem mudança não deve gerar 5 processamentos. Deduplicar por hash. | 6 |
| O1 | Operação | Sem heartbeat ou "visto por último", você não sabe se o agente parou em algum cliente. | 6 |
| O2 | Operação | Sem mecanismo de atualização, corrigir um bug exige reinstalar em cada máquina. No mínimo: o agente informa a versão e o backend avisa quando está desatualizado. | 6 |
| O3 | Operação | Arquivos `UNKNOWN_FORMAT` precisam aparecer no `/admin/connector`. Eles são a fila de parsers futuros (ex.: tabular Data/Nº pessoas/Valor/Total). | 5 |
| O4 | Operação | O alerta de erro sai por `onboarding@resend.dev` porque o domínio `autosetup.digital` não foi verificado na Resend. Serve para teste, não para produção. | 4 |
| C1 | Confiança | Instalador sem assinatura digital: o Windows mostra "O Windows protegeu o computador", e antivírus às vezes bloqueiam binários Go. Assinar custa dinheiro (decisão sua). Sem custo: publicar o SHA-256 na página de download e ter um guia com prints de "Mais informações → Executar assim mesmo". | 5 |
| E1 | Estrutura | Agente e instalador ficam em `_connector/`, fora do padrão do monorepo. Mover para `apps/connector-agent/`. | 3 |

Ordem das fases: limpeza e segurança primeiro (S1, S2 e S3 podem ser exploradas assim que o link de download estiver no ar), depois confiabilidade, depois LGPD e, por fim, a entrega de valor (A1), que é o que faz o cliente perceber o Connector.

---

## Regras que valem para todas as fases

```
Regras permanentes (copie para o CLAUDE.md se ainda não estiverem lá):
- O Connector é genérico: qualquer nicho, qualquer empresa. Ele analisa documentos
  numa pasta autorizada do computador do administrador de um pequeno negócio.
  Nenhum nome de cliente real no código, nos testes, nos fixtures, nos docs ou nos binários.
- Consentimento nunca é pré-preenchido nem automático, nem em instalação remota.
  Só configuração (código de pareamento, pasta) pode vir pronta.
- O parser nunca inventa dado. Na dúvida, UNKNOWN_FORMAT.
- Nunca peça, leia, imprima ou grave valores de secrets. Diga ao Carlos onde cadastrar.
- Nunca faça push. Pare com o diff e um resumo.
- Não relaxe teste nem regra de lint para fazer algo passar.
- Migrations no D1 são incrementais, com IF NOT EXISTS / ADD COLUMN, e nunca apagam dados
  sem aprovação explícita do Carlos.
```

---

## Fase 0 — Limpeza de nomes (se ainda não foi feita)

```
Execute a varredura de genericidade:
1. grep -ri no repo inteiro (código, comentários, testes, fixtures, docs, .iss, scripts,
   CLAUDE.md) por: fabio, casa-fabio, casa-do-fabio, dorgival, e nomes de quartos/guias
   usados nos testes antigos. Liste tudo antes de mudar.
2. Substitua por exemplos neutros (NEGOCIO-001, empresa-exemplo). Em docs históricos,
   use "cliente piloto". Fixtures com dado real: troque por dado sintético equivalente
   e me avise se algum arquivo real de cliente foi commitado.
3. Instalador: /DInstanceName=principal como padrão. Apague os builds -sede e -anexo.
4. Recompile o agente (GOOS=windows GOARCH=amd64 CGO_ENABLED=0), confirme grep = 0 no
   binário, recompile o instalador genérico e informe SHA-256 e tamanho.
5. No D1 (--remote), só LISTE as linhas com esses nomes. Não apague.
6. Rode os testes. Commit sem push.
```

---

## Fase 1 — Auditoria somente leitura (não altera nada)

```
Faça uma auditoria somente leitura do Connector: apps/core/worker-connector, as rotas
/admin/connector e /api/admin/connector/*, /downloads, o agente Go e o instalador.
NÃO altere nenhum arquivo.

Para cada item abaixo, responda: CONFIRMADO (problema existe) / OK (já tratado) /
NÃO SE APLICA, citando arquivo:linha como evidência.

S1  Formato dos códigos de pareamento gerados pelo /admin/connector (aleatório ou
    sequencial? quantos bits de entropia?), validade, uso único, rate limit no /parear.
S2  Upload: limite de tamanho, allowlist de extensão e de MIME, proteção contra zip bomb
    no parse de xlsx (tamanho descompactado, número de entradas), sanitização do nome
    usado como chave no R2.
S3  Admin: onde o CONNECTOR_ADMIN_SECRET é lido (header/cookie/query), se a comparação
    é em tempo constante, se há rate limit, se a resposta de erro vaza detalhes.
S4  Token do dispositivo: como é gerado, onde fica no Windows, se é criptografado (DPAPI?),
    validade, e se /revogar impede syncs seguintes (mostre o teste, se houver).
S5  Escopo do agente: segue symlinks/junctions/atalhos? ignora ~$*, ocultos, temporários?
    tem allowlist de extensão no lado do agente também?
R1  Debounce após evento de arquivo e checagem de arquivo travado pelo Excel.
R2  Fila local offline com retry/backoff. O que acontece se o PC ficar 3 dias sem internet?
R3  Deduplicação por hash de conteúdo, no agente e/ou no backend.
L1  Retenção dos arquivos brutos no R2, o que acontece com os dados ao revogar, e se
    /privacidade menciona o Connector.
O1  Existe heartbeat / last_seen por conector?
O2  O agente envia a versão? O backend compara com uma versão mínima?
O3  UNKNOWN_FORMAT fica registrado e visível em algum lugar?
O4  Remetente de e-mail de alerta atual.
G1  Tabelas e colunas com vocabulário de hospedagem, e quem as lê.
A1  Qual parte do produto (LENS, dashboard, relatório) lê os dados sincronizados hoje?

Entregue:
1. Tabela: item | status | evidência | risco em 1 frase | esforço (P/M/G).
2. Qualquer problema grave fora da lista.
3. Proposta de ordem de correção.
Pare aí e espere minha aprovação.
```

---

## Fase 2 — Segurança (S1, S2, S3, S4, S5)

```
Corrija só os itens de segurança marcados como CONFIRMADO na Fase 1.

S1  Códigos de pareamento: gerar com crypto.getRandomValues, formato legível sem
    caracteres ambíguos (ex.: XXXX-XXXX-XXXX, sem 0/O/1/I), no mínimo 60 bits.
    Uso único, validade padrão de 7 dias (configurável no /admin/connector).
    Rate limit no /parear por IP (ex.: 10 tentativas/hora) com resposta genérica
    igual para código inexistente, expirado ou já usado.
    Códigos antigos no D1: não apague. Me liste para eu decidir.
S2  Upload: limite de tamanho (proponha um valor com base nos arquivos de teste),
    allowlist .xlsx/.xls/.csv, rejeição de xlsx com tamanho descompactado acima de um
    limite ou número excessivo de entradas, chave do R2 gerada pelo servidor
    (connector_id/data/uuid.ext), nunca o nome original. O nome original vai só como metadado.
S3  Admin: secret só por header ou cookie HttpOnly+Secure+SameSite=Strict, comparação em
    tempo constante, rate limit de login, mensagem de erro genérica.
S4  Token: guardar no Windows com DPAPI (escopo do usuário), com validade, e o /revogar
    faz o próximo sync falhar com mensagem clara no agente.
S5  Agente: não seguir symlinks/junctions/.lnk, ignorar ~$*, arquivos ocultos e
    temporários, allowlist de extensão também no agente.

Para cada correção, crie um teste que falhava antes e passa depois.
Recompile o agente e o instalador se o Go mudou (grep de nomes de cliente = 0 no binário).
Rode todos os testes. Commit por item (um commit por S#). Sem push.
Relatório: o que mudou, testes, e qualquer impacto para quem já está instalado.
```

---

## Fase 3 — Confiabilidade (R1, R2, R3, O1, O2)

```
Corrija os itens de confiabilidade e operação marcados como CONFIRMADO.

R1  Debounce de alguns segundos após o último evento no arquivo. Antes de enviar, tente
    abrir em modo exclusivo. Se estiver travado, espere e tente de novo.
R2  Fila local persistente (arquivo na pasta de dados da instância) com retry e backoff
    exponencial e limite de tamanho. Ao voltar a internet, envia em ordem.
R3  Hash SHA-256 do conteúdo. O agente não reenvia hash igual ao último enviado com
    sucesso. O backend também ignora hash já processado para o mesmo conector (idempotência).
O1  Heartbeat leve (ex.: a cada 6h) atualizando last_seen e a versão. Mostrar no
    /admin/connector: último contato, versão, último arquivo, último erro.
    Marcar em vermelho quem está sem contato há mais de 48h.
O2  O agente envia a versão em todo request. O backend tem MIN_AGENT_VERSION (var, não
    secret). Abaixo disso, responde com um aviso que o agente mostra ao usuário, com
    link para /downloads. Sem auto-update silencioso nesta fase.

Testes para cada item (simule Excel travado, rede fora, mesmo arquivo salvo 3 vezes).
Recompile, confirme grep = 0, commit por item, sem push.
```

---

## Fase 4 — LGPD e transparência (L1, O3, O4, C1)

```
L1  Retenção: arquivo bruto no R2 é apagado depois de processado com sucesso e mantido
    no máximo N dias em caso de erro (proponha N). Os dados estruturados ficam no D1.
    Ao revogar um conector: apagar os brutos do R2 na hora e marcar os dados estruturados
    para exclusão, com uma confirmação no /admin/connector antes de apagar de fato.
    Registrar a versão dos termos aceita junto do consentimento_em.
    Escreva o trecho para /privacidade explicando o Connector (o que lê, o que não lê,
    onde guarda, por quanto tempo, como pedir exclusão) e me mostre antes de publicar.
O3  Lista de UNKNOWN_FORMAT no /admin/connector: conector, nome do arquivo, data,
    estrutura detectada (cabeçalhos, sem conteúdo de células). Serve de fila de parsers.
O4  Deixe o remetente dos alertas configurável por var (ALERT_EMAIL_FROM) e escreva um
    passo a passo para eu verificar o domínio autosetup.digital na Resend (DNS).
    Não mude o remetente atual até eu confirmar a verificação.
C1  Página /downloads: mostrar o SHA-256 e o tamanho do instalador, requisitos
    (Windows 10/11 64-bit), e um guia curto com texto para o aviso do SmartScreen.
    Não compre nem configure certificado de assinatura. Isso é decisão minha.

Testes, commit por item, sem push.
```

---

## Fase 5 — Genericidade do schema e entrega de valor (G1, A1)

```
Objetivo: o cliente instala o Connector e passa a ver um resultado.

G1  Proponha nomes neutros para as tabelas e colunas com vocabulário de hospedagem
    (ex.: ocupacao_diaria → registros_diarios, hospedes_observados → pessoas_observadas,
    anotacoes_faturamento → anotacoes_financeiras). Me mostre a proposta antes.
    Depois de aprovada: migration incremental que cria as tabelas novas, copia os dados,
    mantém as antigas por enquanto e troca leitura e escrita no código. Nada é apagado
    nesta fase.
A1  Crie um resumo automático por conector a partir dos dados sincronizados:
    - totais do período (valor, quantidade), comparação com o período anterior,
      dias/itens de maior e menor movimento, lacunas (dias sem registro).
    - só números calculados do dado real; texto gerado pela IA pode explicar, nunca
      inventar número (mesmo princípio do parser).
    Mostre esse resumo (a) numa tela para o cliente, protegida pelo mesmo mecanismo de
    acesso já usado para clientes, ou proponha um, e (b) como insumo do LENS/Raio-X
    quando o cliente tiver Connector ativo.
    Teste com dados sintéticos de dois nichos diferentes (ex.: hospedagem e salão),
    para provar que o resumo não depende do nicho.

Commit por item, sem push. Relatório com prints ou descrição das telas.
```

---

## Depois de cada fase (você)

1. `! git log origin/main..main --oneline`: confira os commits.
2. Rode antes as migrations e cadastre os secrets que a fase pediu.
3. `! git push origin main` e espere o build verde no painel da Cloudflare.
4. Peça: "Repita a tabela de testes de produção do Connector".
