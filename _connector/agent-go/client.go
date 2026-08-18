package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

func novoClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

type respostaPareamento struct {
	ConnectorID string `json:"connector_id"`
	PropertyID  string `json:"property_id"`
	Token       string `json:"token"`
	Erro        string `json:"erro"`
}

// Parear chama POST /api/connector/parear com o código gerado manualmente
// para o cliente (ex.: CASA-FABIO-001). consentimentoEm é o momento exato
// em que a pessoa confirmou "sim" no prompt interativo de termos — nunca
// o horário de chegada no servidor, capturado no instante real do aceite
// (ver onboarding.go).
func (c *Client) Parear(codigoPareamento, pastaAutorizada string, consentimentoEm time.Time) (*respostaPareamento, error) {
	body, _ := json.Marshal(map[string]string{
		"codigo_pareamento": codigoPareamento,
		"pasta_autorizada":  pastaAutorizada,
		"consentimento_em":  consentimentoEm.UTC().Format(time.RFC3339),
	})

	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/api/connector/parear", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("content-type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out respostaPareamento
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pareamento falhou (%d): %s", resp.StatusCode, out.Erro)
	}
	return &out, nil
}

// EnviarArquivo chama POST /api/connector/sync com o arquivo bruto em
// multipart/form-data + hash SHA-256 declarado.
func (c *Client) EnviarArquivo(path, hash string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("file", filepath.Base(path))
	if err != nil {
		return err
	}
	if _, err := io.Copy(part, f); err != nil {
		return err
	}
	if err := writer.WriteField("hash", hash); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/api/connector/sync", &buf)
	if err != nil {
		return err
	}
	req.Header.Set("content-type", writer.FormDataContentType())
	req.Header.Set("authorization", "Bearer "+c.Token)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sync falhou (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}

// Revogar chama POST /api/connector/revogar — usado pelo desinstalador
// (Passo 7) para marcar status = 'revogado' antes de remover o app.
func (c *Client) Revogar() error {
	req, err := http.NewRequest(http.MethodPost, c.BaseURL+"/api/connector/revogar", nil)
	if err != nil {
		return err
	}
	req.Header.Set("authorization", "Bearer "+c.Token)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("revogação falhou (%d): %s", resp.StatusCode, string(body))
	}
	return nil
}
