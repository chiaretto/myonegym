# Implementation Tasks: Conta Google e backup no Google Drive

**Change ID:** `google-drive-backup`

---

## Phase 0: Google Cloud (fora do repositório, feito pelo usuário)

- [x] 0.1 Criar o projeto no Google Cloud Console e ativar a **Google Drive API**
- [x] 0.2 Tela de consentimento OAuth: app "MyOneGym", escopos `drive.appdata`, `openid`, `email`, `profile`; adicionar as contas que serão usadas como *test users* (ou publicar — escopo não sensível, sem verificação)
- [x] 0.3 Credencial **OAuth client ID, tipo Web**: origens JavaScript `https://chiaretto.github.io`, `http://localhost:5173`, `https://localhost:5173`; URIs de redirecionamento `https://chiaretto.github.io/myonegym/`, `http://localhost:5173/`, `https://localhost:5173/`
- [x] 0.4 Guardar o client ID como *repository variable* `GOOGLE_CLIENT_ID` no GitHub e em `.env.local` para dev

**Quality Gate:** PASSED
- [x] O URL de autorização montado pelo app abre a tela do Google sem `redirect_uri_mismatch` (verificado em dev, em `https://localhost:5173`, depois de acertar client ID — o secret tinha sido colado no lugar —, o URI de redirecionamento com a barra final, e a conta como test user)

---

## Phase 1: Foundation (auth, estado e cliente do Drive)

- [x] 1.1 `.env.example` com `VITE_GOOGLE_CLIENT_ID=` comentado (o que é, por que não é segredo, por que não se rotaciona); `src/vite-env.d.ts` tipa a variável
- [x] 1.2 `.github/workflows/deploy.yml`: `VITE_GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }}` no passo de build
- [x] 1.3 `src/state/googleAccount.ts` — zustand + `persist` em `myonegym.googleAccount`: `profile` (`name`, `email`, `picture`) ou `null`, `lastBackupAt`, `lastRestoreAt` (epoch ms ou `null`); `disconnect()` zera tudo. Fora do backup e de `resetAll`, como `assistantToken`. `onRehydrateStorage` sanitiza tipos
- [x] 1.4 `src/lib/googleAuth.ts`:
  - `isConfigured()` (client ID presente)
  - `beginSignIn(intent)` — gera `state` aleatório, grava `{ state, intent, returnTo }` em `sessionStorage`, navega para `accounts.google.com/o/oauth2/v2/auth` com `response_type=token`, `include_granted_scopes`, `redirect_uri` = raiz do app (`BASE_URL`)
  - `initGoogleAuth()` — chamado em `main.tsx`: lê o fragmento, confere `state`, guarda `{ token, expiresAt, scopes }` em `sessionStorage`, limpa a URL com `replaceState`, devolve a intenção pendente; um fragmento com `error` (ex.: `interaction_required` do `prompt=none`) vira uma intenção "entrar de novo, com prompt"
  - `getToken()` — token válido com folga de 60 s, ou `null`
  - `hasDriveScope()` — o consentimento granular pode negar `drive.appdata`
  - `signOut()` — `POST oauth2.googleapis.com/revoke` (best effort) e limpa sessão
  - `fetchProfile(token)` — `oauth2/v3/userinfo`
- [x] 1.5 `src/lib/driveBackup.ts`, via `fetch`, sem SDK: `findBackup(token)` (`files?spaces=appDataFolder&q=name='myonegym-backup.json'&fields=files(id,modifiedTime,size)`), `uploadBackup(token, json, existingId?)` (**resumable**: `POST/PATCH …/upload/drive/v3/files[/{id}]?uploadType=resumable` com metadata `{ name, parents: ['appDataFolder'] }`, depois `PUT` no `Location`), `downloadBackup(token, id)` (`files/{id}?alt=media`). Erros HTTP viram `DriveError` com mensagem em português (401/403 → "acesso vencido, entre de novo"; 404 → "nenhum backup na nuvem"; rede → "sem conexão")
- [x] 1.6 Testes de unidade: `googleAuth.test.ts` (URL montado, `state` conferido e rejeitado, fragmento limpo da URL, expiração, escopo ausente, intenção pendente devolvida uma vez só) e `driveBackup.test.ts` (`fetch` dublado: criar vs atualizar, `Location` do resumable, `alt=media`, mapeamento de erros). `googleAccount.test.ts` (rehidratação suja, `disconnect`)

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de unidade passam sem rede e sem relógio real (24 + 11 + 4)
- [x] Nenhum `import` de script externo; `dist/` sem referência a `accounts.google.com` além do URL de navegação

---

## Phase 2: Business Logic (as duas operações)

- [x] 2.1 `src/lib/cloudBackup.ts` — orquestra sobre `portability.ts` sem tocá-lo:
  - `backupToDrive()`: token (ou `beginSignIn('backup')`) → `findBackup` → confirmação "substituir o backup de dd/mm hh:mm?" quando existe → `exportBackup` → `JSON.stringify` compacto → `uploadBackup` → `lastBackupAt = now` → contagem de fotos sem imagem, como no export por arquivo
  - `restoreFromDrive()`: token (ou `beginSignIn('restore')`) → `findBackup` (404 → aviso) → `downloadBackup` → `parseBackup` (valida antes de qualquer confirmação) → diálogo destrutivo com a data da cópia na nuvem → `importBackupReplaceAll` → `reconcile()` → `lastRestoreAt = now`
  - A confirmação é injetada (o `useConfirm` da tela), para o módulo ficar testável e o diálogo nunca ser pulado
