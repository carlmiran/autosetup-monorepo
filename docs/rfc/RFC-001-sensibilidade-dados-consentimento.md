# RFC-001 — Sensibilidade de Dados e Consentimento

**Status**: Proposto (aguardando aprovação do Comitê de Arquitetura — RFC
é o nível mais alto de mudança estrutural segundo DGV-001, exige
aprovação explícita, não é decisão unilateral de dev master)

**Data**: 29/07/2026

**Motivação**: pré-requisito identificado no "Parecer do Arquiteto-Chefe"
sobre a vertical RH, antes de qualquer PRD. RH é a primeira vertical do
AutoSetup que lida com dado pessoal de gente que **não é cliente direto**
— são os funcionários dos clientes. Isso muda a natureza do risco: em
Agro e Hospedagem, o pior cenário de vazamento é dado comercial; em RH,
pode ser dado de saúde, desempenho, currículo, histórico — categorias
sensíveis sob a LGPD.

## Escopo

Esta política é **transversal** — se aplica a qualquer componente do
Core (ATLAS, LENS, WORKERS) sempre que o dado tratado for de uma pessoa
física identificável que não seja o próprio usuário do sistema (ex: o
dono de um negócio que preenche o diagnóstico é o usuário; um
funcionário cadastrado por um cliente RH é um terceiro).

## Classificação de dado

| Nível | Exemplo | Regra |
|---|---|---|
| **Dado comercial** | Nome do negócio, nicho, faturamento estimado | Tratamento atual do Core já cobre (ver ACP-001) |
| **Dado pessoal identificável** | Nome, telefone, e-mail de um funcionário | Requer consentimento explícito registrado, nunca inferido |
| **Dado pessoal sensível (LGPD Art. 5º, II)** | Saúde, dados biométricos, origem racial/étnica, convicção religiosa/política, filiação sindical | **Nunca coletado nem inferido pelo AutoSetup**, mesmo que o cliente tente fornecer — o sistema deve recusar/ignorar esse tipo de campo |

## Regras obrigatórias

1. **Consentimento explícito e registrado**: nenhum dado pessoal de um
   terceiro (funcionário) entra no sistema sem um registro de que essa
   pessoa (ou o processo de contratação, com base legal aplicável) deu
   consentimento — não basta o cliente (empregador) autorizar em nome
   dela.
2. **Nunca dado sensível (Art. 5º, II)**: o sistema não deve ter campo
   algum que colete saúde, biometria, raça/etnia, religião, opinião
   política, filiação sindical ou orientação sexual de candidatos ou
   funcionários — mesmo que pareça útil para "diversidade" ou "cultura".
   Se um cliente tentar inserir isso via texto livre (ex: numa
   entrevista transcrita), o sistema deve reconhecer e recusar processar
   essa informação, não silenciosamente absorver.
3. **Direito ao esquecimento real**: qualquer funcionário/candidato deve
   poder pedir a remoção dos próprios dados, e o sistema precisa
   conseguir cumprir isso de verdade — não só apagar da tela, apagar do
   banco.
4. **Retenção mínima**: dado de processo seletivo de candidato não
   contratado tem prazo de retenção definido (a definir com
   orientação jurídica antes da implementação — não é decisão técnica
   sozinha).
5. **Nunca usar dado de RH pra treinar/ajustar modelo de IA** sem que
   isso esteja no escopo explícito do consentimento coletado.

## O que este RFC NÃO resolve

Este documento estabelece a política. Não substitui orientação jurídica
real sobre LGPD para o caso de uso específico do AutoSetup RH — antes de
processar dado real de candidato/funcionário em produção, recomenda-se
revisão por profissional jurídico.

## Relação com outros documentos

Complementa o ADR sobre decisão-envolvendo-pessoa (ver
`docs/adr/ADR-CORE-005-decisao-sobre-pessoa.md`) — este RFC trata de
**dado**, aquele ADR trata de **decisão**.
