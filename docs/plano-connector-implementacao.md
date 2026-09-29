# AutoSetup Connector — Plano de Implementação (para Claude Code)

**Objetivo:** construir e colocar em produção a V1 real do Connector, com a Casa do Fábio como primeiro uso real (não é piloto de validação manual — é o produto de verdade, desde o início).

**Restrições de design que valem para TODO o pacote (não reabrir essas decisões sem motivo técnico novo):**
- Agente em **Go**, não Electron/Node.
- Roda como **processo de usuário com ícone na bandeja**, NÃO como Serviço Windows.
- Envia o **arquivo bruto** para o R2 e processa no servidor (Opção A) — o agente não faz parsing de planilha.
- **Sem autoatualização remota** nesta fase — reinstalação manual quando precisar.
- **Sem assinatura de código** nesta fase — o instalador vai gerar aviso do SmartScreen, contornável manualmente no piloto.
- Reaproveitar ao máximo a infraestrutura já existente (Cloudflare Workers, D1, R2, Queues, padrão multi-tenant, Resend para alertas).

---

## Passo 1 — Schema de dados da vertical Hospedagem

Definir antes de qualquer parser. Proposta inicial (ajustável conforme a planilha real do Fábio quando chegar):

**Reservas** (`reservas.xlsx`)
| Campo | Tipo | Obrigatório |
|---|---|---|
| hospede_nome | texto | sim |
| checkin | data | sim |
| checkout | data | sim |
| quarto | texto | sim |
| valor_total | número | sim |
| status | enum (confirmada/cancelada/pendente) | sim |
| origem | texto (WhatsApp/telefone/indicação) | não |

**Hóspedes** (`hospedes.xlsx`)
| Campo | Tipo | Obrigatório |
|---|---|---|
| nome | texto | sim |
| contato | texto | não |
| cidade_origem | texto | não |

**Quartos** (`quartos.xlsx`)
| Campo | Tipo | Obrigatório |
|---|---|---|
| identificador | texto | sim |
| capacidade | número | sim |
| tipo | texto | não |

**Tarifas** (`tarifas.xlsx`)
| Campo | Tipo | Obrigatório |
|---|---|---|
| quarto_ou_tipo | texto | sim |
| valor_diaria | número | sim |
| periodo_vigencia | texto/data | não |

Parser deve procurar essas colunas por **nome de cabeçalho** (case-insensitive, tolerante a acento/espaço), não por posição fixa — mais resiliente a pequenas variações na planilha real sem virar parser genérico "adivinhador".

---

## Passo 2 — Tabela `connectors` no D1

```sql
CREATE TABLE connectors (
  connector_id TEXT PRIMARY KEY,       -- UUID gerado na instalação
  property_id TEXT NOT NULL,           -- vincula à empresa (Casa do Fábio)
  token_hash TEXT NOT NULL,            -- nunca guardar token em texto plano
  pasta_autorizada TEXT,               -- caminho local, informativo
  status TEXT DEFAULT 'ativo',         -- ativo | pausado | revogado
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultimo_heartbeat DATETIME
);
```

Tabelas de dado estruturado (uma por tipo de arquivo do Passo 1), todas com `property_id` para isolamento multi-tenant: `reservas`, `hospedes`, `quartos`, `tarifas`.

---

## Passo 3 — Endpoint de pareamento

`POST /api/connector/parear`
- Recebe: `codigo_pareamento` (gerado manualmente por vocês para a Casa do Fábio, ex. `CASA-FABIO-001`).
- Gera `connector_id` (UUID) + token de longa duração.
- Grava na tabela `connectors`, associado ao `property_id` correspondente.
- Retorna o token ao Connector (única vez — o agente salva local, criptografado).

---

## Passo 4 — Endpoint de sincronização + fila

