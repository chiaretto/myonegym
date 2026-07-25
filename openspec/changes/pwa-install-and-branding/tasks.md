# Implementation Tasks: Instalar o app pelas Configurações, com ícone e splash próprios

**Change ID:** `pwa-install-and-branding`

---

## Phase 1: Foundation (Ícones e manifesto)

- [x] 1.1 Adicionar `@vite-pwa/assets-generator` como `devDependency` e o script
      `"pwa-assets": "pwa-assets-generator"` no `package.json` (fora de
      `npm run build`, para não tornar o deploy dependente de `sharp`) ✓ 2026-07-25
- [x] 1.2 Criar `pwa-assets.config.ts` tendo `public/icon.png` como master:
      ícones `any` 64/192/512, `maskable` 512 com `padding` e fundo sólido
      `#14171D`, `apple-touch-icon` 180 opaco e `favicon.ico`. A fonte é **raster,
      não vetor** — ver "Decisões" ✓ 2026-07-25
- [x] 1.3 Rodar `npm run pwa-assets` e commitar os PNGs gerados em `public/`
      — 6 arquivos, 92 KB no total ✓ 2026-07-25
- [x] 1.4 Conferir visualmente o `maskable-icon-512x512.png`: a marca inteira
      (inclusive as chapas vermelhas externas) cabe na zona segura de 80%, e o
      fundo é *full-bleed* (sem cantos transparentes) ✓ 2026-07-25
- [x] 1.5 Atualizar o `manifest` em `vite.config.ts`: listar os PNGs com `sizes`
      e `purpose` corretos e declarar um `id` estável para o app ✓ 2026-07-25
- [x] 1.6 ~~Ativar a integração `pwaAssets` no `VitePWA`~~ → **descartado**;
      `apple-touch-icon` e os 20 `apple-touch-startup-image` foram escritos
      diretamente no `index.html`. Ver "Decisões" ✓ 2026-07-25
- [x] 1.7 Acrescentar ao `index.html` as metas do iOS:
      `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` (MyOneGym) e
      `apple-mobile-web-app-status-bar-style: black` (não `black-translucent` —
      o CSS não trata `safe-area-inset-top`) ✓ 2026-07-25
- [x] 1.8 Habilitar `devOptions.enabled` no `VitePWA` para que o service worker
      exista em desenvolvimento ✓ 2026-07-25
- [x] 1.9 (extra) Remover `public/icon.svg` e `public/favicon.svg`: eram uma
      reconstrução aproximada da marca, com a cor digitada à mão, e o master
      raster os torna redundantes. O favicon passa a ser `favicon.ico` +
      `pwa-64x64.png`. Ver "Decisões" ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npm run build` gera todos os ícones no `dist` e o manifesto os referencia
      (`id`, 4 ícones, `scope`/`start_url` sob `/myonegym/`)
- [x] Caminhos com base de produção conferidos no `dist/index.html`
      (`/myonegym/apple-touch-icon-…`), já que os `href` são absolutos na fonte
- [ ] Chrome DevTools → Application → Manifest — **pendente (manual, Phase 5)**
- [x] Nenhuma cor de marca **nova** foi inventada: as duas constantes em
      `pwa-assets.config.ts` são cópias documentadas de tokens existentes, e o
      saldo de cópias está declarado no delta spec

---

## Phase 2: Telas de abertura

- [x] 2.1 Criar `scripts/gen-splash.mjs` + script `"splash"`, tendo
      `new-design/assets/splash-master.png` como master: 20
      `apple-splash-*.png` (um por `<link>` do `index.html`) e `splash.webp`
      ✓ 2026-07-25
- [x] 2.2 Ler a lista de tamanhos **do próprio `index.html`** em vez de duplicá-la
      no script: os 20 `<link rel="apple-touch-startup-image">` são o contrato
      real com o iOS, então acrescentar um aparelho é mexer em um arquivo só
      ✓ 2026-07-25
- [x] 2.3 Quantizar a paleta dos PNGs: a arte é fotográfica e em cor plena daria
      37 MB no conjunto; quantizada fica em ~9,2 MB sem perda visível (a
      composição é quase monocromática, cinzas escuros e um vermelho)
      ✓ 2026-07-25
- [x] 2.4 Splash de boot no `index.html`: `<div id="splash">` com estilo **inline**
      (uma folha externa seria uma segunda ida à rede, e splash que aparece tarde
      é pior que splash nenhuma), pintando `splash.webp` sobre `#050607`
      ✓ 2026-07-25
