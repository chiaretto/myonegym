# cloud-backup Specification

## Purpose
Uma conta Google **opcional**, conectada apenas para o backup, e uma cópia do
backup completo guardada na pasta oculta (`appDataFolder`) do Drive do próprio
usuário. Com a mesma conta em dois aparelhos, os dois enxergam a mesma cópia.

A nuvem é um segundo transporte para o **mesmo documento** que "Exportar
backup" produz (ver `data-portability`); nada sobre o que é um backup é decidido
aqui. Nada acontece sem um toque: o app fala com o Google apenas ao entrar,
sair, fazer backup ou restaurar. O login é um redirecionamento feito pelo app,
sem biblioteca de terceiros, porque é o que um PWA instalado suporta.

## Requirements

### Requirement: Connect a Google Account by Redirect

The Google account is **optional, and exists only for the Drive backup**. The
app MUST NOT have a sign-in screen, MUST NOT ask the user to sign in on launch
or anywhere else, and MUST NOT add an account entry outside the Drive group
of the Backup screen. A user who never connects an account MUST find the app
exactly as it was.

From that group, the user MUST be able to **connect a Google account** and
later **disconnect** it. The sign-in MUST be the OAuth 2.0 **implicit flow by
full-page redirect**, performed by the app itself: the app navigates to
Google's authorization endpoint and reads the access token from the URL
fragment when Google sends the user back. The app MUST NOT load Google's
sign-in library or any other third-party script — a popup-based flow does not
complete inside an installed (standalone) PWA on iOS, and the bundle that has
to work offline gains nothing from a script it only needs online.

The app MUST request exactly the scopes it uses: `drive.appdata` (the hidden,
app-only Drive folder) plus `openid`, `email` and `profile` (to say who is
connected). It MUST NOT request broader Drive access.

The redirect MUST be protected by a random **`state`** value stored before
leaving and checked on return; a return whose `state` does not match MUST be
ignored. The fragment MUST be **removed from the URL** as soon as it is read,
so the token never lands in the browser history. The return MUST bring the
user back to the screen they left.

O que persiste no aparelho é a **identidade** (nome, e-mail, foto), e não o
token: o token de acesso dura cerca de uma hora e vive apenas na **sessão do
navegador**. Como o token vence, uma ação que precisa dele MUST tentar obtê-lo
de novo por um redirecionamento **silencioso** (`prompt=none`) e, quando o
Google recusa a via silenciosa, por um redirecionamento com interação.

A identidade e as datas desta capability são **preferências do aparelho**, no
mesmo sentido em que a chave do Assistente é: MUST ficar fora do backup e
MUST NOT ser apagadas por "Resetar app".

A tela MUST dizer com clareza **o que** é compartilhado — apenas o backup, numa
pasta oculta do Drive do próprio usuário, que a interface do Drive não mostra e
só este app enxerga — e **como** remover o acesso pela própria conta Google,
o que também apaga a pasta.

Um build sem o client ID configurado MUST mostrar a conta como **não
configurada neste build** em vez de um botão que falha.

#### Scenario: Nenhuma tela pede login
- GIVEN nenhuma conta foi conectada
- WHEN o usuário abre o app, a Home, as Configurações e as telas de cadastro
- THEN nada pede para entrar, e a única menção à conta é a linha opcional "Conectar conta Google" na tela de Backup

#### Scenario: Entrar com Google
- GIVEN nenhuma conta está conectada
- WHEN o usuário toca "Conectar conta Google" em Configurações → Backup
- THEN o app navega para a página de consentimento do Google pedindo apenas os quatro escopos
- AND, ao voltar, a tela mostra o nome, o e-mail e a foto da conta

#### Scenario: A volta traz o usuário para onde ele estava
- GIVEN o usuário iniciou o login a partir de Configurações → Backup
- WHEN o Google o devolve ao app
- THEN a tela de Backup é a que está aberta, já conectada

#### Scenario: O token não fica na URL nem no histórico
- GIVEN o Google devolveu o usuário com o token no fragmento da URL
- WHEN o app termina de ler o fragmento
- THEN a URL da aba não contém mais o fragmento
- AND voltar no histórico não reabre uma URL com o token

#### Scenario: Um state que não confere é ignorado
- GIVEN o app guardou um `state` ao iniciar o login
- WHEN o app é aberto por uma URL cujo fragmento traz um `state` diferente
- THEN nenhum token é aceito e a conta segue desconectada

