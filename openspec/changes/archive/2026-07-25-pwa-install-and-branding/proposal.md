# Proposal: Instalar o app pelas Configurações, com ícone e splash próprios

**Change ID:** `pwa-install-and-branding`
**Created:** 2026-07-25
**Status:** Complete
**Completed:** 2026-07-25

---

## Problem Statement

O MyOneGym já é declarado como PWA instalável (`VitePWA` em `vite.config.ts`,
requisito "Installable, Offline PWA" em `openspec/specs/app-foundation/spec.md`),
mas na prática instalar o app no celular hoje é um caminho escondido e o
resultado não é o de um app com identidade própria.

**1. Não existe nenhuma forma de instalar a partir do app.** O usuário precisa
descobrir sozinho o menu do navegador ("Instalar app" no Chrome, ou
Compartilhar → "Adicionar à Tela de Início" no Safari). No Android, o Chrome
dispara o evento `beforeinstallprompt`, mas ninguém o escuta — nenhuma ocorrência
de `beforeinstallprompt` no código-fonte —, então o convite de instalação
simplesmente se perde. No iOS não existe evento algum: sem instruções na tela, o
caminho é invisível.

**2. O conjunto de ícones não atende ao que Android e iOS pedem.** O manifesto
declara **um único** `icon.svg`, usado ao mesmo tempo para `purpose: "any"` e
`purpose: "maskable"`:

```
icons: [
  { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
]
```

Disso decorrem três defeitos concretos:

- **Faltam PNGs 192 e 512.** O Chrome usa um ícone PNG raster para o atalho e
  para compor a tela de abertura (splash) do app instalado; um SVG não é um
  substituto confiável nesse papel.
- **O mesmo desenho não serve como `maskable`.** O ícone atual é um tile com
  cantos arredondados (`rx=112`) e as chapas vermelhas do halter vão de `x=60` a
  `x=452` — quase encostando na borda. Sob a máscara adaptativa do Android
  (círculo/squircle recortando até 10% de cada lado) os cantos transparentes do
  tile aparecem e as chapas ficam no limite do recorte. Um ícone `maskable`
  precisa de fundo *full-bleed* e da marca reduzida dentro da zona segura.
- **Falta o `apple-touch-icon`.** O iOS espera um PNG opaco de 180×180 declarado
  no `<head>`; sem ele o ícone na tela de início vira uma captura da página.

**3. Não há splash (tela de abertura) de verdade.** No Android a splash é gerada
a partir de `name` + `background_color` + ícone PNG — e o ícone PNG é justamente
o que falta. No iOS a splash exige `<link rel="apple-touch-startup-image">` por
resolução/orientação; sem elas o iOS mostra uma abertura genérica, sem a marca.

O `index.html` também não declara nenhuma das metas que o iOS lê para rodar em
modo standalone (`apple-mobile-web-app-capable`,
`apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`).

## Proposed Solution

Três frentes complementares: **gerar os ícones**, **gerar as telas de abertura**
que cada sistema exige (e pintar a do Android nós mesmos, porque ele não oferece
outra saída) e **expor a instalação** dentro de Configurações.

### A. Ícones gerados a partir de um master versionado

Adotar o `@vite-pwa/assets-generator` — o gerador oficial que acompanha o
`vite-plugin-pwa` já usado no projeto — com um `pwa-assets.config.ts` que produz,
a partir de **`public/icon.png` como master do ícone**:

| Asset | Para quê |
|---|---|
| `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` | Ícone do app no Android + splash do Chrome |
| `maskable-icon-512x512.png` | Ícone adaptativo (fundo full-bleed, marca com folga) |
| `apple-touch-icon-180x180.png` | Ícone na tela de início do iOS (opaco, sem alpha) |
| `favicon.ico` | Compatibilidade com navegadores antigos |

O master é **raster, não vetor**: a folha de handoff do design
(`new-design/assets/icones.png`) é a única arte que existe do ícone, e dela foi
recortada a maior renderização — o tile do iOS — reamostrada para 1024px. Se um
master vetorial aparecer um dia, basta trocar a fonte em `pwa-assets.config.ts` e
regerar. Como consequência, `public/icon.svg` e `public/favicon.svg` — que eram
uma *reconstrução* aproximada da marca, com a cor digitada à mão — deixam de
existir; o favicon passa a ser `favicon.ico` + `pwa-64x64.png`.

Os PNGs são **derivados**, nunca desenhados à mão: `npm run pwa-assets` regenera
tudo e o resultado é commitado em `public/`. O ícone `maskable` usa `padding` e
fundo sólido na própria configuração do gerador, então também não vira uma
segunda arte a manter.