- [x] 2.5 `src/lib/bootSplash.ts`: remoção do elemento após o segundo
      `requestAnimationFrame` (quando já há algo pintado por baixo), com piso de
      600 ms para não piscar num início a quente e teto de 4 s para o caso de a
      aba estar em segundo plano e nunca receber frame ✓ 2026-07-25
- [x] 2.6 Excluir os `apple-splash-*` e o `icon.png` do precache
      (`workbox.globIgnores`), e **incluir** `webp` em `globPatterns` — a splash
      de boot também precisa pintar num início a frio offline ✓ 2026-07-25
- [x] 2.7 Testes: `src/lib/bootSplash.test.ts` (4) e
      `src/lib/installAssets.test.ts` (8), este último a guarda de integridade
      entre as referências escritas à mão e os arquivos gerados ✓ 2026-07-25
- [x] 2.8 (extra) Mover o master da splash de `new-design/reference/`
      (gitignorado) para `new-design/assets/` (versionado): um gerador cuja fonte
      não está no repositório não pode ser reexecutado a partir de um checkout
      limpo ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npm run splash` reexecutado do zero: 20 imagens + `splash.webp` idênticas
- [x] `dist/sw.js` não contém nenhum `apple-splash-*` nem `icon.png`, e contém
      `splash.webp` — precache com 26 entradas / 1453,81 KiB
- [x] `url('/myonegym/splash.webp')` conferido no `dist/index.html`

---

## Phase 3: Business Logic (Estado de instalação)

- [x] 3.1 Criar `src/lib/install.ts`: captura de `beforeinstallprompt`
      (com `preventDefault()` e guarda do evento), listener de `appinstalled`,
      e detecção de standalone via `matchMedia('(display-mode: standalone)')`
      e `navigator.standalone` ✓ 2026-07-25
- [x] 3.2 Expor um store (padrão do projeto: zustand, **sem** `persist`) com
      `canInstall`, `isInstalled`, `platform` (`android` | `ios` | `other`) e a
      ação `promptInstall()` que chama `prompt()` e resolve com `userChoice`
      ✓ 2026-07-25
- [x] 3.3 Importar o módulo no topo de `src/main.tsx`, antes do
      `createRoot(...).render(...)`, junto de `applyFontScale` ✓ 2026-07-25
- [x] 3.4 Testes unitários em `src/lib/install.test.ts` (17): evento capturado e
      `canInstall` verdadeiro; `promptInstall()` chama `prompt()` e limpa o
      evento após uso (não se pode promptar duas vezes); `appinstalled` marca
      instalado; detecção de standalone e de iOS (incluindo iPad com UA de Mac);
      e a garantia de que nada é persistido ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo (tipagem própria para `BeforeInstallPromptEvent`)
- [x] Transições de estado cobertas por teste (17/17)

---

## Phase 4: User Interface

- [x] 4.1 Criar `src/features/settings/InstallPage.tsx` com os quatro estados:
      instalável (botão "Instalar app"), iOS (instruções passo a passo),
      já instalado (confirmação) e sem suporte (orientação de navegador)
      ✓ 2026-07-25
- [x] 4.2 Registrar a rota `/settings/install` em `src/App.tsx`, com cabeçalho e
      voltar no mesmo padrão das demais páginas de Configurações ✓ 2026-07-25
- [x] 4.3 Adicionar em `SettingsPage.tsx` o grupo "App" com a `NavRow`
      "Instalar app", cujo subtítulo reflete o estado (instalável / instruções /
      já instalado) ✓ 2026-07-25
- [x] 4.4 Colocar o botão primário na `ActionBar` fixa, conforme o requisito
      "Floating Action Bar for Primary Actions" — e só nesse estado, já que a
      `ActionBar` some quando não tem filhos ✓ 2026-07-25
- [x] 4.5 Estilos apenas por tokens existentes (nenhum `font-size` em pixel
      literal; nenhuma cor fora de `tokens.css`) — `install.css` reaproveita
      `.group`, `.row`, `.wordmark` ✓ 2026-07-25
- [x] 4.6 Testes de integração em
      `src/features/settings/install.integration.test.tsx` (8): botão só aparece
      com evento disponível; toque chama `prompt()`; recusa não marca instalado;
      iOS mostra instruções e nenhum botão; instalado vence um evento pendente;
      navegador sem suporte; e a navegação a partir de Configurações
      ✓ 2026-07-25

**Quality Gate:** PASSED
- [x] `npx tsc -b --noEmit` limpo
- [x] Testes de integração passam (8/8)
- [ ] Layout de 100% a 200% de `--font-scale` — **pendente (manual, Phase 5)**:
      não há navegador executável neste ambiente (o Chromium do cache do
      Playwright não sobe, falta `libnspr4`)

---

## Phase 5: Integration & Polish

- [x] 5.1 Textos em pt-BR literal, no tom das demais telas (o app não usa i18n)
      ✓ 2026-07-25
- [x] 5.2 `npx vitest run` (315/315, 44 arquivos) e `npm run build` completos
      ✓ 2026-07-25
- [x] 5.3 (extra) `scripts/dev-cert.sh` + `npm run dev-cert` e `server.https`
      condicional no `vite.config.ts`, sem os quais o caminho de instalação não
      pode ser exercitado de um celular. Ver "Decisões" ✓ 2026-07-25
- [ ] 5.4 QA em Android/Chrome (HTTPS): instalar pelo botão, conferir ícone na
      gaveta/tela inicial, a splash de boot com a arte, e abertura em modo
      standalone — **pendente (manual)**
- [ ] 5.5 QA em iOS/Safari: seguir as instruções, conferir o ícone (opaco, sem
      captura de página), a passagem da tela de abertura nativa para a splash de
      boot, e a barra de status escura — **pendente (manual)**
- [ ] 5.6 Reabrir Configurações no app instalado e confirmar o estado "já
      instalado" nos dois sistemas — **pendente (manual)**
- [x] 5.7 Atualizar `openspec/project.md`: as duas linhas de geração de assets na
      tabela de stack e a convenção "assets de instalação são gerados, nunca
      desenhados à mão", agora com as duas cadeias ✓ 2026-07-25

**Quality Gate:** PASSED (automatizado)
- [x] Todos os testes passam (315/315, 44 arquivos)
- [x] Análise estática limpa (`npx tsc -b --noEmit`)
- [x] `npm run build` OK; precache com 26 entradas / 1453,81 KiB, sem nenhuma
      imagem de lançamento do iOS
- [ ] QA manual nos dois sistemas — pendência declarada abaixo

---

## Decisões tomadas durante a implementação

### 1.2 e 1.9 · O master do ícone é PNG, e os SVGs saíram

A proposta original dizia "`public/icon.svg` como única fonte de verdade". Na
prática esse SVG **não era a marca** — era uma reconstrução aproximada, feita à
mão, com a cor do accent digitada dentro do arquivo. A arte real do ícone só
existe na folha de handoff do design (`new-design/assets/icones.png`), em raster.

Gerar a partir da reconstrução significaria propagar a aproximação para todos os
tamanhos. Então o master passou a ser `public/icon.png`: a maior renderização da
folha (o tile do iOS, 311px) recortada e reamostrada para 1024. Com ele no lugar,
`public/icon.svg` e `public/favicon.svg` não tinham mais função — o favicon virou
`favicon.ico` + `pwa-64x64.png`, ambos gerados — e foram removidos.

Custo declarado: o manifesto não tem mais uma entrada `any` vetorial, e o master
é raster, então um redesenho futuro parte de 1024px. Se um vetor aparecer, é
trocar `images:` em `pwa-assets.config.ts` e regerar.

### 1.6 · Sem a integração `pwaAssets` do `vite-plugin-pwa`

A proposta previa ligar `pwaAssets` no plugin para que ele injetasse os `<link>`
sozinho. Isso foi descartado porque **o plugin regenera as imagens durante o
build**, o que colocaria `sharp` (binário nativo) no caminho crítico do deploy —
exatamente o que a spec proíbe ("Build não depende do gerador de imagens").

Em vez disso: os PNGs ficam versionados, o manifesto lista os ícones
explicitamente em `vite.config.ts` e o `index.html` traz o `apple-touch-icon`
mais os 20 `apple-touch-startup-image`. O risco dessa escolha é *drift* entre as
referências escritas à mão e os arquivos gerados, então ele é coberto por
`src/lib/installAssets.test.ts`, que falha se um `href` apontar para arquivo
inexistente, se uma splash gerada não for referenciada, se um ícone do manifesto
sumir, ou se o fade do CSS sair de sincronia com o temporizador do JS.

Efeito colateral útil: os `href` são absolutos (`/apple-splash-…`) e o Vite os
reescreve para a base de produção — conferido no `dist/index.html`.

### 2.4 · A splash de boot em HTML entrou no escopo

A proposta a listava em **Out of Scope** ("a splash é a nativa do SO"). Isso vale
para o iOS, que lê `apple-touch-startup-image`; **não vale para o Android**. O
Chrome compõe a splash do PWA a partir de ícone + `name` + `background_color` do
manifesto e não oferece nenhum campo para uma imagem própria. Ou o app pinta a
arte, ou ela simplesmente não aparece no Android.

Como o mesmo overlay também cobre a lacuna entre a imagem nativa do iOS e o
primeiro render do React, ele serve aos dois sistemas. O escopo foi ampliado, e a
proposta agora registra isso (seção B) em vez de excluí-lo.

### 2.1 · Dois masters, dois geradores

O ícone é a marca sobre um tile; a splash é uma composição fotográfica
*full-bleed*. Não são a mesma arte em tamanhos diferentes, então não saem do
mesmo gerador: `npm run pwa-assets` (ícones, de `public/icon.png`) e
`npm run splash` (aberturas, de `new-design/assets/splash-master.png`).

O master da splash ficou **fora de `public/`**: 1,4 MB que iriam para o site
publicado sem nenhum consumidor, já que tudo o que dele deriva é commitado. Mas
ficou **dentro do versionamento** (2.8) — estava em `new-design/reference/`, que o
`.gitignore` exclui, e um gerador cuja fonte não está no repositório não é
reprodutível.

### Extra · HTTPS no dev server, para o QA ser possível

Confirmado na prática durante o QA: acessando pela LAN
(`http://192.168.x.x:5173`) a tela cai no estado "manual". Causa: origem não
segura → `navigator.serviceWorker` não existe → sem service worker o Chrome não
atende aos critérios de instalabilidade → `beforeinstallprompt` nunca dispara.
`devOptions.enabled` não resolve isso; ele faz o SW existir, mas o navegador o
descarta antes.