#### Scenario: Token vencido é renovado sem interação
- GIVEN uma conta conectada cujo token venceu
- WHEN o usuário toca "Fazer backup no Drive"
- THEN o app vai ao Google pela via silenciosa e volta com um token novo
- AND o backup que o usuário pediu é feito em seguida

#### Scenario: A via silenciosa é recusada
- GIVEN o Google responde `interaction_required` à tentativa silenciosa
- WHEN o app recebe a resposta
- THEN ele repete o login pedindo interação, sem perder a ação pendente

#### Scenario: O consentimento não concedeu o Drive
- GIVEN o usuário desmarcou o acesso ao Drive na tela de consentimento
- WHEN ele volta ao app
- THEN a conta aparece conectada, com um aviso de que o acesso ao Drive não foi concedido
- AND os botões de backup e restauração oferecem entrar de novo em vez de tentar e falhar

#### Scenario: Sair
- GIVEN uma conta conectada, com backup na nuvem e dados no aparelho
- WHEN o usuário toca "Sair"
- THEN o token é revogado e a identidade e as datas são esquecidas
- AND o backup na nuvem e os dados locais continuam intactos

#### Scenario: Nada disso entra no backup nem cai com o reset
- GIVEN uma conta conectada com "último backup" registrado
- WHEN o usuário exporta o backup e, depois, reseta o app
- THEN o JSON não contém a identidade nem as datas
- AND, depois do reset, a conta continua conectada e as datas continuam lá

#### Scenario: Build sem client ID
- GIVEN um build feito sem `VITE_GOOGLE_CLIENT_ID`
- WHEN o usuário abre Configurações → Backup
- THEN o grupo Google Drive diz que a conta Google não está configurada neste build
- AND nenhum botão de conectar é exibido

### Requirement: Back Up to the Drive App Folder on Demand

From Configurações → Backup, with a Google account connected, the user MUST be
able to **send the full backup to Google Drive** with one tap. What is sent
MUST be **the same document** "Exportar backup" produces — built by the same
export, serialized the same way — stored as a single file in the account's
`appDataFolder`, and **overwritten** on every backup: there is one cloud copy,
and it is the last backup the user made.

Before overwriting an existing cloud copy, the app MUST tell the user the
**date of the copy being replaced** and ask for confirmation. This is the only
protection against backing up the wrong device over a good copy, and it costs
nothing extra: finding the file already returns its date.

The upload MUST use Drive's **resumable** upload, whichever the size — a
backup with photos routinely exceeds the 5 MB ceiling of the simple uploads,
and one path that handles every size beats two paths of which only the second
is ever tested.

O botão MUST mostrar a data e a hora do **último backup feito neste
aparelho**, ou "Nunca". Essa data é um registro local, gravado quando o envio
termina com sucesso, e por isso MUST aparecer sem nenhuma requisição.

Uma foto cuja imagem não pôde ser lida MUST NOT abortar o envio, e o usuário
MUST ser avisado de quantas ficaram de fora — a mesma regra do export por
arquivo.

#### Scenario: Primeiro backup na nuvem
- GIVEN uma conta conectada e nenhum backup na nuvem
- WHEN o usuário toca "Fazer backup no Drive"
- THEN o arquivo é criado na pasta oculta do Drive
- AND o botão passa a mostrar a data e a hora de agora

#### Scenario: Sobrescrever pede confirmação e diz a data
- GIVEN um backup na nuvem feito em 12/09/2026 14:03
- WHEN o usuário toca "Fazer backup no Drive"
- THEN o app pergunta se deve substituir o backup de 12/09/2026 14:03
- AND só envia depois da confirmação

#### Scenario: Cancelar não envia
- GIVEN o diálogo de substituição está aberto
- WHEN o usuário cancela
- THEN nada é enviado e a data do botão não muda

#### Scenario: O documento é o mesmo do export
- GIVEN o usuário faz um backup no Drive e, em seguida, exporta o JSON
- WHEN os dois documentos são comparados
- THEN têm a mesma forma, a mesma versão e os mesmos dados

#### Scenario: Backup grande sobe inteiro
- GIVEN um backup com fotos que serializa em mais de 5 MB
- WHEN o usuário faz o backup no Drive
- THEN o arquivo na nuvem tem o conteúdo completo

#### Scenario: A data só muda depois de dar certo
- GIVEN o envio falha no meio (rede caiu)
- WHEN o app reporta a falha
- THEN o botão continua mostrando a data do backup anterior

### Requirement: Restore From the Drive App Folder on Demand

