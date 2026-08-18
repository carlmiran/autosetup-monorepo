package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// Config é persistida em texto simples (não sensível — o token fica
// separado, no Windows Credential Manager via credential.go).
type Config struct {
	ConnectorID      string `json:"connector_id"`
	PropertyID       string `json:"property_id"`
	PastaAutorizada  string `json:"pasta_autorizada"`
	APIBaseURL       string `json:"api_base_url"`
	EscopoConfirmado bool   `json:"escopo_confirmado"`
	TermosAceitos    bool   `json:"termos_aceitos"`
}

// instanciaAtual isola config/token/pasta quando há mais de uma instalação
// do Connector na mesma máquina/conta Windows (ex.: cliente com 2
// unidades/propriedades, um agente pra cada). Definida uma única vez no
// início de main() via definirInstancia(), antes de qualquer chamada a
// configDir()/credTarget().
var instanciaAtual = "default"

// definirInstancia normaliza e trava o nome da instância pro resto da
// execução. Nunca deixa vazio (cai pra "default", mantendo compatível o
// caso de instalação única sem --instancia).
func definirInstancia(nome string) {
	instanciaAtual = sanitizarInstancia(nome)
}

// sanitizarInstancia restringe o nome a caracteres seguros tanto pra
// nome de pasta (evita path traversal tipo "..\..\algo") quanto pro
// formato do target do Windows Credential Manager (que usa ":" como
// separador — ver credential_windows.go).
func sanitizarInstancia(nome string) string {
	var b strings.Builder
	for _, r := range strings.TrimSpace(nome) {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
			b.WriteRune(r)
		}
	}
	if b.Len() == 0 {
		return "default"
	}
	return b.String()
}

func configDir() (string, error) {
	base, err := os.UserConfigDir() // Windows: %APPDATA%
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "AutoSetupConnector", instanciaAtual)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return dir, nil
}

func configPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

func loadConfig() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // primeira execução — sem config ainda
		}
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func saveConfig(cfg *Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
