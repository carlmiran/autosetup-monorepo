package main

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type ItemFila struct {
	Path        string    `json:"path"`
	Hash        string    `json:"hash"`
	Tentativas  int       `json:"tentativas"`
	ProximaTent time.Time `json:"proxima_tentativa"`
}

type FilaLocal struct {
	mu    sync.Mutex
	path  string
	Itens []ItemFila `json:"itens"`
}

func abrirFilaLocal() (*FilaLocal, error) {
	dir, err := configDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "fila-pendente.json")

	f := &FilaLocal{path: path}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return f, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, f); err != nil {
		return nil, err
	}
	return f, nil
}

func (f *FilaLocal) persistir() error {
	data, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(f.path, data, 0o600)
}

func (f *FilaLocal) Adicionar(path, hash string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	for i, it := range f.Itens {
		if it.Path == path {
			f.Itens[i].Hash = hash
			f.Itens[i].Tentativas = 0
			f.Itens[i].ProximaTent = time.Now()
			return f.persistir()
		}
	}
	f.Itens = append(f.Itens, ItemFila{Path: path, Hash: hash, ProximaTent: time.Now()})
	return f.persistir()
}

func (f *FilaLocal) Remover(path string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	novos := f.Itens[:0]
	for _, it := range f.Itens {
		if it.Path != path {
			novos = append(novos, it)
		}
	}
	f.Itens = novos
	return f.persistir()
}

func (f *FilaLocal) RegistrarFalha(path string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	for i, it := range f.Itens {
		if it.Path == path {
			f.Itens[i].Tentativas++
			backoff := time.Duration(math.Min(float64(30*time.Minute), float64(time.Second)*math.Pow(2, float64(f.Itens[i].Tentativas))))
			f.Itens[i].ProximaTent = time.Now().Add(backoff)
			return f.persistir()
		}
	}
	return nil
}

// Prontos retorna os itens cuja próxima tentativa já venceu.
func (f *FilaLocal) Prontos() []ItemFila {
	f.mu.Lock()
	defer f.mu.Unlock()

	var out []ItemFila
	now := time.Now()
	for _, it := range f.Itens {
		if !it.ProximaTent.After(now) {
			out = append(out, it)
		}
	}
	return out
}