Certificado autoassinado **também não resolve**: o Chrome trata origem com erro
de certificado como insegura mesmo depois do "prosseguir", e bloqueia o registro
do service worker. Precisa de uma CA em que o aparelho confie.

Entregue: `scripts/dev-cert.sh` (`npm run dev-cert`) cria uma CA local e emite um
certificado cobrindo `localhost`, o IP do WSL e — detectado via `powershell.exe`
— o IP LAN do Windows, que é o endereço que o celular acessa através do
portproxy. O `vite.config.ts` liga `server.https` **apenas quando os arquivos
existem**, então um checkout sem certificados continua subindo em http. `certs/`
está no `.gitignore`: chave privada não se versiona, nem descartável.

Falta o passo manual: instalar `certs/rootCA.crt` no aparelho.

### Imagens de abertura do iOS: só iPhone, e sem variante dark

- A lista de `<link>` foi restrita a iPhones. O app é *portrait-only* e
  mobile-first; incluir iPads dobraria os arquivos para um formato que o layout
  não mira.
- Nenhuma variante `prefers-color-scheme` foi emitida: o app é dark-only, então
  as duas seriam idênticas.

Resultado: 20 imagens de abertura (~9,2 MB, fora do precache), `splash.webp`
(68 KB, dentro do precache) e 6 ícones (92 KB).

