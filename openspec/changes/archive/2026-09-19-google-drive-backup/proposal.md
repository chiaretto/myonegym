# Proposal: Conta Google e backup no Google Drive

**Change ID:** `google-drive-backup`
**Created:** 2026-09-19
**Status:** Implementation Complete
**Completed:** 2026-09-19

---

## Problem Statement

O backup do app é um **arquivo JSON que o usuário baixa e guarda**. Para um
aparelho só, é um seguro razoável. Para **dois aparelhos** — o celular na
academia e outro em casa, ou o celular velho e o novo — ele vira uma rotina
manual de exportar, mandar o arquivo para o outro lado (e-mail, AirDrop,
mensagem para si mesmo) e importar. Ninguém sustenta isso por muito tempo, e o
resultado é o que acontece hoje: o segundo aparelho fica semanas atrás do
primeiro, ou o backup simplesmente não é feito.

Há um segundo problema por baixo: o arquivo fica **onde o usuário o deixou**.
Na pasta de downloads de um celular que será trocado, no app de mensagens, em
lugar nenhum. Um backup que depende de o usuário lembrar onde o guardou não é
uma proteção contra a perda do aparelho — que é o caso em que ele mais importa.

**Afetados:** quem usa o app em mais de um aparelho, e qualquer pessoa cujo
celular um dia falha, é trocado ou tem o armazenamento do navegador apagado.

## Proposed Solution

O app ganha uma **conta Google** e um lugar na nuvem onde a cópia mora: a pasta
`appDataFolder` do Google Drive do próprio usuário, com o escopo
`drive.appdata`. Essa pasta é **oculta** — não aparece na interface do Drive e
só este app (este client OAuth) a enxerga —, o que a torna um lugar de guarda,
não uma pasta que o usuário administra. Com a mesma conta em dois aparelhos, os
dois olham para a mesma pasta.

Três decisões orientam tudo:

### 1. A nuvem é um segundo transporte para o **mesmo** documento

O que sobe para o Drive é **exatamente** o JSON que "Exportar backup" produz
hoje (`exportBackup` → `BackupDoc`), e o que desce passa pelo **mesmo** caminho
de "Importar backup" (`parseBackup` → confirmação destrutiva →
`importBackupReplaceAll`). `portability.ts` não muda. Isso mantém uma única
definição de "o que é um backup", mantém a compatibilidade entre versões que a
capability `data-portability` já garante, e faz o restore da nuvem substituir
tudo do jeito que o restore por arquivo já substitui — com a mesma confirmação.

Há **um arquivo** na pasta, `myonegym-backup.json`, sobrescrito a cada backup.
Um slot só é simples de explicar ("o backup na nuvem é o último que você fez")
e é o que o pedido descreve. Antes de sobrescrever, o app **diz a data da cópia
que vai embora** — é a única proteção contra fazer backup do aparelho errado, e
é barata: a listagem que decide entre criar e atualizar o arquivo já traz essa
data.

### 2. Nada acontece sozinho

Não há sincronização automática, verificação em segundo plano nem checagem "há
um backup mais novo?" ao abrir a tela. O app só fala com o Google quando o
usuário toca **Fazer backup**, **Restaurar** ou **Entrar/Sair**. As datas que
os botões mostram — *último backup feito* e *última restauração feita* — são
**registros deste aparelho**, gravados quando a ação termina, e por isso
aparecem sem nenhuma requisição. A data da cópia **na nuvem** aparece nas
confirmações, que já são o momento em que o app está falando com o Drive.

Isso segue o espírito do que o projeto já decidiu para o Assistente: uma tela
fala com a rede **só quando o usuário pede**, e o resto do app não sabe que
ela existe.

### 3. Login por **redirecionamento**, sem biblioteca do Google

"Login social com Google" aqui é o **OAuth 2.0 implícito** feito pelo próprio
app: um URL para `accounts.google.com` com `response_type=token`, e o token de
acesso lido do fragmento da URL quando o Google devolve o usuário ao app. Sem
`gsi/client`, sem `gapi`. Os motivos:

