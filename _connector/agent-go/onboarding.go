package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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

// executarOnboarding roda o fluxo de primeira execução (Passo 6 do
// plano): aceite de termos -> pareamento -> escolha de pasta ->
// listagem/confirmação de escopo antes do primeiro envio.
func executarOnboarding(apiBaseURL string) (*Config, string, error) {
	reader := bufio.NewReader(os.Stdin)

	fmt.Print(textoTermos)
	fmt.Print("Aceita continuar? (digite 'sim' para aceitar): ")
	resposta, _ := reader.ReadString('\n')
	if strings.TrimSpace(strings.ToLower(resposta)) != "sim" {
		return nil, "", fmt.Errorf("termos não aceitos — instalação cancelada")
	}

	fmt.Print("\nCódigo de pareamento (ex.: CASA-FABIO-001): ")
	codigo, _ := reader.ReadString('\n')
	codigo = strings.TrimSpace(codigo)

	fmt.Print("Caminho completo da pasta a monitorar (ex.: C:\\AutoSetup\\Dados): ")
	pasta, _ := reader.ReadString('\n')
	pasta = strings.TrimSpace(pasta)

	if _, err := os.Stat(pasta); err != nil {
		return nil, "", fmt.Errorf("pasta não encontrada: %w", err)
	}

	client := novoClient(apiBaseURL, "")
	resp, err := client.Parear(codigo, pasta)
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

// confirmarEscopoInicial lista os arquivos .xlsx/.csv encontrados na
// pasta autorizada e pede confirmação explícita ANTES do primeiro
// envio — uma única vez, não a cada sincronização (Passo 6).
func confirmarEscopoInicial(reader *bufio.Reader, cfg *Config) error {
	var encontrados []string
	_ = filepath.Walk(cfg.PastaAutorizada, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".xlsx" || ext == ".csv" {
			encontrados = append(encontrados, path)
		}
		return nil
	})

	fmt.Println("\nArquivos encontrados que serão sincronizados:")
	if len(encontrados) == 0 {
		fmt.Println("  (nenhum arquivo .xlsx/.csv encontrado ainda — tudo bem, serão pegos quando você adicionar)")
	}
	for _, f := range encontrados {
		fmt.Println("  -", f)
	}

	fmt.Print("\nConfirma o envio desses arquivos (e dos que forem adicionados depois) para o AutoSetup? (sim/não): ")
	resposta, _ := reader.ReadString('\n')
	if strings.TrimSpace(strings.ToLower(resposta)) != "sim" {
		return fmt.Errorf("escopo não confirmado — instalação cancelada")
	}

	cfg.EscopoConfirmado = true
	return nil
}
