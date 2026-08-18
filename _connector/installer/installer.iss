; =====================================================================
; AutoSetup Connector — Instalador (Inno Setup)
; Passo 7 do plano.
;
; SEM autoatualização remota nesta fase (reinstalação manual quando
; precisar) e SEM assinatura de código (o SmartScreen vai avisar —
; contornável manualmente no piloto via "Mais informações" ->
; "Executar assim mesmo").
;
; Compilar com: iscc installer.iss
; (requer o binário autosetup-connector.exe já cross-compilado em
; ..\agent-go\autosetup-connector.exe)
; =====================================================================

#define MyAppName "AutoSetup Connector"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AutoSetup Digital"
#define MyAppExeName "autosetup-connector.exe"

[Setup]
AppId={{8F1B2C4E-6A3D-4F5E-9B7A-AUTOSETUPCONNV1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\AutoSetupConnector
DisableProgramGroupPage=yes
; Sem assinatura de código nesta fase — aviso do SmartScreen é esperado.
OutputBaseFilename=AutoSetupConnector-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
; Processo de usuário com ícone na bandeja — NÃO é serviço Windows.
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "..\agent-go\autosetup-connector.exe"; DestDir: "{app}"; Flags: ignoreversion

; Início automático no login do usuário (processo de usuário, não
; serviço — por isso HKCU\...\Run e não um serviço do Windows).
[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "AutoSetupConnector"; \
    ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue

[Run]
; O fluxo de pareamento roda na PRIMEIRA ABERTURA do app, não durante
; a instalação (Passo 7) — aqui só abrimos o app ao final do setup.
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir AutoSetup Connector agora"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Chama o endpoint de revogação antes de remover o binário, para que
; o backend marque status = 'revogado' na tabela connectors.
; (implementado como uma flag de linha de comando no próprio agente —
; ver Passo 7 / integração pendente com o main.go: tratar
; os.Args contendo "--revogar" para chamar POST /api/connector/revogar
; com o token salvo, antes de sair.)
Filename: "{app}\{#MyAppExeName}"; Parameters: "--revogar"; Flags: runhidden waituntilterminated; RunOnceId: "RevogarConnector"

[UninstallDelete]
Type: filesandordirs; Name: "{userappdata}\AutoSetupConnector"
