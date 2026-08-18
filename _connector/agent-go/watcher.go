package main

import (
	"io/fs"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
)

var extensoesPermitidas = map[string]bool{
	".xlsx": true,
	".csv":  true,
}

// iniciarWatcher observa a pasta autorizada e subpastas recursivamente.
// Eventos são debounced (500ms) por arquivo para não disparar múltiplas
// vezes durante um "save" do Excel, e enviados ao canal `alterados`.
func iniciarWatcher(pastaRaiz string, alterados chan<- string) (*fsnotify.Watcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	if err := adicionarRecursivo(w, pastaRaiz); err != nil {
		w.Close()
		return nil, err
	}

	pendentes := map[string]*time.Timer{}

	go func() {
		for {
			select {
			case ev, ok := <-w.Events:
				if !ok {
					return
				}
				if ev.Op&(fsnotify.Write|fsnotify.Create) == 0 {
					continue
				}
				ext := strings.ToLower(filepath.Ext(ev.Name))
				if !extensoesPermitidas[ext] {
					continue
				}

				// Se for um diretório novo, passa a observá-lo também.
				// (fsnotify não é recursivo nativamente no Windows.)

				path := ev.Name
				if t, existe := pendentes[path]; existe {
					t.Reset(500 * time.Millisecond)
					continue
				}
				pendentes[path] = time.AfterFunc(500*time.Millisecond, func() {
					alterados <- path
					delete(pendentes, path)
				})

			case err, ok := <-w.Errors:
				if !ok {
					return
				}
				log.Printf("erro do watcher: %v", err)
			}
		}
	}()

	return w, nil
}

func adicionarRecursivo(w *fsnotify.Watcher, raiz string) error {
	return filepath.WalkDir(raiz, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return w.Add(path)
		}
		return nil
	})
}
