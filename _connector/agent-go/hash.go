package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"sync"
)

func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// HashCache guarda o último hash enviado com sucesso para cada arquivo,
// para não reenviar quando nada mudou.
type HashCache struct {
	mu     sync.Mutex
	path   string
	Hashes map[string]string `json:"hashes"`
}

func loadHashCache() (*HashCache, error) {
	dir, err := configDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "hash-cache.json")

	hc := &HashCache{path: path, Hashes: map[string]string{}}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return hc, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, hc); err != nil {
		return nil, err
	}
	return hc, nil
}

func (hc *HashCache) MudouDesdeUltimoEnvio(path, hash string) bool {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	return hc.Hashes[path] != hash
}

func (hc *HashCache) MarcarEnviado(path, hash string) error {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	hc.Hashes[path] = hash
	data, err := json.MarshalIndent(hc, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(hc.path, data, 0o600)
}
