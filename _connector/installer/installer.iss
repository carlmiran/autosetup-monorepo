; =====================================================================
; AutoSetup Connector — Instalador (Inno Setup)
; Passo 7 do plano.
;
; SEM autoatualização remota nesta fase (reinstalação manual quando
; precisar) e SEM assinatura de código (o SmartScreen vai avisar —
; contornável manualmente no piloto via "Mais informações" ->
; "Executar assim mesmo").
;
; MÚLTIPLAS INSTÂNCIAS na mesma máquina/conta (ex.: cliente com 2+
; unidades/propriedades): o nome da instância é decidido em tempo de
; COMPILAÇÃO do instalador (não perguntado ao usuário final durante a
; instalação) — mesma lógica de já vir com um código de pareamento
; específico por propriedade. Gera um instalador (e uma entrada separada
; em Adicionar/Remover Programas) por instância:
;
;   iscc /DInstanceName=sede  installer.iss
;   iscc /DInstanceName=anexo installer.iss
;
; Sem passar /DInstanceName, usa "sede" como padrão (instalação única).
; O nome vira parâmetro de linha de comando (--instancia=NOME) do próprio
; agente, que isola config.json/hash-cache.json/fila-pendente.json (pasta
; %APPDATA%\AutoSetupConnector\<instancia>\) e o token no Windows
; Credential Manager (target AutoSetupConnector:<instancia>:token) — ver
; agent-go/config.go e agent-go/credential_windows.go.
;
; Compilar com: iscc installer.iss
; (requer o binário autosetup-connector.exe já cross-compilado em
; ..\agent-go\autosetup-connector.exe — o MESMO binário serve todas as
; instâncias, a diferença é só o parâmetro passado por cada instalador)
;
; PREENCHER CÓDIGO/PASTA DE ANTEMÃO (não é instalação sem interação — só
; agiliza digitação): se existir um arquivo "pareamento-prefill.json" ao
; lado deste .iss no momento da compilação, ele é bundlado no instalador
; e o agente usa esses dois valores pra pular só os prompts de código de
; pareamento e pasta (ver agent-go/onboarding.go). Formato do arquivo:
;   {
;     "codigo_pareamento": "CASA-FABIO-002",
;     "pasta_autorizada": "C:\\AutoSetup\\Dados"
;   }
; O aceite de termos e a confirmação da lista de arquivos ANTES do
; primeiro envio continuam SEMPRE interativos, com ou sem esse arquivo —
; não existe campo de "termos aceitos" nele de propósito. Se rodar sem
; terminal interativo disponível (stdin fechado, instalador /VERYSILENT
; sem console anexado), o agente falha com erro explícito em vez de
; seguir sozinho — por isso o [Run] abaixo sempre mantém "skipifsilent":
; nunca faz sentido abrir o app automaticamente numa instalação
; silenciosa, já que ele só ia falhar esperando por um "sim" que ninguém
; vai digitar.
; =====================================================================

#ifndef InstanceName
  #define InstanceName "sede"
#endif

#define MyAppName "AutoSetup Connector"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "AutoSetup Digital"
#define MyAppExeName "autosetup-connector.exe"

#define TemPrefillPareamento 0
#if FileExists(SourcePath + "pareamento-prefill.json")
  #define TemPrefillPareamento 1
#endif

[Setup]
; AppId inclui a instância — sem isso, instalar "anexo" depois de "sede"
; seria tratado pelo Windows como reparo/atualização da MESMA instalação
; (mesma entrada em Adicionar/Remover Programas), e desinstalar uma
; derrubaria a outra junto.
AppId=AutoSetupConnector_{#InstanceName}
AppName={#MyAppName} - {#InstanceName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\AutoSetupConnector-{#InstanceName}
DisableProgramGroupPage=yes
; Sem assinatura de código nesta fase — aviso do SmartScreen é esperado.
OutputBaseFilename=AutoSetupConnector-Setup-{#MyAppVersion}-{#InstanceName}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
; Processo de usuário com ícone na bandeja — NÃO é serviço Windows.
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "..\agent-go\autosetup-connector.exe"; DestDir: "{app}"; Flags: ignoreversion
#if TemPrefillPareamento
Source: "pareamento-prefill.json"; DestDir: "{app}"; Flags: ignoreversion
#endif

; Início automático no login do usuário (processo de usuário, não
; serviço — por isso HKCU\...\Run e não um serviço do Windows).
; ValueName inclui a instância — senão a segunda instalação sobrescreve
; a entrada de auto-start da primeira (mesma chave "AutoSetupConnector"
; pra todas). ValueData passa --instancia={#InstanceName} pro agente
; saber qual config/token carregar (e --prefill-arquivo=, se esta build
; tiver código/pasta pré-preenchidos, pra não perder isso num retry depois
; do login — o aceite de termos continua pedido ali igual, nunca pulado).
[Registry]
#if TemPrefillPareamento
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "AutoSetupConnector_{#InstanceName}"; \
    ValueData: """{app}\{#MyAppExeName}"" --instancia={#InstanceName} --prefill-arquivo=""{app}\pareamento-prefill.json"""; Flags: uninsdeletevalue
#else
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "AutoSetupConnector_{#InstanceName}"; \
    ValueData: """{app}\{#MyAppExeName}"" --instancia={#InstanceName}"; Flags: uninsdeletevalue
#endif

[Run]
; O fluxo de pareamento roda na PRIMEIRA ABERTURA do app, não durante a
; instalação (Passo 7) — aqui só abrimos o app ao final do setup. SEMPRE
; com "skipifsilent": aceite de termos e confirmação de escopo são
; sempre interativos (mesmo com código/pasta pré-preenchidos), então
; nunca faz sentido abrir sozinho numa instalação /VERYSILENT — só ia
; falhar esperando um "sim" que ninguém vai digitar.
#if TemPrefillPareamento
Filename: "{app}\{#MyAppExeName}"; Parameters: "--instancia={#InstanceName} --prefill-arquivo=""{app}\pareamento-prefill.json"""; Description: "Abrir AutoSetup Connector ({#InstanceName}) agora"; Flags: postinstall nowait skipifsilent
#else
Filename: "{app}\{#MyAppExeName}"; Parameters: "--instancia={#InstanceName}"; Description: "Abrir AutoSetup Connector ({#InstanceName}) agora"; Flags: postinstall nowait skipifsilent
#endif

[UninstallRun]
; Chama o endpoint de revogação antes de remover o binário, para que
; o backend marque status = 'revogado' na tabela connectors. Precisa de
; --instancia= igual ao da instalação, senão revoga (ou tenta carregar)
; o token da instância errada.
Filename: "{app}\{#MyAppExeName}"; Parameters: "--revogar --instancia={#InstanceName}"; Flags: runhidden waituntilterminated; RunOnceId: "RevogarConnector_{#InstanceName}"

[UninstallDelete]
; Só a pasta DESTA instância — nunca a raiz "AutoSetupConnector" inteira,
; que teria apagado os dados de outras instâncias instaladas na mesma
; conta (bug real do instalador original, corrigido aqui).
Type: filesandordirs; Name: "{userappdata}\AutoSetupConnector\{#InstanceName}"
