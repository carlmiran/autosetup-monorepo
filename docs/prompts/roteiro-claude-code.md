# Roteiro — Claude Code (retomada de 03/10)

Baixe os 4 arquivos para a pasta Downloads:
- `roteiro-claude-code.md` (este)
- `prompts-claude-code-connector.md` (plano do Connector, Fases 0 a 5)
- `connector-fase6-google-drive.md` (Fase 6, Google Drive)
- `skills-claude-code.md` (8 skills do projeto)

Siga um passo por vez. Cada bloco de código é para colar inteiro no Claude Code, exceto onde está escrito "PowerShell".

---

## Passo 1 — Abrir na pasta certa (PowerShell)

Se o Claude Code estiver aberto, digite `/exit`. Depois:

```
cd $HOME\Desktop\autosetup-monorepo
npx wrangler whoami
```

Se aparecer "Not logged in":
```
npx wrangler login
```
Autorize no navegador. Depois:
```
claude
```
Confira se o cabeçalho mostra `~\Desktop\autosetup-monorepo`.

---

## Passo 2 — Colocar os arquivos no lugar

```
Execute agora, sem pedir confirmação:
1. Se existir docs/prmps, renomeie para docs/prompts. Garanta que docs/prompts existe.
2. Mova de C:\Users\User\Downloads para docs/prompts:
   - prompts-claude-code-connector.md → docs/prompts/connector-auditoria.md
     (se docs/prompts/connector-auditoria.md já existir, mantenha o que está no repo
     e apague a cópia de Downloads)
   - connector-fase6-google-drive.md → acrescente o conteúdo ao FINAL de
     docs/prompts/connector-auditoria.md e apague a cópia
   - skills-claude-code.md → docs/prompts/skills-claude-code.md
   - roteiro-claude-code.md → docs/prompts/roteiro-claude-code.md
3. Em connector-auditoria.md, se houver nomes de clientes reais na lista de busca,
   troque por "nomes de clientes reais" sem citar nenhum.
4. Commit: "docs: prompts do Connector, Fase 6 e skills". Sem push.
5. Liste o conteúdo de docs/prompts.
```

---

## Passo 3 — Relatório de situação

```
Me dê um relatório de situação, sem alterar nada:
1. git status e git log origin/main..main --oneline.
2. npx wrangler whoami.
3. O instalador existe no R2 (autosetup-connector-uploads, public/downloads)? Tamanho?
4. A coluna codigo_indicacao existe em connector_pairing_codes no autosetup-leads --remote?
5. Fase 0: estado de cada item — onboarding.go, builds -sede/-anexo apagados,
   -buildvcs=false, leads-teste.csv trocado por fictício, linhas com nomes do cliente
   piloto no D1 (só listar).
6. O que existe em .claude/skills/?
Tabela: item | situação | próximo passo.
```

Mande o print do relatório para o Claude no chat antes de seguir, se algo estiver estranho.

---

## Passo 4 — Fechar a Fase 0 (só o que o relatório mostrar como pendente)

```
Execute os itens pendentes da Fase 0 conforme o relatório:
1. Recompile o agente com GOOS=windows GOARCH=amd64 CGO_ENABLED=0 -buildvcs=false,
   confirme grep de nomes de cliente = 0 no binário, recompile o instalador principal
   (sem prefill) e informe tamanho e SHA-256.
2. Suba ESSE instalador para o R2 em public/downloads/AutoSetupConnector-Setup-1.0.0.exe
   e confirme o tamanho lá.
3. Se codigo_indicacao não existir, aplique a migration 0003 no autosetup-leads --remote
   e confirme.
4. Substitua worker-runner/fixtures/leads-teste.csv por negócios fictícios com a mesma
   estrutura. Procure outros fixtures com negócios, telefones ou e-mails reais e
   liste-os antes de trocar.
5. Liste no D1 as linhas com nomes do cliente piloto. NÃO apague.
6. Apague os builds -sede e -anexo se ainda existirem.
Rode os testes. Commit por item. Sem push.
Termine com: git log origin/main..main --oneline.
```

---

## Passo 5 — Push e testes de produção

Confira a lista de commits que ele mostrou. Se estiver tudo certo:

```
! git push origin main
```

Se o `!` não funcionar, rode `git push origin main` numa janela do PowerShell, dentro da pasta do monorepo.

Espere o build ficar verde no painel da Cloudflare (Workers & Pages → autosetup-monorepo → Deployments). Depois:

```
Rode os testes de produção sem alterar nada e sem ler o CONNECTOR_ADMIN_SECRET:
- /downloads/AutoSetupConnector-Setup-1.0.0.exe → 200, binário, tamanho igual ao R2
- /admin/connector sem credencial → 401/403 ou tela de login (nunca 503 nem 404)
- /api/admin/connector/criar com credencial errada → recusa
- /radar/minha-regiao → 200
Tabela: teste | esperado | obtido | ok?, com causa provável de cada falha.
```

Depois, o seu teste manual: abrir `/admin/connector`, entrar com a chave, gerar um código de teste e apagá-lo.

---

## Passo 6 — Skills do projeto

```
Execute docs/prompts/skills-claude-code.md.
```

---

## Passo 7 — Fase 1 do Connector (auditoria somente leitura)

```
Execute a Fase 1 de docs/prompts/connector-auditoria.md.
```

Mande o print da tabela para o Claude no chat. As Fases 2 em diante são decididas a partir dela.

---

## Regras para todas as sessões

- Sempre abrir o Claude Code dentro de `Desktop\autosetup-monorepo`.
- Push é sempre seu. Nunca libere `git push` automático.
- Secrets só pelo painel da Cloudflare, nunca no chat nem no Claude Code.
- Para mandar comando de terminal no Claude Code, o `!` precisa ser o primeiro caractere. Se falhar, use o PowerShell.
