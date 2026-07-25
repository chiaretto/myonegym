# Delta: app-foundation

**Change ID:** `pwa-install-and-branding`
**Affects:** instalação do PWA (`beforeinstallprompt` / iOS), tela
`/settings/install`, `SettingsPage`, conjunto de ícones do app, telas de abertura
(imagens de lançamento do iOS e splash de boot pintada pelo app), geradores de
assets, manifesto (`vite.config.ts`) e metas do `index.html`

---

## ADDED

### Requirement: Install the App From Settings

As Configurações MUST oferecer um caminho explícito para **instalar o app no
dispositivo**, em vez de depender de o usuário achar a opção escondida no menu do
navegador. O caminho MUST estar numa página dedicada, alcançável por uma linha
nas Configurações.

A tela MUST se adaptar ao que o navegador realmente permite:

- Onde o navegador oferece instalação programática (Android/Chromium), a tela
  MUST apresentar um **botão de instalar** que abre o diálogo nativo. O botão
  MUST aparecer **somente** quando a instalação está de fato disponível — um
  botão que não faz nada ao ser tocado é defeito.
- No **iOS**, onde não existe instalação programática, a tela MUST apresentar as
  **instruções passo a passo** do caminho Compartilhar → "Adicionar à Tela de
  Início", e MUST NOT exibir um botão de instalar.
- Quando o app **já está instalado** (rodando em modo standalone, ou logo após
  concluir a instalação), a tela MUST informar esse estado em vez de oferecer a
  instalação.
- Em um navegador que não oferece nenhum dos dois caminhos, a tela MUST explicar
  a limitação e indicar um navegador compatível.

O convite de instalação do navegador dispara **cedo no carregamento da página e
uma única vez**; o app MUST capturá-lo antes da primeira renderização e guardá-lo,
para que a instalação continue disponível quando o usuário chegar às
Configurações mais tarde na mesma sessão.

Esse estado é **da sessão do navegador** e MUST NOT ser persistido: um valor
guardado passaria a mentir depois de o app ser instalado ou desinstalado.

#### Scenario: Instalar no Android pelo botão
- GIVEN o app está aberto no Chrome do Android e atende aos critérios de instalação
- WHEN o usuário abre Configurações → "Instalar app" e toca no botão de instalar
- THEN o diálogo nativo de instalação do sistema é aberto
- AND ao confirmar, o app é adicionado à tela inicial

#### Scenario: Instruções no iOS
- GIVEN o app está aberto no Safari do iOS
- WHEN o usuário abre Configurações → "Instalar app"
- THEN a tela mostra o passo a passo Compartilhar → "Adicionar à Tela de Início"
- AND nenhum botão de instalar é exibido

#### Scenario: O app já instalado não oferece instalação
- GIVEN o app foi aberto pelo ícone da tela inicial (modo standalone)
- WHEN o usuário abre a tela de instalação nas Configurações
- THEN ela informa que o app já está instalado
- AND não apresenta o botão nem as instruções de instalação

#### Scenario: Chegar às Configurações depois do convite do navegador
- GIVEN o navegador sinalizou a instalabilidade logo ao carregar a página
- WHEN o usuário navega por outras telas e só então abre Configurações → "Instalar app"
- THEN o botão de instalar continua disponível (o convite não foi perdido)

#### Scenario: Sem instalação disponível
- GIVEN um navegador que não oferece instalação programática nem o caminho do iOS
- WHEN o usuário abre a tela de instalação
- THEN a tela explica que o navegador atual não permite instalar
- AND indica qual navegador usar em cada sistema

#### Scenario: Estado não sobrevive à desinstalação
- GIVEN o usuário instalou o app e depois o desinstalou
- WHEN o app é aberto novamente no navegador
- THEN a tela volta a oferecer a instalação (nenhum estado antigo é reaproveitado)

---

### Requirement: App Icon and Launch Screen

O app instalado MUST se apresentar com a identidade **OneGym Red** desde o ícone
até a abertura: o ícone na tela inicial MUST ser a marca do app (nunca uma
captura da página ou um ícone genérico do navegador), e a abertura MUST mostrar a
arte de abertura do app sobre o fundo escuro da marca, sem flash branco — nos
dois sistemas, apesar de cada um oferecer um mecanismo diferente (ou nenhum).

Para isso o app MUST publicar o conjunto de ícones que cada sistema exige:

- ícones **raster** nos tamanhos que o Android usa para o atalho e para compor a
  splash — um SVG isolado não cumpre esse papel;
- uma variante **`maskable`** com fundo *full-bleed* e a marca inteira dentro da
  zona segura, de modo que nenhuma máscara adaptativa do Android corte parte do
  desenho nem revele cantos transparentes;
- um **ícone do iOS** (`apple-touch-icon`) **opaco**, sem canal alfa e sem cantos
  arredondados próprios — o sistema aplica o arredondamento;
- **imagens de abertura do iOS** para as resoluções e orientações usuais, já que
  o iOS não deriva a splash do manifesto.