- **Funciona como app instalado.** A biblioteca do Google (`initTokenClient`)
  abre um **popup** e conversa com ele por `postMessage`; em PWA standalone no
  iOS o popup vira uma folha de navegador que não consegue falar de volta, e o
  login nunca termina. Um redirecionamento de página inteira é o caminho que os
  navegadores standalone de fato suportam.
- **Não existe backend para o fluxo com código.** O fluxo de autorização por
  código precisa trocar o código por token com um segredo, que este app não
  tem onde guardar. O implícito é o fluxo desenhado para apps só de cliente.
- **Nenhum script externo no bundle offline.** O app continua sendo código
  próprio; a única coisa que o Google precisa fornecer é a página de
  consentimento, e só quando o usuário pediu.

O custo: o token dura cerca de **uma hora** e não se renova sem uma ida ao
Google. Como toda ação é manual, isso cabe bem — um token vencido no momento do
toque vira um redirecionamento silencioso (`prompt=none`) e, na volta, o app
**retoma o que o usuário tinha pedido**: um backup pendente é feito; uma
restauração pendente volta a **pedir a confirmação** (ela nunca é pulada). O
token vive apenas na sessão do navegador; o que persiste no aparelho é a
**identidade** (nome, e-mail, foto), para a tela dizer quem está conectado.

### O que o usuário vê

A conta é **opcional, e só para quem for usar o backup no Drive**. O app não
tem tela de login, não pede para entrar ao abrir e não ganha nenhum lembrete
em lugar algum: quem nunca conectar uma conta usa o app exatamente como hoje.
O único ponto de entrada fica onde a conta serve para alguma coisa:

- **Configurações → Backup**, grupo novo **"Google Drive"**, depois de
  Importar.
  - **Desconectado:** uma única linha, "Conectar conta Google", com o subtítulo
    dizendo que é opcional e que serve só para guardar o backup no Drive do
    próprio usuário. Toca, faz o login, volta para esta tela.
  - **Conectado:** uma linha com o avatar e o e-mail (leva a
    `/settings/account`), **"Fazer backup no Drive"** com "Último backup:
    dd/mm/aaaa hh:mm" no subtítulo, e **"Restaurar do Drive"** com "Última
    restauração: …". Sem registro, o subtítulo diz "Nunca".
- **`/settings/account`**, alcançada só pela linha acima: mostra quem está
  conectado, explica **o que** é compartilhado (só o backup, numa pasta oculta
  do seu próprio Drive), como remover o acesso pela conta Google, e tem o
  botão "Sair".
- A tela principal de Configurações **não** ganha grupo nem linha de conta. A
  nota de rodapé ("seus dados ficam neste dispositivo…") passa a citar o
  backup no Drive como a segunda exceção, ao lado do Assistente.
- Offline, os dois botões dizem que precisam de conexão e não fazem nada.

## Scope

### In Scope
- `src/lib/googleAuth.ts`: montar o URL de autorização, validar `state`,
  ler e limpar o fragmento na volta, guardar o token na sessão, revogar ao
  sair; `initGoogleAuth()` chamado em `main.tsx` antes da primeira renderização
  (a volta do Google é um boot do app).
- `src/state/googleAccount.ts`: identidade conectada, `lastBackupAt`,
  `lastRestoreAt` e a ação pendente — zustand + `persist`, chave própria,
  fora do backup e fora de `resetAll`, como `assistantToken`.
- `src/lib/driveBackup.ts`: listar, enviar (upload **resumable**, porque o
  multipart tem teto de 5 MB e um backup com fotos passa disso) e baixar o
  arquivo em `appDataFolder`, via `fetch`, sem SDK.
- Página `/settings/account` (alcançada apenas pela tela de Backup) e grupo
  "Google Drive" em `DataPage`. `SettingsPage` só atualiza a nota de rodapé.
