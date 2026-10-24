# Política de retenção e exclusão de dados pessoais — PROPOSTA

> **Status: PROPOSTA, não vigente.** Os prazos abaixo são sugestão técnica do
> Pacote 1 (24/10/2026). Prazo de guarda é decisão de negócio e jurídica
> (LGPD art. 15–16; obrigações fiscais) — **Carlos decide**, de preferência
> com contador/advogado. Nada é apagado automaticamente até a aprovação.

## 1. Onde há dado pessoal (D1 `autosetup-leads` e R2)

Levantado do esquema real (`apps/core/web/migrations/0000_baseline.sql` e
migrations dos workers), contagens de 24/10/2026.

| Onde | Dado pessoal | Titular | Finalidade | Prazo proposto |
|---|---|---|---|---|
| `leads` (9) | `nome_contato`, `whatsapp_contato`, negócio, cidade, respostas do diagnóstico | dono do negócio | diagnóstico e contato comercial | 24 meses sem interação → anonimizar nome/WhatsApp |
| `pagamentos` (1) | `nome`, `email` | comprador | cobrança, comissão, obrigação fiscal | 5 anos após o pagamento (fiscal) |
| `clientes_indicador` (184) | `nome_cliente`, `whatsapp_cliente`, `notas` | cliente do indicador | carteira do indicador | enquanto o indicador estiver ativo; 12 meses após inatividade → apagar |
| `indicadores` (0) / `indicadores_registro` (1) | `nome`, `contato`, `mp_user_id`, PIN | indicador | programa de indicação, comissão | enquanto ativo + 5 anos se houve comissão paga |
| `rh_entrevistas` (0) | `nome` + respostas de entrevista | candidato | triagem RH | 6 meses após a entrevista |
| `hospedes` / `reservas` (0) | `nome`, `contato`, `hospede_nome` | hóspede do cliente do Connector | operação do cliente (somos operadores) | o que o contrato com o cliente definir; apagar em até 30 dias após o fim do contrato |
| `licitacao_perfil` (0) | `cliente_email` | cliente | alerta de licitações | enquanto ativo |
| `rate_limits` (18) | **IP** dentro de `chave` (`rota:IP`) | qualquer visitante | antiabuso | **apagar ao expirar** (janela de 10–60 min); hoje as linhas vencidas ficam para sempre |
| `radar_pendentes` / `radar_visto` / `indicador_regiao` | negócios (dado público do Google) e região do indicador | negócio / indicador | prospecção | 12 meses |
| R2 `connector-uploads/<property_id>/…` | planilhas do cliente (podem ter hóspedes) | hóspede do cliente | importação do Connector | apagar o arquivo bruto 90 dias depois de processado |
| Logs do Worker (Workers Logs) | `[seguranca]` com rota, motivo, código de indicador — **sem IP, PIN ou senha** | indicador | investigação de abuso | retenção do plano Cloudflare (3 dias Free / 7 dias Paid) |
| Backups (`scripts/d1-backup-restauracao.mjs`) | cópia de tudo acima | todos | recuperação | arquivo apagado no fim do teste (`--apagar`); se guardado, cofre cifrado, no máximo 30 dias |
| D1 Time Travel | histórico do banco | todos | recuperação | automático da Cloudflare (7 dias Free / 30 dias Paid) |

## 2. Exclusão a pedido do titular (LGPD art. 18)

Até existir tela de admin para isso, o procedimento é manual e **sempre
local primeiro** (`--local`), depois `--remote` só com confirmação do Carlos,
como qualquer escrita no D1 (CLAUDE.md):

1. Identificar o titular pelo WhatsApp ou e-mail informado.
2. Conferir o que existe (só `SELECT`): `leads.whatsapp_contato`,
   `clientes_indicador.whatsapp_cliente`, `pagamentos.email`,
   `indicadores_registro.contato`.
3. `pagamentos` tem guarda fiscal — anonimizar só o que não for exigido;
   o resto: `DELETE`.
4. Registrar data e escopo (sem o dado) em `docs/traceability.md`.
5. Responder o titular em até 15 dias.

Lembrete: o Time Travel guarda o dado apagado pelo prazo dele — informar isso
na resposta.

## 3. Decisões pendentes (Carlos)

- [ ] Aprovar ou ajustar cada prazo da tabela.
- [ ] Autorizar a limpeza automática de `rate_limits` vencido (precisa de um
      cron — decidir em qual Worker roda, ver relatório do Pacote 1).
- [ ] Definir o contrato de operador de dados com clientes do Connector (prazo
      de `hospedes`/`reservas` e do R2).
- [ ] Publicar o resumo desta política na página de privacidade do site.
