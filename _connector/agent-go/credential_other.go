//go:build !windows

package main

import (
	"os"
	"path/filepath"
)

// Fallback só para permitir compilar/testar em macOS/Linux durante o
// desenvolvimento. O binário de produção é sempre cross-compilado com
// GOOS=windows, que usa credential_windows.go (DPAPI de verdade).
func tokenFallbackPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, ".dev-token-nao-usar-em-producao"), nil
}

func saveToken(token string) error {
	path, err := tokenFallbackPath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(token), 0o600)
}

func loadToken() (string, error) {
	path, err := tokenFallbackPath()
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	return string(data), err
}

func deleteToken() error {
	path, err := tokenFallbackPath()
	if err != nil {
		return err
	}
	return os.Remove(path)
}
