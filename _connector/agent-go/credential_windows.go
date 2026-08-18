//go:build windows

package main

import "github.com/danieljoos/wincred"

const credTarget = "AutoSetupConnector:token"

// saveToken grava o token no Windows Credential Manager, protegido por
// DPAPI (vinculado ao usuário do Windows que instalou o Connector).
// Nunca é gravado em arquivo de config em texto plano.
func saveToken(token string) error {
	cred := wincred.NewGenericCredential(credTarget)
	cred.CredentialBlob = []byte(token)
	cred.Persist = wincred.PersistLocalMachine
	return cred.Write()
}

func loadToken() (string, error) {
	cred, err := wincred.GetGenericCredential(credTarget)
	if err != nil {
		return "", err
	}
	return string(cred.CredentialBlob), nil
}

func deleteToken() error {
	cred, err := wincred.GetGenericCredential(credTarget)
	if err != nil {
		return nil // já não existe
	}
	return cred.Delete()
}
