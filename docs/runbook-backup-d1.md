# Runbook — backup e restauração do D1 `autosetup-leads`

Pacote 1, item 9 (24/10/2026). Duas camadas:

## 1. Time Travel (automático, já ativo)

A Cloudflare guarda o histórico do D1 sozinha — restauração para qualquer
minuto dentro da janela do plano (7 dias Free / 30 dias Paid). Não precisa de
cron nem de configuração. Conferido em 24/10/2026:

```
wrangler d1 time-travel info autosetup-leads      # mostra o bookmark atual (só leitura)
```

**Limites:** some se o banco for apagado; a restauração é *no lugar* (sobrescreve
o banco de produção); não serve de cópia fora da conta.

### Restaurar produção (incidente)

Só com confirmação explícita do Carlos — sobrescreve tudo o que foi escrito
depois do ponto escolhido.

1. Anotar o bookmark atual (para poder desfazer): `wrangler d1 time-travel info autosetup-leads`.
2. Achar o ponto: `wrangler d1 time-travel info autosetup-leads --timestamp=<ISO 8601 ou unix>`.
3. Fazer antes um backup da camada 2 (estado atual, para auditoria).
4. `wrangler d1 time-travel restore autosetup-leads --bookmark=<bookmark>`.
5. Conferir as contagens com `scripts/d1-backup-restauracao.mjs` e registrar em `docs/traceability.md`.

## 2. Cópia exportada + teste de restauração (sob demanda)

```
node scripts/d1-backup-restauracao.mjs --saida <pasta fora do repo> [--apagar]
```

Exporta o remoto (só leitura), restaura num D1 local descartável e compara
esquema e contagem de linhas tabela a tabela. Sai com código 1 se divergir.
O arquivo tem dados pessoais: `--apagar` remove no fim; se for guardar, use
pasta cifrada fora de qualquer sincronização e apague em até 30 dias.

### Evidência — 24/10/2026

Autorizado por Carlos. Export de 88.850 bytes, restaurado em D1 local vazio:
**21 tabelas, 217 linhas, esquema e contagem idênticos ao remoto em todas**.
Arquivo apagado no fim (`--apagar`). Saída completa em `docs/status/pacote-01.md`.

## Pendente (decisão)

Cópia automática periódica para fora do banco (ex.: Worker com cron gravando
dump no R2 ou em outra conta). Precisa decidir onde roda o cron e quem guarda
a cópia — não é necessária para a recuperação normal (Time Travel cobre), só
para o caso de o banco ser apagado ou a conta comprometida.
