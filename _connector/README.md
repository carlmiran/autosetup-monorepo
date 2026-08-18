# AutoSetup Connector — V1

Implementação dos Passos 1–8 do plano. Estrutura:

```
connector/
  backend/       Passos 1–5 + revogação (Cloudflare Worker)
  agent-go/      Passo 6 (agente Windows) — já cross-compilado em autosetup-connector.exe
  installer/     Passo 7 (Inno Setup)
```

Typecheck do backend (`npx tsc --noEmit`) e build do agente para
`GOOS=windows GOARCH=amd64` (sem cgo) passaram limpos. **Nada disso foi
testado contra Cloudflare/D1 reais** — não tenho acesso ao seu monorepo
nem à sua conta Cloudflare, então tudo abaixo é o que falta para ir do
código para produção.

---

## 1. Backend — o que integrar antes de rodar

`backend/wrangler.toml` está com placeholders. Duas opções:

- **Se já existe um Worker do AutoSetup Core**: não crie um Worker
  novo — copie só `src/routes/*.ts`, `src/lib/schemas.ts`,
  `src/queue-consumer.ts` e `src/env.ts` para dentro do Worker
  existente, plugue as 3 rotas no roteador que já existe, e mescle os
  bindings (`DB`, `CONNECTOR_UPLOADS`, `SYNC_QUEUE`) com os que já
  estão configurados lá.
- **Se for um Worker novo**: preencha `database_id`, `bucket_name` e
  crie a queue `connector-sync-queue` (`wrangler queues create
  connector-sync-queue`), depois `database_id` real com `wrangler d1
  list`.

Depois:

```bash
cd backend
npm install
wrangler d1 execute <DB_NAME> --file=./schema.sql   # roda o Passo 1+2
wrangler secret put RESEND_API_KEY
wrangler deploy
```

Habilite `ALERT_EMAIL_TO` (e-mail que recebe alerta de erro de
parsing) — hoje só está referenciado no `wrangler.toml` como
comentário, adicione em `[vars]` ou via secret.

`LENS_REFRESH_URL` é opcional e fica sem efeito (não quebra nada) se
você não configurar — não inventei o contrato real do endpoint de
regeneração do LENS porque não tenho essa informação; se existir,
é só apontar a URL.

## 2. Gerar o código de pareamento da Casa do Fábio

Antes do piloto, insira manualmente o código (Passo 8):

```sql
INSERT INTO connector_pairing_codes (codigo, property_id)
VALUES ('CASA-FABIO-001', '<property_id real da Casa do Fábio no seu banco>');
```

## 3. Agente Go — ajustar antes de gerar o instalador

Em `agent-go/main.go`, `apiBaseURLPadrao` está como
`https://connector.autosetup.digital` — troque pelo domínio real do
Worker depois do deploy (ou defina a env var
`AUTOSETUP_CONNECTOR_API` em build time / no `.iss`).

Para recompilar depois de qualquer ajuste:

```bash
cd agent-go
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o autosetup-connector.exe .
```

(já testei esse exato comando neste ambiente — compila limpo, sem
cgo, sem dependência de GTK/Linux.)

## 4. Instalador

Requer Inno Setup instalado em uma máquina Windows (não tenho como
rodar `iscc` neste ambiente Linux):

```
iscc installer.iss
```

Gera `AutoSetupConnector-Setup-1.0.0.exe`. Sem assinatura de código
nesta fase — o SmartScreen vai avisar; no piloto, contornar
manualmente com "Mais informações" → "Executar assim mesmo".

## 5. Checklist do piloto (Passo 8)

- [ ] Deploy do backend feito e testado com um arquivo de teste
      (Passos 1–5 de ponta a ponta) **antes** de instalar no Windows
      do Fábio — é a ordem que o plano original pediu explicitamente.
- [ ] Código `CASA-FABIO-001` inserido no D1.
- [ ] Orientar o Fábio a criar a pasta com subpastas
      Reservas/Hóspedes/Quartos/Tarifas e mover os arquivos existentes
      para lá.
- [ ] Acompanhar a instalação por telefone/WhatsApp, guiando o
      "Executar assim mesmo" do SmartScreen.
- [ ] Confirmar no D1 que a primeira sincronização chegou estruturada
      corretamente nas tabelas `reservas`/`hospedes`/`quartos`/`tarifas`.
- [ ] Verificar se o diagnóstico do LENS regenerado com esse dado
      agrega frente ao diagnóstico baseado só em formulário.

---

## O que ficou como decisão em aberto (não resolvi por você)

- **`LENS_REFRESH_URL`**: não sei se esse endpoint já existe no Core.
  Deixei como chamada opcional — se não configurar, simplesmente não
  dispara nada.
- **Ícone de diálogo gráfico no onboarding**: o fluxo de pareamento
  hoje é via prompt de texto no terminal que abre junto com o app na
  primeira execução (mais simples de construir e testar). O plano não
  especificou se deveria ser uma janela gráfica (GUI) — se você quiser
  isso, é um passo a mais (ex. Fyne ou Walk) que não constrói sozinho
  de forma confiável sem testar em Windows real.
- **Nome real do property_id da Casa do Fábio**: só você tem esse
  dado no seu banco — preencha no INSERT do item 2 acima.