From Configurações → Backup, with a Google account connected, the user MUST be
able to **restore the cloud copy** with one tap. The restore MUST follow the
**same path as importing a file**: the document is validated first, the user
is warned with the destructive-action confirmation that **all** local data —
photos included — will be replaced, and only then the replace-all import runs.
Nothing about what a restore does, or accepts, MUST differ between the two
transports.

The confirmation MUST state the **date of the cloud copy** about to be
restored, so the user knows which snapshot they are choosing.

O botão MUST mostrar a data e a hora da **última restauração feita neste
aparelho**, ou "Nunca" — registro local, gravado quando a restauração termina,
exibido sem nenhuma requisição.

Sem backup na nuvem, o app MUST dizer isso, sem tocar em nada.

#### Scenario: Restaurar no segundo aparelho
- GIVEN o aparelho A fez backup no Drive, e o aparelho B está conectado à mesma conta
- WHEN o usuário toca "Restaurar do Drive" em B e confirma
- THEN B passa a ter exatamente os dados de A — pesos, histórico, sessões, notas e fotos
- AND o botão de B mostra a data e a hora da restauração

#### Scenario: A confirmação diz a data da cópia
- GIVEN um backup na nuvem de 12/09/2026 14:03
- WHEN o usuário toca "Restaurar do Drive"
- THEN o diálogo avisa que todos os dados serão substituídos pelo backup de 12/09/2026 14:03

#### Scenario: Cancelar não toca no banco
- GIVEN o diálogo de restauração está aberto
- WHEN o usuário cancela
- THEN os dados locais continuam como estavam e a data do botão não muda

#### Scenario: Nenhum backup na nuvem
- GIVEN uma conta conectada que nunca fez backup
- WHEN o usuário toca "Restaurar do Drive"
- THEN o app diz que não há backup na nuvem para esta conta
- AND nada é substituído

#### Scenario: Um arquivo inválido é recusado antes de qualquer coisa
- GIVEN o arquivo na nuvem não é um backup válido do app
- WHEN o usuário toca "Restaurar do Drive"
- THEN a restauração é recusada com a mesma mensagem do import por arquivo
- AND nenhum diálogo destrutivo é exibido

### Requirement: Nothing Happens Without a Tap

The app MUST NOT talk to Google on its own. It MUST NOT sync in the
background, MUST NOT check whether a newer cloud copy exists, and MUST NOT
fetch anything on opening Settings, Backup or Account. The only network
requests to Google are the ones caused by tapping **Entrar**, **Sair**, **Fazer
backup no Drive** or **Restaurar do Drive** — plus the single profile request
that completes a sign-in.

When a tap has to go through a sign-in redirect first, the app MAY **resume**
that action on return — a pending backup runs; a pending restore reopens its
confirmation. The resumption MUST NOT skip any confirmation the direct path
would show, and MUST happen at most once per redirect.

Sem conexão, os dois botões MUST dizer que precisam de conexão e não fazer
nada. O resto do app MUST NOT ganhar nenhuma dependência desta capability:
Home, sessões, cadastros e o backup por arquivo continuam funcionando sem conta
e sem rede.

#### Scenario: Abrir a tela não gera requisição
- GIVEN uma conta conectada
- WHEN o usuário abre Configurações e, depois, Backup
- THEN nenhuma requisição ao Google é feita
- AND as datas dos botões aparecem mesmo assim

#### Scenario: Backup retomado depois do login
- GIVEN o token venceu e o usuário tocou "Fazer backup no Drive"
- WHEN o Google o devolve ao app
- THEN o backup é feito, ainda perguntando antes de sobrescrever

#### Scenario: Restauração retomada ainda confirma
- GIVEN o token venceu e o usuário tocou "Restaurar do Drive"
- WHEN o Google o devolve ao app
- THEN o diálogo destrutivo é exibido antes de qualquer escrita

#### Scenario: Recarregar não repete a ação
- GIVEN um backup foi retomado após um redirecionamento
- WHEN o usuário recarrega o app
- THEN nenhum backup é feito de novo

#### Scenario: Offline
- GIVEN o aparelho está sem conexão
- WHEN o usuário abre Configurações → Backup
- THEN os botões de Drive estão desabilitados, dizendo que precisam de conexão
- AND exportar e importar por arquivo continuam disponíveis

#### Scenario: O app não depende da conta
- GIVEN nenhuma conta foi conectada e o aparelho está offline
- WHEN o usuário usa a Home, faz um treino e edita exercícios
- THEN tudo funciona como antes