O `index.html` MUST declarar as metas que o iOS lê para rodar em modo standalone
(capacidade de app, título e estilo da barra de status). O estilo da barra de
status MUST ser um que **reserve** a área do sistema: enquanto o CSS não tratar
`env(safe-area-inset-top)`, uma barra translúcida encobriria o cabeçalho do app.

No **Android não existe** o equivalente da imagem de lançamento do iOS: o
navegador compõe a abertura a partir do ícone, do nome e da cor de fundo do
manifesto, e não aceita uma imagem própria. Para que a arte de abertura apareça
também ali, o app MUST pintá-la ele mesmo no primeiro quadro — antes que o
bundle da aplicação seja baixado, interpretado e montado, já que é exatamente
esse intervalo que ela existe para cobrir.

Essa camada de abertura MUST ser retirada assim que houver conteúdo real embaixo,
e MUST NOT depender de um único sinal para isso: quando a janela não está sendo
composta (aba em segundo plano, app aberto atrás de outra janela) o sinal de
quadro **não chega**, e sem uma segunda via a camada permaneceria opaca sobre um
app plenamente funcional. Ela MUST ser **removida**, não apenas tornada
transparente, para que em nenhum momento intercepte um toque.

Todos esses arquivos MUST ser **gerados a partir de artes-mestre por comandos
versionados no projeto**, e MUST NOT ser desenhados ou editados à mão — ver "Brand
Colour Has a Single Governed Source". Ícone e abertura são artes distintas (uma
marca sobre um tile, uma composição de tela inteira) e podem, portanto, ter
masters e comandos distintos. Cada arte-mestre MUST estar versionada: um gerador
cuja fonte não está no repositório não pode ser reexecutado a partir de um
checkout limpo, e o requisito de regeneração viraria letra morta.

A geração MUST NOT ser um passo obrigatório do build de produção: os arquivos
gerados ficam versionados, para que o deploy não dependa da cadeia de ferramentas
de imagem.

As imagens de abertura do iOS são consumidas pelo **sistema operacional no
lançamento**, não pelo app em execução; elas MUST NOT ser incluídas no precache
do service worker, que ficaria inflado sem ganho de disponibilidade offline. A
arte que o **próprio app** pinta é o caso oposto: ela MUST estar no precache, ou
um início a frio sem rede mostraria um retângulo vazio no lugar da abertura.

#### Scenario: Ícone da marca no Android
- GIVEN o app foi instalado no Android
- WHEN o usuário vê o ícone na tela inicial e na gaveta de apps
- THEN o ícone é a marca OneGym Red, com o desenho completo visível sob a máscara
  do sistema e sem bordas transparentes

#### Scenario: Ícone da marca no iOS
- GIVEN o app foi adicionado à tela de início do iOS
- WHEN o usuário vê o ícone
- THEN o ícone é a marca OneGym Red, opaco (sem fundo transparente) e não uma
  captura da página

#### Scenario: Abertura com a identidade do app
- GIVEN o app instalado é lançado pelo ícone, no Android ou no iOS
- WHEN a tela de abertura aparece antes do primeiro conteúdo
- THEN o fundo é o fundo escuro do app e a marca é exibida
- AND em nenhum momento aparece um flash de tela branca

#### Scenario: Abertura com a identidade do app no Android
- GIVEN o app instalado é lançado no Android, onde o sistema não aceita uma
  imagem de abertura própria
- WHEN a abertura aparece antes do primeiro conteúdo
- THEN a arte de abertura do app é exibida mesmo assim

#### Scenario: A abertura não fica presa sobre o app
- GIVEN o app é lançado numa janela que o navegador não está compondo, e o sinal
  de primeiro quadro nunca chega
- WHEN alguns segundos se passam
- THEN a camada de abertura é retirada assim mesmo
- AND o app abaixo dela responde normalmente aos toques

#### Scenario: Assets derivados de artes-mestre versionadas
- GIVEN uma arte-mestre é alterada
- WHEN o comando de geração correspondente é executado
- THEN todos os arquivos derivados dela são regerados
- AND nenhum arquivo gerado precisa ser editado à mão

#### Scenario: Geradores reprodutíveis num checkout limpo
- GIVEN o repositório é clonado do zero
- WHEN os comandos de geração de assets são executados
- THEN eles encontram suas artes-mestre e produzem os mesmos arquivos

#### Scenario: Build não depende do gerador de imagens
- GIVEN um ambiente sem a cadeia de ferramentas de rasterização
- WHEN o build de produção é executado
- THEN ele conclui normalmente usando os assets já versionados

#### Scenario: Precache carrega a abertura certa
- GIVEN o service worker foi instalado
- WHEN o conteúdo precacheado é inspecionado
- THEN as imagens de abertura do iOS não estão entre os arquivos precacheados
- AND a arte que o próprio app pinta está

#### Scenario: Abertura offline
- GIVEN o app instalado já foi aberto uma vez e o dispositivo está sem rede
- WHEN o app é lançado a frio
- THEN a arte de abertura aparece normalmente