`POST /api/connector/sync`
- Autentica via token (header `Authorization`).
- Recebe o arquivo (multipart) + hash SHA-256 declarado pelo agente.
- Grava o arquivo bruto no R2 (`connector-uploads/{property_id}/{filename}-{hash}`).
- Enfileira job no Cloudflare Queue com `{connector_id, property_id, r2_key, filename}`.
- Atualiza `ultimo_heartbeat` da conexão.
- Responde rápido (não espera o processamento) — o parsing acontece assíncrono no consumidor da fila.

---

## Passo 5 — Consumidor da fila (parser)

- Lê o job, baixa o arquivo do R2.
- Identifica o tipo pelo nome do arquivo/pasta de origem (`reservas.xlsx` → schema Reservas etc.).
- Extrai os campos definidos no Passo 1, valida obrigatórios.
- Grava linhas na tabela estruturada correspondente (upsert por combinação natural, ex. hospede+checkin+quarto para Reservas, evitando duplicar em re-sincronizações).
- Em caso de erro de parsing (coluna esperada ausente): não falha silenciosamente — grava log de erro associado ao `property_id`, dispara alerta por e-mail (Resend) para vocês revisarem.
- Ao final, opcionalmente dispara regeneração do diagnóstico LENS daquela property com o dado atualizado.

---

## Passo 6 — Agente Connector (Go)

Componentes:
- **Watcher**: `fsnotify`, recursivo na pasta autorizada e subpastas, filtrando extensões permitidas (`.xlsx`, `.csv`).
- **Hash**: SHA-256 por arquivo, comparado com o último hash enviado (guardado em cache local) — só envia se mudou.
- **Fila local**: arquivo/SQLite simples para persistir uploads pendentes se estiver offline; retry com backoff exponencial ao reconectar.
- **Credencial**: token salvo via Windows Credential Manager (DPAPI), nunca em arquivo de config em texto plano.
- **Bandeja (system tray)**: ícone com menu — status (última sincronização, pasta monitorada, para qual empresa), botão "Pausar", botão "Abrir pasta", botão "Sair".
- **Primeira execução**: fluxo de pareamento — pede o código de pareamento (`CASA-FABIO-001`), pede a pasta a monitorar, chama o endpoint do Passo 3, salva token.
- **Confirmação de escopo (transparência)**: na primeira sincronização, listar os arquivos encontrados na pasta antes de enviar e pedir confirmação ao usuário (uma vez, não a cada sync).

---

## Passo 7 — Instalador (Inno Setup)

- Instala o binário + registra entrada `Run` no registro para início automático.
- Roda o fluxo de pareamento na primeira abertura (não durante a instalação — deixa o app cuidar disso).
- Gera desinstalador padrão que remove binário, entrada de registro, e chama endpoint de revogação (`status = revogado` na tabela `connectors`) antes de sair.
- Aceite explícito de termos na primeira execução (o que é monitorado, para onde vai, como parar) — texto simples, não jurídico pesado, coerente com o que já existe em `/radar/termos`.

---

## Passo 8 — Piloto real com o Fábio

- Gerar `codigo_pareamento` para Casa do Fábio no D1.
- Orientar (por telefone/WhatsApp, dado o perfil dele) a criar a pasta com subpastas por assunto (Reservas/Hóspedes/Quartos/Tarifas) e mover os arquivos existentes para lá.
- Acompanhar a instalação com ele (guiar o "Executar assim mesmo" do SmartScreen).
- Confirmar primeira sincronização e conferir no D1 que os dados chegaram estruturados corretamente.
- Verificar se o diagnóstico do LENS, regenerado com esse dado, faz sentido e agrega frente ao diagnóstico baseado só em formulário.

---

## Ordem de execução recomendada

Passos 1→2→3→4→5 (backend, tudo em Cloudflare/D1, reaproveitando o monorepo existente) podem ser feitos e testados de ponta a ponta com um arquivo de teste **antes** de escrever uma linha do agente Go. Só depois entra o Passo 6 (agente), 7 (instalador), 8 (piloto). Isso evita depurar o agente Windows e o pipeline de nuvem ao mesmo tempo.
