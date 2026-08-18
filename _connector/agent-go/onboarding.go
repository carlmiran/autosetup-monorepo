package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const textoTermos = `
AutoSetup Connector — o que isso faz antes de você continuar:

  • Monitora APENAS a pasta que você escolher agora (e subpastas dela).
  • Só reage a arquivos .xlsx e .csv dentro dessa pasta.
  • Quando um desses arquivos muda, envia o arquivo INTEIRO para os
    servidores do AutoSetup, para alimentar seus relatórios e o
    diagnóstico do LENS.
  • NÃO acessa nada fora dessa pasta: sem senhas, sem histórico,
    sem fotos, sem outros documentos da sua máquina.
  • Você pode pausar ou desinstalar a qualquer momento pelo ícone na
    bandeja do Windows.

`

// prefillPareamento é só CONFIGURAÇÃO (código de pareamento e pasta a
// monitorar), pra agilizar a digitação numa sessão remota com alguém
// real no teclado — nunca CONSENTIMENTO. De propósito não tem campo de
// termos aceitos: aceite só existe pelo prompt interativo, sempre.
type prefillPareamento struct {
	CodigoPareamento string `json:"codigo_pareamento"`
	PastaAutorizada  string `json:"pasta_autorizada"`
}

// executarOnboarding roda o fluxo de primeira execução (Passo 6 do
// plano): aceite de termos -> pareamento -> escolha de pasta ->
// listagem/confirmação de escopo antes do primeiro envio.
//
// Aceite de termos e confirmação de escopo são SEMPRE interativos, via
// prompt de terminal digitado por uma pessoa de verdade — nunca puláveis
// por variável de ambiente, arquivo, ou qualquer outra forma de
// configuração prévia, mesmo numa instalação remota (sessão de tela
// remota com alguém real no teclado, ou não — sem interação de verdade,
// não instala). Só código de pareamento e pasta podem vir
// pré-preenchidos (carregarPrefillPareamento), porque isso é
// configuração, não decisão de consentimento. Se o stdin não puder ser
// lido (fechado, instalador totalmente silencioso sem terminal
// interativo anexado), falha alto e claro em vez de seguir sem ninguém
// confirmar nada.
func executarOnboarding(apiBaseURL, prefillArquivo string) (*Config, string, error) {
	prefill := carregarPrefillPareamento(prefillArquivo)
	reader := bufio.NewReader(os.Stdin)

	fmt.Print(textoTermos)
	respostaTermos, err := lerLinhaInterativa(reader, "Aceita continuar? (digite 'sim' para aceitar): ")
	if err != nil {
		return nil, "", err
	}
	if strings.ToLower(respostaTermos) != "sim" {
		return nil, "", fmt.Errorf("termos não aceitos — instalação cancelada")
	}
	// Momento exato do aceite real — capturado aqui, não inferido depois
	// nem aproximado pelo horário de chegada no servidor.
	consentimentoEm := time.Now()

	codigo := prefill.CodigoPareamento
	if codigo == "" {
		codigo, err = lerLinhaInterativa(reader, "\nCódigo de pareamento (ex.: CASA-FABIO-001): ")
		if err != nil {
			return nil, "", err
		}
	} else {
		log.Printf("código de pareamento pré-preenchido (configuração, não consentimento): %s", codigo)
	}

	pasta := prefill.PastaAutorizada
	if pasta == "" {
		pasta, err = lerLinhaInterativa(reader, "Caminho completo da pasta a monitorar (ex.: C:\\AutoSetup\\Dados): ")
		if err != nil {
			return nil, "", err
		}
	} else {
		log.Printf("pasta pré-preenchida (configuração, não consentimento): %s", pasta)
	}

	if _, err := os.Stat(pasta); err != nil {
		return nil, "", fmt.Errorf("pasta não encontrada: %w", err)
	}

	client := novoClient(apiBaseURL, "")
	resp, err := client.Parear(codigo, pasta, consentimentoEm)
	if err != nil {
		return nil, "", err
	}

	cfg := &Config{
		ConnectorID:     resp.ConnectorID,
		PropertyID:      resp.PropertyID,
		PastaAutorizada: pasta,
		APIBaseURL:      apiBaseURL,
		TermosAceitos:   true,
	}

	if err := confirmarEscopoInicial(reader, cfg); err != nil {
		return nil, "", err
	}

	if err := saveConfig(cfg); err != nil {
		return nil, "", err
	}
	if err := saveToken(resp.Token); err != nil {
		return nil, "", err
	}

	return cfg, resp.Token, nil
}