---

## MODIFIED

### Requirement: Installable, Offline PWA

Mantém-se tudo o que já é exigido: a aplicação MUST ser um Progressive Web App
instalável na tela inicial, *mobile-first*, e plenamente utilizável **offline**,
**sem login e sem backend**.

Acrescenta-se que a instalação MUST ser oferecida **dentro do próprio app** (ver
"Install the App From Settings"), e não apenas pelo menu do navegador; e que o app
instalado MUST se apresentar com ícone e tela de abertura próprios (ver "App Icon
and Launch Screen").

O manifesto MUST declarar um **identificador de app estável**, de modo que o app
publicado sob um caminho base (`/myonegym/` no GitHub Pages) seja reconhecido como
a mesma aplicação entre visitas e após atualizações, em vez de aparecer como uma
instalação diferente.

Como o convite de instalação do navegador exige service worker e contexto seguro,
o ambiente de **desenvolvimento** MUST registrar o service worker, para que o
caminho de instalação possa ser exercitado sem depender do deploy. Continua valendo
que a verificação final acontece sobre HTTPS (ou `localhost`).

#### Scenario: Install to home screen
- GIVEN the app is served over HTTPS (or localhost)
- WHEN the user chooses "Add to Home Screen"
- THEN the app installs with a name and icon and launches standalone

#### Scenario: Works offline
- GIVEN the app has been opened once (assets cached)
- WHEN the device is offline
- THEN the user can open the app and access all previously stored data

#### Scenario: Instalar sem sair do app
- GIVEN o app está aberto em um navegador que permite instalar
- WHEN o usuário procura como instalá-lo
- THEN encontra o caminho nas Configurações do próprio app

#### Scenario: Identidade estável do app instalado
- GIVEN o app publicado sob o caminho base de produção
- WHEN o usuário o instala e, mais tarde, volta ao site já com uma nova versão
- THEN o navegador reconhece a instalação existente em vez de tratá-la como outro app

---

### Requirement: Brand Colour Has a Single Governed Source

Mantém-se tudo o que já é exigido: a cor de marca MUST ser governada pelos design
tokens, e todo lugar que não consegue ler uma CSS custom property MUST ser
documentado como cópia deliberada mantida em sincronia. `src/styles/tokens.css`
permanece a fonte governante, e o bloco `C` em
`src/features/session/share/renderCard.ts` — que pinta em `<canvas>`, não pode ler
variáveis CSS — permanece um espelho documentado e MUST NOT ler `--font-scale`.

A **lista de cópias muda** com esta mudança, e passa a ser:

| Cópia | Por que não lê o token |
|---|---|
| a meta `theme-color` no `index.html` | markup, não CSS |
| o fundo da camada de abertura no `index.html` | precisa pintar antes de qualquer folha de estilo carregar |
| `theme_color`/`background_color` no `vite.config.ts` | o manifesto é JSON de build |
| o fundo do tile na configuração do gerador de ícones | roda em Node, fora do navegador |
| o fundo de guarda no gerador de telas de abertura | idem |
| o bloco `C` em `renderCard.ts` | `<canvas>` não lê variáveis CSS |

Saem da lista `public/icon.svg` e `public/favicon.svg`, **removidos**: eram uma
reconstrução da marca desenhada à mão, com a cor digitada dentro do arquivo. A
arte passa a vir de artes-mestre rasterizadas, que carregam a cor como pixels e
não como um literal a manter em sincronia.

O saldo é declarado em vez de escondido: **duas cópias em arquivo de arte saem,
três literais em arquivos de configuração e markup entram**. A troca é
deliberada — um literal ao lado de um comentário que aponta o token de origem é
verificável por leitura, enquanto uma arte reconstruída à mão só diverge quando
alguém repara. Cada nova cópia MUST vir acompanhada dessa referência.

Ícones e imagens de abertura **não** constituem cópias: eles MUST ser
**derivados por geração** das artes-mestre, por comandos versionados no projeto.
Nenhum valor de cor MUST ser digitado à mão em arquivo gerado, e nenhum arquivo
gerado MUST ser editado manualmente — a forma de mantê-los em sincronia é
**reexecutar a geração**.

#### Scenario: Palette change reaches every surface
- GIVEN the accent token changes
- WHEN the app, the installed PWA chrome and a shared session card are inspected
- THEN all three show the same brand colour
- AND no surface still shows a previous palette's colour

#### Scenario: Shared card ignores the user's font scale
- GIVEN the user set the font scale to 200%
- WHEN the user shares a session card
- THEN the generated PNG uses its own fixed type sizes, unchanged by the setting

#### Scenario: Ícones e splash acompanham a paleta
- GIVEN as artes-mestre são atualizadas para uma nova paleta
- WHEN os comandos de geração de assets são executados e o app é reinstalado
- THEN o ícone na tela inicial e a tela de abertura mostram a nova paleta
- AND nenhum arquivo gerado precisou ser editado à mão

---

## REMOVED

(None)