O manifesto passa a listar os PNGs (sem entrada SVG, que não existe mais), e o
`index.html` declara o `apple-touch-icon`.

### B. Telas de abertura: uma arte própria, dois caminhos

A splash não é o ícone sobre um fundo chapado — é uma composição *full-bleed*
própria. Por isso tem seu **próprio master e seu próprio gerador**:
`new-design/assets/splash-master.png` + `npm run splash`
(`scripts/gen-splash.mjs`), que escreve dois conjuntos:

| Asset | Para quê |
|---|---|
| `apple-splash-*.png` (20) | `apple-touch-startup-image` por resolução/orientação |
| `splash.webp` | Splash de boot pintada pelo próprio app |

O segundo existe porque **o Android não tem equivalente da imagem de lançamento
do iOS**: o Chrome compõe a splash do PWA a partir de ícone + `name` +
`background_color` do manifesto, e não oferece campo para uma imagem própria. O
único jeito de a arte aparecer no Android é o app pintá-la no primeiro frame — um
`<div id="splash">` com estilo inline no `index.html`, removido por
`src/lib/bootSplash.ts` quando o React termina de renderizar. No iOS a mesma
imagem recebe a passagem da splash nativa, então a entrada no app vira uma imagem
contínua em vez de um piscar de fundo vazio.

A lista de tamanhos não é duplicada: `gen-splash.mjs` **lê os 20 `<link>` do
`index.html`**, que são o contrato real com o iOS. Acrescentar um aparelho é
mexer em um arquivo só.

### C. Tela "Instalar app" nas Configurações

Novo grupo **App** em `SettingsPage` com uma linha "Instalar app" que leva a uma
página dedicada `/settings/install` (mesmo padrão de linha → rota já usado em
Aparência e Backup). A página se adapta ao contexto:

1. **Android/Chromium, instalável** — botão primário **"Instalar app"**. O evento
   `beforeinstallprompt` é capturado num módulo (`src/lib/install.ts`) importado
   por `main.tsx` **antes** da montagem do React, porque o evento dispara cedo no
   carregamento e só uma vez; guardá-lo num store permite que o botão apareça
   mesmo que o usuário chegue às Configurações depois. Tocar no botão chama
   `prompt()` e aguarda `userChoice`.
2. **iOS/Safari** — não existe `beforeinstallprompt`. A página mostra as
   instruções passo a passo (Compartilhar → "Adicionar à Tela de Início" →
   Adicionar), com os ícones correspondentes.
3. **Já instalado** — detectado por `display-mode: standalone` (ou
   `navigator.standalone` no iOS) e por `appinstalled`; a página confirma o
   estado em vez de oferecer o botão, e a linha nas Configurações reflete isso.
4. **Navegador sem suporte** — mensagem explicando que o navegador atual não
   oferece instalação, sugerindo Chrome (Android) ou Safari (iOS).

## Scope

### In Scope
- Geração dos ícones PNG (`any`, `maskable`, `apple-touch-icon`, `favicon.ico`) a
  partir de `public/icon.png`, via script npm commitado; remoção de
  `public/icon.svg` e `public/favicon.svg`, substituídos pelos derivados.
- Geração das imagens de abertura do iOS e da `splash.webp` a partir de
  `new-design/assets/splash-master.png`, via um segundo script npm commitado.
- Splash de boot pintada pelo próprio app (`index.html` + `src/lib/bootSplash.ts`),
  única forma de a arte de abertura aparecer no Android.
- Atualização do `manifest` em `vite.config.ts` (lista de ícones, `id`) e das
  metas `apple-mobile-web-app-*` em `index.html`.
- Rota e página `/settings/install` com botão de instalação (Android),
  instruções (iOS) e estado "já instalado".
- Linha "Instalar app" em `SettingsPage`.
- Captura de `beforeinstallprompt` / `appinstalled` antes do primeiro render.
- Testes de unidade e integração dos estados da página.

### Out of Scope
- Banner/convite automático de instalação fora das Configurações (Home, sessão).
- Push notifications, atalhos (`shortcuts`), `share_target` ou protocolo de
  arquivos no manifesto.
- Redesenho do ícone ou da marca — a arte vem da folha de handoff existente; só
  ganha variantes derivadas.
- Splash **animada**. A splash de boot em HTML entrou no escopo (ver "B"), mas é
  uma imagem estática que só faz *fade out*: no Android não há alternativa, e no
  iOS ela apenas dá continuidade à imagem nativa.
