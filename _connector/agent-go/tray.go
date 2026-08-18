package main

import (
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
		systray.SetTitle("AutoSetup Connector")
		systray.SetTooltip("AutoSetup Connector — sincronização ativa")

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