// lerLinhaInterativa imprime o prompt e lê uma linha do stdin. Se não
// conseguir ler (stdin fechado ou EOF imediato — instalador totalmente
// silencioso sem terminal interativo anexado), retorna um erro
// específico em vez de deixar o chamador tratar isso como resposta
// vazia/negativa: consentimento tem que ser uma ação real de quem está
// na frente do computador, nunca um caminho que "só não deu certo de
// ler" e seguiu adiante ou cancelou silenciosamente sem dizer por quê.
func lerLinhaInterativa(reader *bufio.Reader, prompt string) (string, error) {
	fmt.Print(prompt)
	resposta, err := reader.ReadString('\n')
	if err != nil {
		return "", fmt.Errorf("consentimento requer confirmação interativa, não pode rodar completamente silencioso (falha lendo resposta de %q: %w)", strings.TrimSpace(prompt), err)
	}
	return strings.TrimSpace(resposta), nil
}

// carregarPrefillPareamento procura código de pareamento e pasta prontos
// pra agilizar a digitação — nunca aceite de termos (ver
// prefillPareamento). Fontes, nessa ordem: (1) variáveis de ambiente
// AUTOSETUP_CONNECTOR_CODIGO_PAREAMENTO / AUTOSETUP_CONNECTOR_PASTA; (2)
// arquivo JSON (--prefill-arquivo, ou AUTOSETUP_CONNECTOR_PREFILL_ARQUIVO,
// ou "pareamento-prefill.json" ao lado do executável, que é o que o
// installer.iss bundla quando alguém prepara isso antes). Nunca falha —
// sem nada encontrado, os prompts pedem os dois normalmente.
func carregarPrefillPareamento(prefillArquivo string) prefillPareamento {
	envCodigo := strings.TrimSpace(os.Getenv("AUTOSETUP_CONNECTOR_CODIGO_PAREAMENTO"))
	envPasta := strings.TrimSpace(os.Getenv("AUTOSETUP_CONNECTOR_PASTA"))
	if envCodigo != "" || envPasta != "" {
		return prefillPareamento{CodigoPareamento: envCodigo, PastaAutorizada: envPasta}
	}

	path := strings.TrimSpace(prefillArquivo)
	if path == "" {
		path = strings.TrimSpace(os.Getenv("AUTOSETUP_CONNECTOR_PREFILL_ARQUIVO"))
	}
	if path == "" {
		exeDir := "."
		if exe, err := os.Executable(); err == nil {
			exeDir = filepath.Dir(exe)
		}
		path = filepath.Join(exeDir, "pareamento-prefill.json")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return prefillPareamento{} // sem arquivo — prompts normais, sem erro
	}
	var p prefillPareamento
	if err := json.Unmarshal(data, &p); err != nil {
		log.Printf("arquivo de prefill encontrado (%s) mas inválido, ignorando e pedindo pelos prompts: %v", path, err)
		return prefillPareamento{}
	}
	return p
}

// listarArquivosEncontrados varre a pasta autorizada (e subpastas) e
// retorna os .xlsx/.csv encontrados.
func listarArquivosEncontrados(pastaAutorizada string) []string {
	var encontrados []string
	_ = filepath.Walk(pastaAutorizada, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".xlsx" || ext == ".csv" {
			encontrados = append(encontrados, path)
		}
		return nil
	})
	return encontrados
}

// confirmarEscopoInicial lista os arquivos .xlsx/.csv encontrados na
// pasta autorizada e pede confirmação explícita ANTES do primeiro
// envio — uma única vez, não a cada sincronização (Passo 6). Sempre
// interativa, mesmo com código/pasta pré-preenchidos.
func confirmarEscopoInicial(reader *bufio.Reader, cfg *Config) error {
	encontrados := listarArquivosEncontrados(cfg.PastaAutorizada)

	fmt.Println("\nArquivos encontrados que serão sincronizados:")
	if len(encontrados) == 0 {
		fmt.Println("  (nenhum arquivo .xlsx/.csv encontrado ainda — tudo bem, serão pegos quando você adicionar)")
	}
	for _, f := range encontrados {
		fmt.Println("  -", f)
	}

	resposta, err := lerLinhaInterativa(reader, "\nConfirma o envio desses arquivos (e dos que forem adicionados depois) para o AutoSetup? (sim/não): ")
	if err != nil {
		return err
	}
	if strings.ToLower(resposta) != "sim" {
		return fmt.Errorf("escopo não confirmado — instalação cancelada")
	}

	cfg.EscopoConfirmado = true
	return nil
}