- Suporte a instalação em desktop além do que o Chromium já oferece de graça.
- Troca do `vite-plugin-pwa` ou da estratégia de service worker (`autoUpdate`).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nenhuma entidade nova; nada persiste no IndexedDB |
| API | No | App local-only, sem servidor |
| State | Yes | `src/lib/install.ts` — store leve do evento diferido e do estado standalone (memória, não persistido) |
| UI | Yes | Nova `InstallPage`, nova rota em `App.tsx`, novo grupo em `SettingsPage`, splash de boot no `index.html` + `src/lib/bootSplash.ts` |
| Build | Yes | `pwa-assets.config.ts` + script `pwa-assets`; `scripts/gen-splash.mjs` + script `splash`; devDependencies `@vite-pwa/assets-generator` e `sharp`; manifesto e `index.html`; `scripts/dev-cert.sh` + `server.https` condicional |

## Architecture Considerations

- **O evento precisa ser capturado antes do React.** `beforeinstallprompt`
  dispara no carregamento da página e não se repete. Registrar o listener dentro
  de um `useEffect` da página de Configurações perderia o evento em praticamente
  todos os casos. Por isso o módulo é importado no topo de `main.tsx`, ao lado de
  `applyFontScale` e `requestPersistentStorage`, que já seguem essa mesma regra
  de "antes do primeiro paint".
- **Estado efêmero, não persistido.** Diferente de `fontScale`, nada aqui vai
  para o `localStorage`: a instalabilidade é uma propriedade da sessão atual do
  navegador, e um valor guardado ficaria mentindo depois que o app fosse
  instalado ou desinstalado.
- **Página dedicada, não modal.** As instruções do iOS têm passos e imagens; um
  bottom sheet ficaria apertado no maior valor de `--font-scale` (200%). A rota
  também torna o estado deep-linkável e testável isoladamente.
- **Dois geradores, porque são duas artes.** O ícone é a marca sobre um tile; a
  splash é uma composição fotográfica *full-bleed*. Forçar as duas no mesmo
  gerador significaria ou o ícone esticado numa tela de celular, ou a splash
  reduzida a um logo centralizado. Cada uma tem seu master versionado e seu
  comando — e ambos os masters ficam **fora de `public/`** (o do ícone é a
  exceção: o gerador o quer ali), para não subir 1,4 MB de arte-fonte ao site.
- **PNGs derivados e a governança de cor.** O spec vigente enumera as cópias
  independentes da cor de marca e trata a divergência como defeito (os ícones já
  chegaram a divergir com `#B8524E`). Aqui a contagem **muda**, e o delta declara
  a nova lista: saem `public/icon.svg` e `public/favicon.svg` (dois SVGs com a cor
  digitada à mão), entram três literais em código — o tile do gerador de ícones,
  o fundo de guarda do gerador de splash e o fundo da splash de boot no
  `index.html`. Em troca, a arte deixa de ser uma reconstrução mantida à mão e
  passa a ser gerada do master: "manter em sinc" vira "rodar o comando".
- **Precache do service worker, com dois critérios opostos.** `globPatterns`
  inclui `**/*.png`, e as 20 imagens de abertura do iOS somam ~9 MB que o **SO**
  consome no lançamento, não o SW: ficam **fora** do precache (`globIgnores`),
  junto de `icon.png`, que é master do gerador e nunca é pedido em runtime. Já a
  `splash.webp` (68 KB) precisa estar **dentro**, porque a splash de boot também
  tem de pintar num início a frio offline — daí `webp` em `globPatterns`.
- **`black-translucent` está descartado** para o status bar do iOS: o CSS trata
  `env(safe-area-inset-bottom)` mas **não** o inset superior, então conteúdo sob
  a barra ficaria encoberto. Usamos `black`, que combina com `--surface-0`
  (`#050607`) sem exigir mudança de layout.

## Success Criteria

- [x] Em Configurações existe "Instalar app"; no Android/Chrome ela leva a um
      botão que abre o diálogo nativo de instalação e conclui a instalação.
- [x] No iOS/Safari a mesma tela explica o caminho Compartilhar → "Adicionar à
      Tela de Início" (sem botão falso que não faz nada).
- [x] Rodando já instalado (standalone), a tela informa que o app está instalado
      em vez de oferecer a instalação.
- [x] O ícone na tela de início é a marca OneGym Red — no Android sem cortes sob
      a máscara adaptativa, no iOS sem fundo transparente ou captura da página.
- [x] Ao abrir o app instalado, a abertura mostra a arte sobre `#050607`, sem
      flash branco, no Android e no iOS.
- [x] `npm run pwa-assets` regenera os ícones a partir de `public/icon.png`, e
      `npm run splash` regenera as telas de abertura a partir de
      `new-design/assets/splash-master.png` — os dois masters versionados, os dois
      comandos reprodutíveis a partir de um checkout limpo.