---

## Pendências (não entregues, com motivo)

| # | Item | Motivo |
|---|---|---|
| 4.6 (gate) | Layout de 100% a 200% de `--font-scale` | Sem navegador executável neste ambiente |
| 5.4 | QA Android/Chrome | Exige aparelho + HTTPS |
| 5.5 | QA iOS/Safari | Exige aparelho |
| 5.6 | Estado "já instalado" no app instalado | Depende de 5.4/5.5 |

O Chromium do cache do Playwright existe na máquina mas não sobe
(`libnspr4.so` ausente), então nem uma captura de tela automatizada foi
possível. O que dá para verificar sem aparelho foi verificado: os assets gerados
foram inspecionados visualmente (ícone maskable com a marca dentro da zona
segura, `apple-touch-icon` opaco, aberturas com a arte centralizada), os dois
geradores foram reexecutados do zero, e os caminhos com a base de produção foram
conferidos no `dist`.

**Aviso para o QA:** `beforeinstallprompt` exige contexto seguro. Rode
`npm run dev-cert` e instale `certs/rootCA.crt` no aparelho, ou teste pelo GitHub
Pages (HTTPS). Sem isso o botão **não** aparecerá, mesmo com o service worker
habilitado em desenvolvimento (`devOptions`).

---

## Completion Checklist

- [x] All phases complete (exceto QA manual em aparelho)
- [x] All automated quality gates passed
- [x] Documentation synced (`openspec/project.md`, proposal e delta spec
      reconciliados com o que foi de fato construído)
- [ ] QA manual (5.4–5.6) antes de `/openspec-archive`
