package main

import (
	"encoding/json"
	"os"
	"path/filepath"
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

func configDir() (string, error) {
	base, err := os.UserConfigDir() // Windows: %APPDATA%
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "AutoSetupConnector")
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