- [x] `npm run build`, `npm run typecheck` e `npx vitest run` passam.

Os cinco primeiros critérios só podem ser observados em aparelho; foram
verificados manualmente em 2026-07-25, no Android e no iOS.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Não dá para testar a instalação em `npm run dev`: `beforeinstallprompt` exige service worker + contexto seguro, e o dev server é servido por HTTP na LAN para o celular | High | Med | Habilitar `devOptions.enabled` no `VitePWA` para desenvolvimento e validar de fato no GitHub Pages (HTTPS) ou via `localhost` com port-forward |
| Dezenas de PNGs de splash do iOS inflam o repositório e o precache do SW | Med | Med | `globIgnores` para os `apple-splash-*`, e a arte **não** é cor chapada: é fotográfica, então PNG full-colour daria 37 MB. Quantizar a paleta traz o conjunto a ~9,2 MB — fora do precache, e o iOS baixa só a imagem do seu aparelho |
| A splash de boot cobre um app já funcionando (aba em segundo plano nunca recebe `requestAnimationFrame`) | Low | High | Além do sinal de frame, um `setTimeout` de 4 s que o navegador não pode reter; o elemento é **removido**, não só transparente, para nunca engolir um toque |
| `@vite-pwa/assets-generator` traz `sharp` (dependência nativa) e pode falhar em algum ambiente | Med | Low | É `devDependency` e roda sob demanda (`npm run pwa-assets`), fora de `npm run build`; os assets vão commitados, então CI e deploy não dependem dele |
| Marca cortada pela máscara adaptativa do Android | Med | Med | Variante `maskable` com `padding` (marca dentro da zona segura de 80%) e conferência no Chrome DevTools → Application → Manifest |
| iOS ignora `apple-touch-startup-image` se a `media` query não bater exatamente o dispositivo | Med | Low | Usar o conjunto completo gerado pelo preset; `background_color` escuro garante que o pior caso ainda seja uma tela preta, não branca |
| `base: '/myonegym/'` no build faz caminhos de asset ou `start_url` quebrarem no app instalado | Low | High | Declarar `id` explícito no manifesto e validar o app instalado apontando para o GitHub Pages |
| Botão "Instalar" aparecer sem que o navegador esteja pronto, resultando em toque sem efeito | Low | Med | Renderizar o botão **apenas** quando o evento diferido existe; nos demais casos, instruções ou estado informativo |

---

## Archive Information

**Archived:** 2026-07-25
**Duration:** mesmo dia (proposta, implementação e QA em 2026-07-25)
**Outcome:** Successfully implemented

### Desvios da proposta original

Três, todos registrados em "Decisões" no `tasks.md` e refletidos no texto acima:

1. **O master do ícone é PNG, não SVG.** O `public/icon.svg` previsto como fonte
   era uma reconstrução à mão da marca, com a cor digitada dentro do arquivo; a
   arte real só existe em raster. `public/icon.svg` e `public/favicon.svg` foram
   removidos.
2. **A splash de boot em HTML entrou no escopo**, de onde a proposta a havia
   excluído: o Android não aceita imagem de abertura própria pelo manifesto, então
   ou o app pinta a arte, ou ela não aparece nesse sistema.
3. **A contagem de cópias da cor de marca mudou** — saem duas (os SVGs), entram
   três literais em configuração e markup. A troca está declarada no requisito
   "Brand Colour Has a Single Governed Source" em vez de escondida.

### Files Modified
- `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`
- `pwa-assets.config.ts`, `scripts/gen-splash.mjs`, `scripts/dev-cert.sh`
- `src/lib/install.ts`, `src/lib/bootSplash.ts`, `src/main.tsx`
- `src/App.tsx`, `src/features/settings/InstallPage.tsx`,
  `src/features/settings/SettingsPage.tsx`, `src/features/settings/install.css`
- `src/lib/install.test.ts`, `src/lib/bootSplash.test.ts`,
  `src/lib/installAssets.test.ts`,
  `src/features/settings/install.integration.test.tsx`
- `public/` — 6 ícones gerados, 20 imagens de lançamento do iOS, `splash.webp`,
  `icon.png` (master); `public/icon.svg` e `public/favicon.svg` removidos
- `new-design/assets/icones.png`, `new-design/assets/splash-master.png`,
  `new-design/README.md`
- `openspec/project.md`, `.gitignore`

### Specs Updated
- `openspec/specs/app-foundation/spec.md`
  - ADDED: "Install the App From Settings", "App Icon and Launch Screen"
  - MODIFIED: "Installable, Offline PWA", "Brand Colour Has a Single Governed Source"