- `VITE_GOOGLE_CLIENT_ID` por variável de ambiente; `deploy.yml` a injeta a
  partir de uma *repository variable*. Sem ela, a conta aparece como "não
  configurada neste build" em vez de um botão que falha.
- Escopos: `drive.appdata` + `openid email profile` (o perfil é só para a tela
  dizer quem entrou). Um consentimento que **não** concedeu `drive.appdata`
  é tratado, não presumido.
- Testes: unidade dos três módulos (URL, fragmento, `state`, retomada da ação,
  upload/download com `fetch` dublado) e integração das duas telas.
- `openspec/project.md`: a decisão 10 ("uma tela fala com a rede") passa a
  contar duas, e ganha a regra do login por redirecionamento.

### Out of Scope
- **Login obrigatório, tela de login ou lembrete para entrar.** A conta é
  opcional e só existe para o backup no Drive; nada no app a pede.
- **Sincronização automática, merge ou resolução de conflito.** Restaurar
  substitui tudo, como o import por arquivo. O usuário decide a direção.
- **Histórico de backups na nuvem** (vários slots, "voltar para a versão de
  terça"). Um arquivo, sobrescrito.
- **Apagar o backup da nuvem** pelo app. Revogar o acesso em
  *myaccount.google.com/permissions* apaga a pasta oculta; a tela diz isso.
- **Outros provedores** (iCloud, Dropbox). O módulo de Drive é pequeno e
  isolado, mas nada é abstraído antes de haver um segundo.
- **Backup de preferências do aparelho** (fonte, cor, chave do assistente).
  Continuam fora do documento, pelas razões que `data-portability` já dá.
- **Renovação silenciosa contínua** do token (iframe, refresh token). O token
  é pedido quando uma ação precisa dele.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | O documento é o mesmo; Dexie não muda |
| API | Yes | Google OAuth 2.0 (implícito, redirecionamento) e Drive API v3 (`files` em `appDataFolder`), por `fetch` |
| State | Yes | `state/googleAccount.ts` (persist, chave própria) e o token de sessão em `lib/googleAuth.ts` |
| UI | Yes | `AccountPage.tsx` (nova), grupo em `SettingsPage`, grupo em `DataPage` |
| Build | Yes | `VITE_GOOGLE_CLIENT_ID` (`import.meta.env`), `.env.example`, `deploy.yml` |
| Docs | Yes | `project.md`, decisão 10 e a regra do login por redirecionamento |

## Architecture Considerations

- **`portability.ts` é a fronteira, e ela não se move.** O Drive recebe um
  `BackupDoc` serializado e devolve uma string que passa por `parseBackup`.
  Nenhuma validação, migração ou normalização é duplicada; se o formato mudar,
  a nuvem acompanha de graça.
- **A volta do Google é um boot.** O redirecionamento recarrega o app, então o
  fragmento tem de ser lido **antes** da primeira renderização (em `main.tsx`,
  ao lado de `initInstall`/`initAppUpdate`), o `state` conferido contra o
  valor guardado, e a URL limpa com `history.replaceState` para o token não
  ficar no histórico. A ação pendente e o `state` vivem em `sessionStorage`:
  sobrevivem à navegação, morrem com a aba.
- **O que persiste é identidade e datas; o token não.** Mesma disciplina do
  `assistantToken`: chave de storage própria, fora do backup, fora do
  `resetAll` (um reset apaga dados cadastrados; "conectado com fulano" e "último
  backup em…" são fatos sobre o aparelho, e continuam verdadeiros).
- **`sessionStorage` para o token, `localStorage` para a identidade.** Um
  token de uma hora não tem o que fazer no `localStorage`; a identidade precisa
  estar lá para a tela abrir dizendo quem está conectado sem ir à rede.
- **Retomar a ação, nunca pular a confirmação.** A retomada pós-redirecionamento
  existe para o token vencido não custar dois toques; ela **não** pode fazer
  uma restauração passar sem o diálogo destrutivo. O backup retomado é seguro
  por natureza — ele só escreve na nuvem, e diz a data do que sobrescreveu.
- **Upload resumable sempre.** Um só caminho de envio, que aceita qualquer
  tamanho, em vez de dois (multipart até 5 MB, resumable acima) que só o
  segundo teste exercitaria.
- **O client ID é público e é uma identidade.** Ele vai no bundle sem segredo
  algum — é assim que o fluxo implícito funciona —, mas a `appDataFolder` é
  **por client**: trocar o client ID esconde de todo mundo o backup que já
  existe. É uma constante de deploy que não se rotaciona por descuido.
- **Origens autorizadas.** O Google só aceita `localhost` e domínios como
  origem JavaScript; `https://192.168.x.x:5173` não entra. Testar no celular
  em dev exige o certificado local **e** um nome (`localhost` via port-forward,
  ou um hostname). Fica dito aqui para não virar uma tarde perdida.

## Success Criteria

- [ ] Quem nunca conecta uma conta usa o app exatamente como hoje: nenhuma
      tela de login, nenhum pedido para entrar, nenhuma linha nova fora do
      grupo "Google Drive" da tela de Backup.
- [ ] Com a mesma conta Google em dois aparelhos, "Fazer backup" num e
      "Restaurar" no outro deixam o segundo **idêntico** ao primeiro — pesos,
      histórico, sessões, fotos.
- [ ] O login conclui **no app instalado** (standalone) em iOS e Android, e
      volta para a tela de onde saiu.
- [ ] Os botões mostram a data do último backup e da última restauração
      **feitos neste aparelho**, sem nenhuma requisição ao abrir a tela.
- [ ] Nenhuma requisição ao Google acontece sem um toque em Backup, Restaurar,
      Entrar ou Sair (verificável pela aba Network).
- [ ] Antes de sobrescrever, a confirmação diz a data do backup que está na
      nuvem; antes de restaurar, idem — e o restore só acontece depois do
      diálogo destrutivo, mesmo quando retomado após um redirecionamento.
- [ ] Um backup com fotos acima de 5 MB sobe e desce inteiro.
- [ ] Sair revoga o token, esquece a identidade e as datas, e **não** apaga o
      backup da nuvem nem os dados locais.
- [ ] Offline, Home e as sessões seguem como antes; os botões de Drive
      explicam que precisam de conexão.
- [ ] Um build sem `VITE_GOOGLE_CLIENT_ID` roda, com a conta marcada como não
      configurada. O `dist/` não carrega nenhum script de terceiros.
- [ ] Suíte verde, `tsc --noEmit` limpo, `openspec validate --strict` limpo.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O redirecionamento não voltar ao app standalone (iOS) | Med | High | Fluxo de página inteira dentro do escopo do PWA, `redirect_uri` = a própria raiz do app; verificar em aparelho antes de arquivar. Plano B documentado: `ux_mode` do GIS não serve; seria abrir o login no navegador e concluir lá |
| Token vencido no meio de um upload grande | Low | Med | O token é conferido (com folga) **antes** de começar; o upload resumable é uma única sessão curta |
| Backup do aparelho errado sobrescreve a cópia boa | Med | High | A confirmação diz a data da cópia atual na nuvem antes de sobrescrever |
| Restauração retomada sem confirmação após o redirecionamento | Low | High | A retomada só reabre o diálogo; a escrita continua atrás dele. Teste de integração cobre esse caminho |
| App OAuth em modo "Testing" barra contas que não são test users | High | Low | Registrar as contas usadas como *test users*; `drive.appdata` é escopo não sensível, então publicar não exige verificação |
| Consentimento granular sem `drive.appdata` | Low | Med | O fragmento traz `scope`; sem o escopo, a tela diz que o acesso ao Drive não foi concedido e oferece entrar de novo |
| Storage particionado no PWA (sessão Google separada do Safari) | High | Low | Esperado: o primeiro login dentro do app instalado pede senha mesmo com o Safari logado. A tela não promete o contrário |
| Client ID rotacionado esconde os backups existentes | Low | High | Registrado aqui e em `project.md`; a variável de deploy tem comentário dizendo por quê |

---

## Archive Information

**Archived:** 2026-09-19
**Duration:** mesmo dia (proposta, implementação e arquivamento em 2026-09-19)
**Outcome:** Implementado. A verificação em aparelho instalado (tarefas 4.4–4.5)
fica para depois do deploy, como no change `add-app-update-check` — em dev, o
fluxo de login chegou à tela do Google e voltou ao app, depois de três acertos
no console: o **client secret** tinha sido colado no lugar do client ID
(`invalid_client`), o URI de redirecionamento precisava da barra final
(`redirect_uri_mismatch`), e a conta precisava estar como test user
(`access_denied`). Os três estão registrados no `.env.example` e em `tasks.md`
para o próximo aparelho.

**Ajuste durante o apply:** a pedido do usuário, a conta ficou **opcional e
sem ponto de entrada fora da tela de Backup** — o grupo "Conta" no topo das
Configurações, previsto na primeira versão da proposta, foi retirado antes de
existir. E o grupo Google Drive foi movido para depois de Importar.

### Files Modified
- `src/lib/googleAuth.ts` — fluxo implícito por redirecionamento, `state`,
  limpeza do fragmento, token de sessão, revogação (novo)
- `src/lib/driveBackup.ts` — listar, enviar (resumable) e baixar em
  `appDataFolder`, via `fetch` (novo)
- `src/lib/cloudBackup.ts` — as duas ações sobre `portability.ts`, conclusão
  do login, retomada pós-redirecionamento (novo)
- `src/lib/online.ts` — `useOnline()` (novo)
- `src/lib/format.ts` — `fmtDateTime`, agora também usado por `UpdatePage`
- `src/state/googleAccount.ts` — identidade e datas, fora do backup e do reset (novo)
- `src/features/settings/AccountPage.tsx`, `account.css` — a tela da conta (novos)
- `src/features/settings/DataPage.tsx` — grupo Google Drive, depois de Importar
- `src/features/settings/SettingsPage.tsx` — nota de rodapé e subtítulo de Backup
- `src/App.tsx` — rota `/settings/account`
- `src/main.tsx` — `initGoogleAuth()` antes da primeira renderização
- `src/styles/global.css` — `.group-note` deixou de ser flex (defeito anterior,
  exposto pelo grupo novo: cada `<strong>` caía numa coluna própria)
- `src/vite-env.d.ts`, `.env.example`, `.github/workflows/deploy.yml` —
  `VITE_GOOGLE_CLIENT_ID`
- `openspec/project.md` — decisão 10 e a convenção do login por redirecionamento
- Testes (novos): `googleAuth.test.ts` (24), `driveBackup.test.ts` (11),
  `googleAccount.test.ts` (4), `cloudBackup.test.tsx` (17),
  `account.integration.test.tsx` (15)

### Specs Updated
- `openspec/specs/cloud-backup/spec.md` — capability nova, 4 requisitos
- `openspec/specs/app-foundation/spec.md` — *Local Browser Persistence*
  modificado (nada sai do aparelho sem ação explícita)
- `openspec/specs/data-portability/spec.md` — +1 requisito (*The Cloud Copy Is
  the Export Document*)

### Verificação
- `npm test` — 97 arquivos, 1307 testes passando
- `npm run typecheck` — limpo
- `npm run build` — um único `<script>` em `index.html`; a única menção ao
  Google no bundle é o URL de autorização
- `npx openspec validate --specs --strict` — 17/18; a falha é `exercises`,
  **anterior a esta mudança** (arquivo idêntico ao de `origin/main`)
