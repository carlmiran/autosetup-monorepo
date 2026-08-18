package main

import (
	"fmt"
	"os/exec"
	"runtime"
	"sync/atomic"

	"github.com/getlantern/systray"
)

// pausado é lido pelo loop principal de sincronização para decidir se
// processa a fila ou não. atomic para acesso seguro entre goroutines.
var pausado atomic.Bool

func executarBandeja(cfg *Config, ultimaSincronizacao func() string, aoSair func()) {
	systray.Run(func() {
		systray.SetTitle("AutoSetup Connector — " + instanciaAtual)
		// Tooltip é o que diferencia visualmente os ícones na bandeja quando
		// há mais de uma instância rodando ao mesmo tempo (ex.: sede + anexo).
		systray.SetTooltip(fmt.Sprintf("AutoSetup Connector — %s (%s)", instanciaAtual, cfg.PropertyID))

		itemInstancia := systray.AddMenuItem("Instância: "+instanciaAtual, "")
		itemInstancia.Disable()
		itemStatus := systray.AddMenuItem("Empresa: "+cfg.PropertyID, "")
		itemStatus.Disable()
		itemPasta := systray.AddMenuItem("Pasta: "+cfg.PastaAutorizada, "")
		itemPasta.Disable()
		itemUltimaSync := systray.AddMenuItem("Última sincronização: —", "")
		itemUltimaSync.Disable()

		systray.AddSeparator()
		itemPausar := systray.AddMenuItemCheckbox("Pausar sincronização", "", false)
		itemAbrirPasta := systray.AddMenuItem("Abrir pasta monitorada", "")
		systray.AddSeparator()
		itemSair := systray.AddMenuItem("Sair", "")

		go func() {
			for {
				select {
				case <-itemPausar.ClickedCh:
					novo := !pausado.Load()
					pausado.Store(novo)
					if novo {
						itemPausar.Check()
					} else {
						itemPausar.Uncheck()
					}
				case <-itemAbrirPasta.ClickedCh:
					abrirPastaNoExplorer(cfg.PastaAutorizada)
				case <-itemSair.ClickedCh:
					systray.Quit()
				}
			}
		}()

		_ = itemUltimaSync
		_ = ultimaSincronizacao
	}, func() {
		aoSair()
	})
}

func abrirPastaNoExplorer(path string) {
	if runtime.GOOS != "windows" {
		return
	}
	_ = exec.Command("explorer", path).Start()
}
