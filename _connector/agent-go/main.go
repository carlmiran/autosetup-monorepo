package main

import (
	"log"
	"os"
	"time"
)

// URL padrão do backend — ajustar para o domínio real do Worker antes
// de gerar o instalador (ou ler de variável de ambiente em build time).
const apiBaseURLPadrao = "https://autosetup-worker-connector.teodoromiranda.workers.dev"

// executarRevogacao é chamada com --revogar (pelo desinstalador via
// Inno Setup). Revoga o token no backend e limpa a credencial local.
// Best-effort: não deve travar a desinstalação por causa de rede.
func executarRevogacao(cfg *Config, apiBaseURL string) {
	if cfg == nil {
		log.Println("nada para revogar (config inexistente)")
		return
	}

	token, err := loadToken()
	if err != nil {
		log.Printf("token local não encontrado, seguindo sem revogar no backend: %v", err)
	} else {
		client := novoClient(cfg.APIBaseURL, token)
		if client.BaseURL == "" {
			client.BaseURL = apiBaseURL
		}
		if err := client.Revogar(); err != nil {
			// Não bloqueia a desinstalação — só loga. O backend também
			// pode revogar manualmente via D1 se a chamada falhar.
			log.Printf("falha ao revogar no backend (seguindo mesmo assim): %v", err)
		} else {
			log.Println("token revogado no backend com sucesso")
		}
	}

	_ = deleteToken()
}

func main() {
	apiBaseURL := os.Getenv("AUTOSETUP_CONNECTOR_API")
	if apiBaseURL == "" {
		apiBaseURL = apiBaseURLPadrao
	}

	cfg, err := loadConfig()
	if err != nil {
		log.Fatalf("erro lendo config: %v", err)
	}

	// Chamado pelo desinstalador (Passo 7) — revoga o token no backend
	// e sai, sem entrar no fluxo normal de watcher/bandeja.
	if len(os.Args) > 1 && os.Args[1] == "--revogar" {
		executarRevogacao(cfg, apiBaseURL)
		return
	}

	var token string
	if cfg == nil || !cfg.EscopoConfirmado {
		log.Println("Primeira execução — iniciando pareamento...")
		cfg, token, err = executarOnboarding(apiBaseURL)
		if err != nil {
			log.Fatalf("onboarding falhou: %v", err)
		}
		log.Printf("Pareado com sucesso. connector_id=%s property_id=%s", cfg.ConnectorID, cfg.PropertyID)
	} else {
		token, err = loadToken()
		if err != nil {
			log.Fatalf("não foi possível carregar o token salvo (rode novamente o pareamento): %v", err)
		}
	}

	client := novoClient(cfg.APIBaseURL, token)

	fila, err := abrirFilaLocal()
	if err != nil {
		log.Fatalf("erro abrindo fila local: %v", err)
	}
	cache, err := loadHashCache()
	if err != nil {
		log.Fatalf("erro abrindo cache de hash: %v", err)
	}

	alterados := make(chan string, 100)
	watcher, err := iniciarWatcher(cfg.PastaAutorizada, alterados)
	if err != nil {
		log.Fatalf("erro iniciando watcher: %v", err)
	}
	defer watcher.Close()

	ultimaSync := "—"

	// Goroutine: recebe eventos do watcher, calcula hash e enfileira
	// localmente se o conteúdo realmente mudou.
	go func() {
		for path := range alterados {
			hash, err := hashFile(path)
			if err != nil {
				log.Printf("erro calculando hash de %s: %v", path, err)
				continue
			}
			if !cache.MudouDesdeUltimoEnvio(path, hash) {
				continue // conteúdo idêntico ao último envio — ignora
			}
			if err := fila.Adicionar(path, hash); err != nil {
				log.Printf("erro adicionando %s à fila local: %v", path, err)
			}
		}
	}()

	// Loop principal: a cada 10s, tenta esvaziar a fila local
	// (arquivos pendentes por terem sido detectados offline ou por
	// falha anterior), respeitando pausa e backoff exponencial.
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if pausado.Load() {
				continue
			}
			for _, item := range fila.Prontos() {
				hash, err := hashFile(item.Path)
				if err != nil {
					log.Printf("arquivo sumiu ou erro de leitura (%s): %v", item.Path, err)
					continue
				}
				if err := client.EnviarArquivo(item.Path, hash); err != nil {
					log.Printf("falha ao enviar %s (tentativa %d): %v", item.Path, item.Tentativas+1, err)
					_ = fila.RegistrarFalha(item.Path)
					continue
				}
				_ = cache.MarcarEnviado(item.Path, hash)
				_ = fila.Remover(item.Path)
				ultimaSync = time.Now().Format("02/01 15:04")
				log.Printf("sincronizado: %s", item.Path)
			}
		}
	}()

	executarBandeja(cfg, func() string { return ultimaSync }, func() {
		close(alterados)
		os.Exit(0)
	})
}