- [x] 2.2 Retomada pós-redirecionamento: `initGoogleAuth()` devolve a intenção; `App`/`DataPage` a consome **uma vez**: `backup` → roda `backupToDrive()` (que ainda pergunta se vai sobrescrever); `restore` → roda `restoreFromDrive()`, cujo diálogo destrutivo continua no caminho; `connect` → só busca o perfil. `returnTo` leva de volta a `/settings/data` ou `/settings/account`
- [x] 2.3 Primeira conexão: após o token, `fetchProfile` e `profile` gravado; escopo do Drive ausente → perfil gravado **e** aviso "acesso ao Drive não concedido", com "Entrar de novo" (sem `prompt=none`)
- [x] 2.4 `cloudBackup.test.ts`: os dois fluxos com `fetch` e confirmação dublados; "não confirma → nada sobe / nada muda no banco"; token vencido → `beginSignIn` com a intenção certa; retomada de `restore` ainda pede confirmação; `lastBackupAt` só grava depois do `PUT` responder 200

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] `portability.ts` sem diff
- [x] Nenhum caminho grava no banco sem passar pela confirmação (17 testes em `cloudBackup.test.tsx`)

---

## Phase 3: User Interface

- [x] 3.1 `src/features/settings/AccountPage.tsx` + rota `/settings/account`, alcançada só pela linha da conta na tela de Backup: hero com avatar/nome/e-mail; sem conta, redireciona para `/settings/data` (a tela não tem o que mostrar); "Sair" (revoga, esquece identidade e datas, **não** apaga a nuvem nem o local — o texto diz isso); nota do que é compartilhado (só o backup, pasta oculta do seu Drive) e de como remover o acesso pela conta Google. Estado "não configurado neste build" quando `!isConfigured()`
- [x] 3.2 `SettingsPage.tsx`: **nenhum** grupo ou linha de conta — a conta é opcional e só entra para quem usa o Drive. Só a nota de rodapé passa a citar o backup no Drive como segunda exceção ao "sem login e sem servidor"
- [x] 3.3 `DataPage.tsx`: grupo **Google Drive** depois de Importar. Conectado: linha da conta (avatar + e-mail → `/settings/account`), "Fazer backup no Drive" (sub: "Último backup: dd/mm/aaaa hh:mm" ou "Nunca") e "Restaurar do Drive" (sub `warn`: "Última restauração: …" + "substitui todos os dados"). Desconectado: só "Conectar conta Google", subtítulo "Opcional · guarda o backup no seu Google Drive" (`beginSignIn('connect', '/settings/data')`). Offline (`navigator.onLine` + `online/offline`): linhas desabilitadas com "Precisa de conexão". Datas por `lib/format`, nunca `toLocaleString` solto
- [x] 3.4 `busy` compartilhado com os botões existentes; toasts: "Backup enviado ao Drive.", "Backup restaurado do Drive.", e as mensagens de `DriveError`
- [x] 3.5 `account.integration.test.tsx` e ampliação de `backup-restore.integration.test.tsx`: Configurações sem nenhuma linha de conta; sem conta, a tela de Backup mostra só a linha opcional de conectar; datas "Nunca" e formatadas; offline desabilita; restore confirma antes de escrever e cancela sem tocar no banco; backup avisa a data que vai sobrescrever; não configurado não mostra botão que falharia

**Quality Gate:** PASSED
- [x] `npm run typecheck` limpo
- [x] Testes de integração passam (15 em `account.integration.test.tsx`)
- [x] Nenhum botão onde ele não faria nada

---

## Phase 4: Integration & Polish

- [x] 4.1 Textos em pt-BR revisados (inline, como o resto)
- [x] 4.2 `openspec/project.md`: decisão 10 passa a nomear as **duas** telas que falam com a rede, ambas só a pedido; convenção nova sobre o login por redirecionamento (por que não `gsi/client`, o que vive em `sessionStorage`, a `appDataFolder` ser por client ID)
- [x] 4.3 `npm run build`: sem script de terceiros em `dist/` — a única menção ao Google no bundle é o URL de autorização; um `<script>` só em `index.html`
- [ ] 4.4 **Pendente, depende de deploy e das contas de teste.** Verificar em aparelho, app **instalado**: login volta ao app (iOS e Android); backup num aparelho e restore no outro; backup > 5 MB com fotos; token vencido após 1 h retoma o backup; sair e entrar de novo reencontra o mesmo arquivo
- [ ] 4.5 **Pendente, em aparelho.** Aba Network: abrir Configurações e Backup não dispara requisição alguma ao Google
- [x] 4.6 Suíte completa verde (97 arquivos, 1307 testes); `npx openspec validate google-drive-backup --strict` válido

**Quality Gate:** PASSED (com a ressalva de 4.4–4.5, que exigem deploy)
- [x] Todos os testes passam
- [x] `tsc --noEmit` limpo
- [x] Documentação sincronizada (`openspec/project.md`)
- [ ] Verificado em aparelho iOS e Android

---

## Completion Checklist

- [x] Phases 0–3 completas; Phase 4 completa no que não depende de deploy
- [x] All quality gates passed
- [x] Documentation synced
- [ ] Verificação em aparelho (4.4–4.5) — antes ou depois do merge, a critério do usuário
- [x] Ready for `/openspec-archive` — arquivado com 4.4–4.5 pendentes de deploy, como no change `add-app-update-check`

---

## Notas de implementação

**`.group-note` deixou de ser flex.** A regra em `global.css` era
`display: flex` para pôr o ícone ao lado do texto — mas isso torna cada
`<strong>` e cada trecho de texto entre eles um item de flex, e uma nota com
uma palavra em destaque saía em colunas estreitas, uma palavra por linha.
Anterior a este change (vem do change de fotos, #11), mas foi o grupo Google
Drive que o expôs. A nota virou parágrafo normal, com o ícone inline; vale
para todas as notas de Backup, Conta e Assistente.
