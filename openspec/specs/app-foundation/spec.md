# app-foundation Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.

## Requirements

### Requirement: Installable, Offline PWA

The application MUST be a Progressive Web App: installable to the home screen,
mobile-first, and fully usable **offline** with **no login and no backend**.

A instalação MUST ser oferecida **dentro do próprio app** (ver "Install the App
From Settings"), e não apenas pelo menu do navegador; e o app instalado MUST se
apresentar com ícone e tela de abertura próprios (ver "App Icon and Launch
Screen").

O mesmo vale para a **atualização**: o app instalado MUST oferecer, dentro dele,
como saber qual versão está rodando e como trazer a mais recente (ver "Update
the App From Settings"), em vez de depender do navegador perceber sozinho que
uma versão nova foi publicada.

O manifesto MUST declarar um **identificador de app estável**, de modo que o app
publicado sob um caminho base (`/myonegym/` no GitHub Pages) seja reconhecido como
a mesma aplicação entre visitas e após atualizações, em vez de aparecer como uma
instalação diferente.

Como o convite de instalação do navegador exige service worker e contexto seguro,
o ambiente de **desenvolvimento** MUST registrar o service worker, para que o
caminho de instalação possa ser exercitado sem depender do deploy. Continua valendo
que a verificação final acontece sobre HTTPS (ou `localhost`).

O service worker MUST ser registrado **uma única vez**. O registro pertence ao
código do app — é o que dá acesso ao registro para verificar atualizações sob
demanda —, e o registrador injetado automaticamente pelo empacotador MUST estar
desligado, sob pena de dois registros concorrentes do mesmo worker.

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

#### Scenario: Atualizar sem sair do app
- GIVEN o app instalado está rodando uma versão antiga
- WHEN o usuário procura como atualizá-lo
- THEN encontra o caminho nas Configurações do próprio app

#### Scenario: Identidade estável do app instalado
- GIVEN o app publicado sob o caminho base de produção
- WHEN o usuário o instala e, mais tarde, volta ao site já com uma nova versão
- THEN o navegador reconhece a instalação existente em vez de tratá-la como outro app

#### Scenario: Um único registro do service worker
- GIVEN o app foi construído para produção
- WHEN a página carrega
- THEN o service worker é registrado uma vez só, pelo código do app

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

### Requirement: Update the App From Settings

As Configurações MUST oferecer um caminho explícito para **atualizar o app**,
numa página dedicada alcançável por uma linha no grupo "App", ao lado de
"Instalar app".

O caminho existe porque o navegador **não é confiável** para isso no modo que o
app recomenda. Uma versão nova só é descoberta quando há uma navegação dentro do
escopo do service worker; o app instalado em `standalone` é aberto, suspenso e
retomado sem navegar, e pode servir a mesma versão por semanas. Sem esta tela, a
única saída conhecida é desinstalar e instalar de novo.

A tela MUST informar a **versão instalada** — identificador da versão e quando o
build foi feito. Sem isso não há como confirmar que a atualização pegou, que é a
primeira pergunta de quem chegou até aqui. Esse dado MUST vir do **build**, e
MUST NOT ser um valor digitado à mão no código da tela: uma versão mantida
manualmente passa a mentir na primeira vez que alguém esquece de atualizá-la, e
mentir é o único defeito que esta tela não pode ter.

A ação de atualizar MUST relatar o que aconteceu, distinguindo pelo menos:

- **já está na versão mais recente** — nada a fazer, e a tela diz isso;
- **há uma versão nova** — ela está sendo aplicada, e a tela avisa que o app vai
  recarregar;
- **não foi possível verificar** — sem rede, ou a verificação falhou.

Os três MUST ser distinguíveis. Sem isso, "nada mudou na tela" cobriria os três
casos e o botão ficaria indistinguível de um botão quebrado.

Enquanto a verificação corre, o botão MUST estar indisponível, para que um
segundo toque não dispare uma segunda verificação sobre a primeira.

Onde **não existe service worker** — contexto não seguro, ou navegador sem
suporte — a tela MUST explicar a limitação e MUST NOT exibir um botão de
atualizar. É a mesma regra da tela de instalação: um botão que não faz nada ao
ser tocado é defeito.

#### Scenario: Trazer a versão nova a pedido
- GIVEN o app instalado está rodando uma versão antiga e há uma versão nova publicada
- WHEN o usuário abre Configurações → "Atualizar app" e toca em procurar atualização
- THEN a versão nova é baixada e aplicada
- AND o app recarrega já na versão nova

#### Scenario: Já está atualizado
- GIVEN o app está rodando a versão mais recente publicada
- WHEN o usuário procura atualização
- THEN a tela informa que já está na versão mais recente
- AND o app não recarrega

#### Scenario: Confirmar qual versão está rodando
- GIVEN o usuário abre a tela de atualização
- WHEN olha o estado do app
- THEN vê o identificador da versão instalada e quando ela foi construída
- AND depois de uma atualização bem-sucedida esse identificador é outro

#### Scenario: Sem rede
- GIVEN o aparelho está offline
- WHEN o usuário procura atualização
- THEN a tela informa que não foi possível verificar
- AND o app continua funcionando normalmente com a versão que já tem

#### Scenario: Navegador sem service worker
- GIVEN o app está aberto onde não há service worker registrado
- WHEN o usuário abre a tela de atualização
- THEN a tela explica que a atualização automática não está disponível ali
- AND nenhum botão de atualizar é exibido

### Requirement: The App Checks for a New Version on Its Own

O app MUST procurar uma versão nova **ao iniciar** e **ao voltar ao primeiro
plano**, sem que o usuário peça.

É a reposição do gatilho que falta. A verificação do service worker acontece na
navegação, e o app instalado não navega: retomar da bandeja não é navegar. O
retorno ao primeiro plano é o momento equivalente — é quando o usuário volta ao
app — e é onde a verificação deve acontecer.

Essa verificação MUST ser **silenciosa**: nenhuma faixa, aviso ou indicador de
progresso na tela. Encontrando uma versão nova, ela é aplicada pelo mesmo
caminho da atualização automática já existente; não encontrando, ou falhando
(offline é o caso comum), nada aparece — uma falha de rede numa verificação que
o usuário não pediu não é notícia dele.

Verificações sucessivas MUST respeitar um **intervalo mínimo**. Sem ele, alternar
entre apps dispararia uma busca de rede a cada troca, gastando bateria e dados de
quem só conferiu uma mensagem.

#### Scenario: Voltar ao app dispara a verificação
- GIVEN o app instalado ficou em segundo plano e há uma versão nova publicada
- WHEN o usuário volta ao app
- THEN a verificação acontece sem que ele peça
- AND a versão nova é aplicada

#### Scenario: Alternar entre apps não vira uma enxurrada de verificações
- GIVEN o usuário sai do app e volta várias vezes em poucos segundos
- WHEN o app volta ao primeiro plano de novo
- THEN uma nova verificação só acontece depois do intervalo mínimo

#### Scenario: Falha silenciosa
- GIVEN o aparelho está offline
- WHEN o app volta ao primeiro plano e a verificação automática falha
- THEN nada é exibido ao usuário
- AND o app continua funcionando normalmente

### Requirement: An Update Never Interrupts a Workout

Aplicar uma versão nova **recarrega a página**, e recarregar durante um treino
custa o que está apenas na tela: o cronômetro de descanso em andamento e a
posição da rolagem. O treino em si sobrevive (está no IndexedDB); a série que
estava sendo contada, não.

Por isso a verificação **automática** MUST NOT acontecer enquanto uma tela de
sessão de treino está em primeiro plano. A verificação é adiada, não cancelada:
ela volta a acontecer no próximo retorno ao primeiro plano fora da sessão.

O **botão** das Configurações MUST continuar funcionando em qualquer momento,
inclusive com um treino aberto. Quem toca nele está pedindo a atualização de
olhos abertos, e a tela avisa que o app vai recarregar.

#### Scenario: Nada recarrega durante o treino
- GIVEN o usuário está numa tela de sessão de treino, com o cronômetro correndo
- WHEN o app volta ao primeiro plano
- THEN nenhuma verificação automática é disparada
- AND o cronômetro continua de onde estava

#### Scenario: A verificação adiada acontece depois
- GIVEN uma verificação automática foi pulada por causa de um treino aberto
- WHEN o usuário encerra o treino e volta ao app mais tarde
- THEN a verificação acontece normalmente

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

#### Scenario: Abertura no Android, onde o sistema não ajuda
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

### Requirement: Local Browser Persistence

All application data MUST be stored locally in the browser (IndexedDB) and
persist across sessions. No data leaves the device except via explicit JSON
export.

#### Scenario: Data survives reload
- GIVEN the user created a gym, exercises, and a day
- WHEN the user closes and reopens the app
- THEN all previously created data is still present

#### Scenario: No network dependency for data
- GIVEN the device is offline
- WHEN the user creates and edits gyms/exercises/days/weights
- THEN all changes are saved locally without any network request

### Requirement: Estados Vazios Só Depois da Resposta

Nenhuma tela MUST afirmar que não há dados antes de a leitura ter respondido. Um
estado vazio — "Nenhum dia de treino ainda", "Nenhuma sessão ainda", "Nenhuma
academia", contadores em zero, a pílula "Sem academia" — MUST ser exibido
somente quando a consulta ao banco local resolveu **e** veio vazia.

Para isso, a camada de leitura MUST distinguir **carregando** de **vazio**: uma
consulta ainda não resolvida MUST ser observável como tal, e não como uma
coleção vazia. Um valor inicial `[]` MUST NOT ser usado como estado de
carregamento, porque `[]` é uma resposta — a de que nada existe.

Enquanto a resposta não chega, a tela MUST NOT mostrar indicador de carregamento
(spinner ou skeleton): os dados são locais e a espera é de milissegundos, de
modo que um indicador que aparece e some é apenas outro piscar.

Como cada navegação remonta a tela de destino, voltar a uma tela já visitada
MUST NOT passar por um quadro sem conteúdo: o app MUST reaproveitar, dentro da
mesma sessão do navegador, o último resultado conhecido de cada consulta como
primeira renderização, sobrescrevendo-o assim que a consulta viva resolve. Esse
reaproveitamento MUST NOT ser a fonte da verdade nem sobreviver ao fechamento da
aba, e MUST NOT afetar a reatividade: uma escrita continua se propagando às
telas montadas.

#### Scenario: Voltar para uma tela com dados não pisca o estado vazio
- GIVEN existem dias de treino cadastrados
- WHEN o usuário sai da Home e volta para ela
- THEN a Home mostra os dias
- AND em nenhum momento exibe "Nenhum dia de treino ainda"

#### Scenario: O estado vazio continua existindo
- GIVEN o banco local não tem nenhum dia de treino
- WHEN o usuário abre a Home e a leitura responde
- THEN o estado vazio é exibido, com o caminho para Configurações

#### Scenario: Carregando não é vazio
- GIVEN uma tela de lista acabou de ser montada e a consulta ainda não resolveu
- WHEN a tela renderiza
- THEN ela não exibe o estado vazio nem contadores zerados
- AND também não exibe spinner ou skeleton

#### Scenario: Uma escrita continua chegando à tela
- GIVEN a Home está aberta mostrando os dias
- WHEN um dia de treino é criado ou removido em outra parte do app
- THEN a Home reflete a mudança, sem depender de recarregar a tela

### Requirement: Dark Premium Visual Identity

The application MUST present a single **dark** visual identity based on the
**"OneGym Red"** design direction: a near-black background (`#050607`) with
layered dark surfaces (`#0c0f14` for cards), an **accent** colour — brand red
`#ec2c2e` by default, com um parceiro mais escuro como parada de baixo de um
gradiente **vertical** de 180°, e **escolhido pelo usuário dentro da lista
curada** descrita em *User-Selectable Accent Colour* — e muted/dim greys for
secondary and tertiary text. All colours MUST derive from shared **design
tokens** (CSS custom properties) rather than hardcoded values, so the palette is
governed from one place. The app is **dark-only**: it MUST NOT ship a separate
light theme, and MUST NOT switch palette based on `prefers-color-scheme`.

O destaque MUST ser trocável **em tempo de execução** escrevendo um número
pequeno de propriedades na raiz do documento: tinta, borda, texto,
preenchimento e gradiente MUST **derivar** desses valores, e não ser escritos um
a um. Nenhuma cor de destaque MUST aparecer literal fora da lista curada e do
arquivo de tokens.

Buttons and chips MUST be **fully rounded** (pill radius); cards use a 20px
radius. Numeric inputs and steppers MUST stay rectangular-rounded so a field
still reads as a field.

Accent-coloured **text** MUST meet WCAG AA against the app background, and white
on the solid accent MUST meet AA for normal text — **em qualquer** cor da lista,
que é o que a igualdade de luminância garante.

The colour used for **destructive and error** states MUST be distinguishable from
the brand accent by **both hue and lightness**, so that "delete" never reads as an
ordinary accent action. It MUST NOT be the alert colour applied to a rest day.
Essa distinção MUST valer para **todas** as cores da lista, e é por isso que a
faixa de matiz vizinha ao âmbar não é oferecida.

#### Scenario: Dark palette is the base
- GIVEN the app is opened on any device
- WHEN the first screen renders
- THEN the background is the near-black app background and cards use the dark surface tokens
- AND the accent colour on primary actions is the chosen accent (brand red by default)

#### Scenario: No light-theme switch
- GIVEN the OS/browser is set to a light colour scheme
- WHEN the app renders
- THEN the app still renders in the dark palette (it does not switch to a light theme)

#### Scenario: Destructive action is not mistaken for a brand action
- GIVEN a screen shows both an accent-coloured highlight and a destructive action
- WHEN the user looks at the screen
- THEN the destructive affordance differs from the accent in hue and in lightness
- AND it does not borrow the accent's tint or border

#### Scenario: Switching the accent repaints every derived value
- GIVEN o usuário troca a cor de destaque
- WHEN percorre Home, uma sessão, o detalhe de um exercício e a consistência
- THEN gradientes, tintas, bordas, textos e preenchimentos de destaque saem
  todos na cor nova
- AND nenhuma superfície continua na cor anterior

### Requirement: Brand Colour Has a Single Governed Source

The brand colour MUST be governed from the design tokens, and every place that
cannot read a CSS custom property MUST be documented as a deliberate copy kept in
sync. `src/styles/tokens.css` é a fonte governante dos valores padrão, e a lista
curada de cores de destaque é a fonte de **quais** valores o destaque pode
assumir.

As cópias são:

| Cópia | Por que não lê o token |
|---|---|
| a meta `theme-color` no `index.html` | markup, não CSS |
| o fundo da camada de abertura no `index.html` | precisa pintar antes de qualquer folha de estilo carregar |
| `theme_color`/`background_color` no `vite.config.ts` | o manifesto é JSON de build |
| o fundo do tile na configuração do gerador de ícones | roda em Node, fora do navegador |
| o fundo de guarda no gerador de telas de abertura | idem |
| o bloco de cores neutras em `src/features/session/share/renderCard.ts` | `<canvas>` não lê variáveis CSS |

Nenhuma dessas cópias carrega a cor de **destaque**: as de build usam a
superfície escura, que não muda, e o pintor do card MUST **receber** a cor
escolhida como parâmetro em vez de fixá-la. Um valor de destaque escrito à mão
em qualquer uma delas MUST ser tratado como defeito — ele congelaria o card na
cor de outro usuário.

Cada cópia MUST vir acompanhada de uma referência ao token de origem, para que a
divergência seja verificável por leitura. `renderCard.ts` MUST NOT ler
`--font-scale` — um PNG compartilhado é uma peça de tamanho fixo.

Ícones e imagens de abertura **não** constituem cópias: eles MUST ser
**derivados por geração** das artes-mestre, por comandos versionados no projeto.
Nenhum valor de cor MUST ser digitado à mão em arquivo gerado, e nenhum arquivo
gerado MUST ser editado manualmente — a forma de mantê-los em sincronia é
**reexecutar a geração**. Eles seguem a **marca**, não a escolha do usuário, e a
tela de Aparência MUST dizer isso.

#### Scenario: Palette change reaches every surface
- GIVEN the accent token changes
- WHEN the app, the installed PWA chrome and a shared session card are inspected
- THEN all three show the same accent colour
- AND no surface still shows a previous palette's colour

#### Scenario: Shared card follows the chosen accent
- GIVEN o usuário escolheu "Verde"
- WHEN compartilha uma sessão concluída
- THEN o PNG sai com o destaque verde
- AND nenhum traço do vermelho padrão aparece nele

#### Scenario: Shared card ignores the user's font scale
- GIVEN the user set the font scale to 200%
- WHEN the user shares a session card
- THEN the generated PNG uses its own fixed type sizes, unchanged by the setting

#### Scenario: The brand artwork keeps the brand colour
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN olha o logo no topo da Home, o ícone na tela inicial e a tela de abertura
- THEN os três continuam na cor de marca — são artes, não cor de CSS
- AND a tela de Aparência informa isso

#### Scenario: Ícones e splash acompanham a paleta
- GIVEN as artes-mestre são atualizadas para uma nova paleta
- WHEN os comandos de geração de assets são executados e o app é reinstalado
- THEN o ícone na tela inicial e a tela de abertura mostram a nova paleta
- AND nenhum arquivo gerado precisou ser editado à mão

### Requirement: User-Selectable Accent Colour

As Configurações MUST oferecer, em **Aparência**, a escolha da **cor de
destaque** do app dentro de uma **lista curada** de pelo menos 15 opções, tendo
o vermelho de marca como **padrão**. A escolha MUST valer **imediatamente e em
todo o app**, MUST **persistir localmente** entre sessões e reinícios
(local do dispositivo; **não** faz parte do backup) e MUST ser aplicada
**antes da primeira pintura**, para o app não piscar a cor anterior.

O controle MUST identificar a opção vigente e MUST oferecer o **retorno ao
padrão**. Um valor persistido que não corresponda a nenhuma opção da lista MUST
ser tratado como o padrão.

O app MUST ter **uma única** cor de destaque: o degradê dos elementos de
destaque MUST continuar derivando dessa cor pelo fator histórico da marca, e não
de uma segunda cor escolhida à parte.

Toda cor da lista MUST satisfazer, por construção:

- a **mesma luminância relativa** da cor padrão, dentro de uma tolerância
  estreita — de onde decorrem o mesmo contraste como texto sobre o fundo do app
  (≥ 4,5:1) e a mesma relação do branco sobre o preenchimento sólido;
- **croma não maior** que a da cor padrão, para nenhuma opção ficar mais vívida
  que a identidade;
- distância de **matiz** até a cor de perigo **não menor** que a da cor padrão,
  para que "excluir" nunca se aproxime de uma ação de marca;
- **separação perceptual mínima** em relação a todas as outras da lista — com a
  luminância fixa, matiz e croma carregam toda a diferença, e uma lista densa
  demais ofereceria amostras que o usuário não distingue.

Essas quatro propriedades MUST ser verificadas **por cálculo sobre a lista**,
não por inspeção visual: acrescentar uma cor que viole qualquer uma delas MUST
reprovar a verificação do projeto.

A lista MUST NOT oferecer uma cor arbitrária escolhida pelo usuário. Normalizar
uma matiz quente para essa luminância produz um oliva que não se parece com a
cor pedida, e a lista curada é o que torna as garantias acima possíveis.

#### Scenario: Choose an accent colour
- GIVEN o usuário abre Configurações → Aparência
- WHEN toca a amostra "Azul"
- THEN o app inteiro passa a usar azul no destaque, imediatamente
- AND a amostra "Azul" fica marcada como a escolhida

#### Scenario: The gradient follows the chosen colour
- GIVEN o usuário escolheu "Azul"
- WHEN um elemento de destaque com degradê é pintado
- THEN o degradê vai do azul ao mesmo azul escurecido pelo fator da marca
- AND nenhuma segunda cor participa dele

#### Scenario: The choice survives a restart without a flash
- GIVEN o usuário escolheu "Roxo"
- WHEN fecha e reabre o app
- THEN a primeira pintura já sai em roxo
- AND o vermelho padrão não aparece em momento algum

#### Scenario: Reset returns to the brand red
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN toca "Restaurar padrão"
- THEN o destaque volta ao vermelho de marca

#### Scenario: Every offered colour keeps the current contrast
- GIVEN a lista de cores oferecida
- WHEN cada uma é medida contra o fundo do app e contra o branco do
  preenchimento
- THEN todas apresentam o mesmo contraste da cor padrão, dentro da tolerância
- AND nenhuma é mais vívida que ela

#### Scenario: A colour too close to the danger colour is rejected
- GIVEN alguém acrescenta à lista uma cor na faixa do âmbar de perigo
- WHEN a verificação do projeto roda
- THEN ela reprova, apontando a distância de matiz insuficiente

#### Scenario: A colour too close to another is rejected
- GIVEN alguém acrescenta à lista uma cor quase igual a uma existente
- WHEN a verificação do projeto roda
- THEN ela reprova, apontando a separação perceptual insuficiente

#### Scenario: An unknown stored value falls back to the default
- GIVEN o armazenamento local guarda uma cor que não existe mais na lista
- WHEN o app inicia
- THEN ele aplica o vermelho padrão
- AND a tela de Aparência mostra o padrão como escolhido

#### Scenario: The choice is not part of the backup
- GIVEN o usuário escolheu uma cor diferente do padrão
- WHEN exporta o backup completo
- THEN o documento não carrega a cor escolhida
- AND restaurá-lo em outro dispositivo não altera a cor de lá

### Requirement: Typography

The app MUST use a **single** typeface family across every role, in **two
weights** (400 regular, 700 bold), self-hosted so the PWA works offline with no
runtime network request.

The three token names MUST be preserved so no consumer changes: `--font-title`,
`--font-sans` and `--font-mono`. `--font-mono` keeps its name but denotes the
**micro-label role** (uppercase, wide letter-spacing) rendered in the same family
— it is no longer a monospace face.

The existing single **typography-scale** mechanism MUST be preserved: one
`--font-scale` knob, user-adjustable, applied through the `--fs-*` tokens (see
"Legible, Scalable Base Typography").

The **default** scale MUST be **125%**. The CSS default in `tokens.css` and
`FONT_SCALE_DEFAULT` in `src/state/settings.ts` MUST hold the same value — if they
diverge the app flashes at the wrong size on first paint.

`--fs-xl` MUST remain at least 16px effective at the default scale, or iOS zooms
the viewport when an input takes focus.

#### Scenario: One family, offline
- GIVEN the device is offline
- WHEN the app renders
- THEN titles, body and micro-labels all render in the bundled family
- AND no font request is made at runtime

#### Scenario: Default scale is consistent across CSS and TS
- GIVEN a fresh install with no stored preference
- WHEN the app paints for the first time
- THEN text renders at 125% and does not visibly resize after hydration

#### Scenario: Scale control still works end to end
- GIVEN the user opens Settings → Aparência
- WHEN the user moves the scale between 100% and 200%
- THEN every text size in the app rescales with hierarchy preserved and no clipping

### Requirement: Icon System

Icons MUST come from the bundled **Tabler icon webfont** as the base set, via the
existing `src/ui/Icon.tsx` wrapper. The app uses 34 distinct glyphs across 77 call
sites and the brand asset set does not cover them, so the webfont MUST NOT be
removed.

A **second, complementary** system MAY render brand-signature glyphs from PNG
artwork as a CSS mask, so one asset serves every colour state through
`currentColor`. It MUST be limited to glyphs that exist in the brand artwork —
navigation tabs, play, chevron, building, and the muscle-group avatars.

Because the artwork is line art displayed below its native size, and some crops
never reach full opacity, the mask MUST be composited so that partially
transparent pixels still paint a solid glyph. A glyph that renders as a
washed-out hairline is a defect, not a style.

#### Scenario: Brand glyph inherits its colour
- GIVEN the same PNG-backed glyph is used in an active and an inactive tab
- WHEN both render
- THEN the active one paints in the accent and the inactive one in the muted grey
- AND both come from a single asset file

#### Scenario: Every glyph in use still renders
- GIVEN the app renders all screens
- WHEN icons are inspected
- THEN no icon is missing or blank, including the ones with no brand artwork

### Requirement: Legible, Scalable Base Typography

The application's text sizing MUST be driven by a **single typography scale**
rather than scattered hardcoded pixel values. All `font-size` values MUST derive
from shared size tokens governed by one **scale multiplier**, so the entire app
can be resized from one place. The multiplier MUST be **user-adjustable** and
persisted locally (see User-Adjustable Font Size). Its shipped **default MUST
enlarge text for mobile legibility** — **1.25× (125%)** the original base sizes,
lowered from 150% by `redesign-onegym-red` because the restructured day card is
cramped at 150% — while remaining adjustable **down to 100%** (original) and **up
to at least 200%**. The relative size **hierarchy** MUST be preserved (all sizes scale
by the same factor). Sizing SHOULD be expressed relative to the root font size so
the browser/OS text-size preference also applies. No value within the supported
range MUST clip, overlap, or hide text on a mobile viewport.

#### Scenario: Default is comfortably enlarged
- GIVEN a screen whose row title is 14px at 100%
- WHEN the app renders with the shipped default scale (125%)
- THEN the row title's effective size is about 17.5px (1.25× the original)

#### Scenario: Hierarchy is preserved
- GIVEN prior sizes where the title was larger than its subtitle
- WHEN every size is scaled by the same multiplier
- THEN the title remains proportionally larger than the subtitle (ratios unchanged)

#### Scenario: One knob rescales the whole app
- GIVEN all font sizes derive from the shared scale multiplier
- WHEN the multiplier value changes (in code default or via the user setting)
- THEN every screen's text rescales uniformly with no per-component edits

#### Scenario: No clipped or overlapping text across the range
- GIVEN any scale within the supported range (100%–200%) on a phone-sized viewport
- WHEN the user views the app bar, tab bar, list rows, badges, sheets, and empty states
- THEN all text is fully visible without clipping or overlap (regions wrap or expand as needed)

#### Scenario: Inputs avoid mobile zoom-on-focus
- GIVEN a text input on a mobile browser at the minimum scale (100%)
- WHEN the input's font size is computed
- THEN its effective size remains at least 16px so focusing it does not trigger an automatic zoom

#### Scenario: No stray hardcoded sizes
- GIVEN the styling sources
- WHEN font sizes are inspected outside the token definitions
- THEN no component sets a hardcoded pixel `font-size` (all reference the shared scale)

### Requirement: User-Adjustable Font Size

Settings MUST provide a control to choose the app's **font size** (the scale
multiplier) within a supported range of **at least 100%–200%**. The chosen value
MUST **persist locally** across sessions and app restarts (device-local; it is
NOT part of the data backup). Applying a value MUST take effect **immediately and
app-wide** (live). The control MUST offer a **reset to the default** and SHOULD
show the **current value** (e.g., a percentage) and a **live preview**. Values
outside the supported range MUST be **clamped**. The stored value MUST be applied
**before first paint** so the app does not flash a different size on startup.

O **restaurar padrão** de Aparência MUST devolver ao padrão **todas** as
preferências dessa tela — tamanho da fonte e cor de destaque — e o seu rótulo
MUST NOT prometer apenas uma delas.

#### Scenario: Change the font size from Settings
- GIVEN the appearance setting is open
- WHEN the user increases the font size to 180%
- THEN all text across the app immediately grows to the 180% scale

#### Scenario: Preference persists across restarts
- GIVEN the user set the font size to 120%
- WHEN the user closes and reopens the app
- THEN the app renders at 120% (the stored value), without flashing another size first

#### Scenario: Reset to default
- GIVEN o usuário mudou o tamanho da fonte e a cor de destaque
- WHEN toca "Restaurar padrão"
- THEN a fonte volta a 125% e o destaque volta ao vermelho de marca

#### Scenario: Out-of-range values are clamped
- GIVEN a stored or entered value outside 100%–200% (e.g., 400% or 50%)
- WHEN the app applies it
- THEN the value is clamped into the supported range before use

#### Scenario: Applies on every screen
- GIVEN the user set a non-default font size
- WHEN the user navigates to Home, a session, an exercise detail, or Settings
- THEN each screen renders at the chosen size

### Requirement: First-Launch Example Data Prompt

The app MUST ask the user, the **first time it is opened on a device**,
whether to load the bundled sample routine (see "Generate Example Data" in
the data-portability spec). Whether the user accepts or declines, the app
MUST remember locally on the device that the user has been asked, so the
prompt is shown **at most once** per device. This "already asked" flag is
**device-local** (like the font-size preference) and MUST NOT be part of the
exported/imported data backup. Accepting MUST run the same sample-data
generation used by "Gerar exemplo" in Settings. Declining MUST leave the app
without any generated data; the user can still generate the sample later from
Settings. A device that **already has registered data** the first time this
capability runs (e.g. an existing installation upgrading to a build that
includes this feature) MUST be treated as already-asked and MUST NOT be
prompted retroactively.

"Dados cadastrados" significa dados **do usuário**, no banco. O catálogo
**oficial** MUST NOT contar: ele vem com o app e existe em toda instalação, então
contá-lo faria todo aparelho novo parecer já usado e o convite **nunca** seria
exibido para ninguém.

#### Scenario: First open offers the sample data
- GIVEN the app is opened for the first time on a device (no registered data, never asked before)
- WHEN the app finishes loading
- THEN the user is asked whether to load the sample exercises and training days

#### Scenario: O catálogo oficial não conta como dado cadastrado
- GIVEN um aparelho onde o app nunca foi usado, com o catálogo oficial visível na lista de exercícios
- WHEN o app termina de carregar
- THEN o convite de dados de exemplo é exibido normalmente

#### Scenario: Accepting loads the sample routine
- GIVEN the first-launch prompt is shown
- WHEN the user accepts
- THEN the bundled example routine is generated (the same result as tapping "Gerar exemplo" in Settings)
- AND the generated categories, exercises, days, gym, and weights are visible on Home

#### Scenario: Declining starts empty
- GIVEN the first-launch prompt is shown
- WHEN the user declines (or dismisses the prompt)
- THEN no data is created
- AND o usuário segue vendo o catálogo oficial na lista de exercícios
- AND the user can still generate the sample later from Settings → Backup → "Gerar exemplo"

#### Scenario: Prompt shown only once per device
- GIVEN the user has already been asked (accepted or declined) on this device
- WHEN the app is opened again
- THEN the first-launch prompt does not reappear

#### Scenario: Existing installs are not retroactively prompted
- GIVEN a device already has registered data (e.g. gyms or exercises) from before this capability existed
- WHEN the app is opened on a build that includes this capability for the first time
- THEN the device is treated as already-asked and the first-launch prompt is not shown

---

### Requirement: Floating Action Bar for Primary Actions

A screen's **primary action** MUST remain reachable without scrolling. Where a
screen's main action (or small set of actions) would otherwise sit at the **end of
a scrolling body** — so a long list pushes it below the fold — that action MUST be
presented in a **bar fixed to the bottom of the screen**, above the scrolling
content.

The bar MUST **cover no content**: the screen MUST reserve space equal to the
bar's **actual rendered height**, at **any font-size setting** (see
User-Adjustable Font Size). Because the bar scales with the font size, a fixed
reservation would hide content at large scales; the reservation MUST track the
measured height. Transient messages (toasts) MUST NOT render underneath the bar
either.

On a device with an on-screen (soft) keyboard, the bar MUST **rise to stay above
the keyboard** when it opens — a form's Salvar/Cancelar (and any toast) MUST remain
visible and tappable while typing — and return to the bottom when the keyboard
closes. The bar MUST NOT be left hidden behind the keyboard.

This pattern applies to the app's **create/edit pages** — creating or editing a
**gym**, **category**, **exercise**, or **training day**, where **Cancelar /
Salvar** sit in the bar (see Create and Edit on Dedicated Pages) — the settings
**list** screens' create action, and the **workout session runner's**
complete-workout action. Each such action keeps its existing behaviour (label,
disabled state, and any accompanying hint) inside the bar. The exercise stepper
detail already follows this pattern (see the `workout-sessions` and
`home-navigation` specs).

A **modal** (bottom sheet) whose content can exceed the screen MUST keep its
**footer actions** (e.g. Cancelar / Confirmar, or a delete action) **pinned and
visible while its content scrolls**, so the acting/cancelling controls are never
scrolled out of reach.

#### Scenario: The create button is reachable without scrolling
- GIVEN a settings list (e.g. exercises) long enough to fill the screen
- WHEN the user views the screen
- THEN the "+ Novo…" button is visible in a bar fixed to the bottom, without scrolling to the end of the list

#### Scenario: The bar covers no content at any font size
- GIVEN a screen with a fixed action bar and content taller than the viewport, at the maximum font-size setting
- WHEN the user scrolls to the bottom
- THEN the last content is fully readable above the bar

#### Scenario: Saving from a form page's fixed bar
- GIVEN a create/edit page whose fields exceed the viewport
- WHEN the user scrolls to the bottom
- THEN Cancelar and Salvar are in the bottom bar, reachable without the form content being covered

#### Scenario: Finishing a workout from a fixed bar
- GIVEN an in-progress workout session on a long training day
- WHEN the user views the runner
- THEN "Concluir treino" is in the bottom bar (with its disabled state and hint preserved), reachable without scrolling

#### Scenario: A modal footer stays visible while its content scrolls
- GIVEN a modal whose body can exceed the sheet (e.g. the photo viewer, or a confirmation)
- WHEN the user scrolls the modal's content
- THEN its footer action(s) stay pinned to the bottom of the sheet, always visible

#### Scenario: The bar rises with the on-screen keyboard
- GIVEN a create/edit page whose Salvar/Cancelar are in the bottom bar
- WHEN the user focuses a text field and the soft keyboard opens
- THEN the bar rises to sit just above the keyboard, fully visible and tappable
- AND WHEN the keyboard closes, the bar returns to the bottom of the screen

#### Scenario: A toast is not hidden by the bar
- GIVEN a screen with a fixed action bar
- WHEN a confirmation toast appears
- THEN it renders above the bar, not underneath it

### Requirement: Create and Edit on Dedicated Pages

Creating or editing a catalog entity MUST happen on a **dedicated page (its own
route)**, not in a modal. This covers a **gym**, a **category**, an **exercise**
and a **training day**. Each entity MUST expose a **create** route and an **edit** route; opening a
create/edit flow navigates to it, and the list's create control and each row's
edit control navigate there rather than opening an overlay.

Because these are real routes, they MUST be **deep-linkable** (reloading the URL
shows the form) and MUST honour the **browser Back button** and an in-page back
control by returning to the **list**, not by dismissing the app view. Saving MUST
persist and return to the list; cancelling MUST return without saving. An edit
route for an entity that **no longer exists** MUST show a not-found state with a
way back, never a crash.

Modals remain the right surface for **quick, transient, single-purpose**
interactions — a confirmation, a picker (e.g. the active-gym selector), or a
read-only preview (a photo, or an exercise peek) — and those are unaffected.

#### Scenario: Creating an entity happens on a page
- GIVEN the user is on the exercises list
- WHEN the user taps "+ Novo exercício"
- THEN the app navigates to a dedicated create page (its own URL), not a modal

#### Scenario: Editing happens on a page reached from the row
- GIVEN a gym in the list
- WHEN the user taps its edit control
- THEN the app navigates to that gym's edit page at its own URL

#### Scenario: Back returns to the list
- GIVEN the user is on a create or edit page
- WHEN the user uses the back control or the browser Back button
- THEN the list is shown again and the app is not dismissed

#### Scenario: A create/edit URL is deep-linkable
- GIVEN a create or edit URL
- WHEN the user reloads it
- THEN the form page is shown (not a blank list or an error)

#### Scenario: Saving returns to the list with the change applied
- GIVEN the user filled a create page
- WHEN the user saves
- THEN the entity is persisted and the list is shown with it present

#### Scenario: Editing a deleted entity is handled
- GIVEN an edit URL for an entity that has since been deleted
- WHEN the page loads
- THEN a not-found state with a way back is shown, not a crash

### Requirement: The App Bar Sits Flush With the Screen

A **barra de título** MUST encostar no conteúdo abaixo dela: **sem folga
inferior** e **sem linha divisória**. Ela desenhava as duas coisas, e as duas
repetem uma separação que o conteúdo já faz sozinho — cada tela abre com o
próprio respiro superior, e a barra é opaca sobre o fundo do app, então a
distinção sobrevive por contraste enquanto a página rola por baixo dela.

A regra vale para **todas** as telas, não para uma: a barra é chrome
compartilhado, e duas barras de título diferentes no mesmo app seriam um
detalhe que só se explica pela história de quem as escreveu. Na tela do
exercício em sessão é a barra de progresso segmentada que passa a marcar o fim
do cabeçalho (ver `workout-sessions`).

O restante do comportamento da barra MUST ficar como está: ela continua
**grudada no topo** enquanto a página rola, mantém seu preenchimento superior e
lateral, e continua a ser o lugar do botão de voltar e do título. Rolar
conteúdo para uma posição alinhada ao topo MUST levar em conta que a barra
grudada ocupa aquele espaço, para que nada pare por baixo dela.

#### Scenario: Nenhuma linha sob o título
- GIVEN qualquer tela com barra de título
- WHEN o usuário a observa
- THEN não há linha divisória sob a barra
- AND não há folga entre a barra e o começo do conteúdo

#### Scenario: A barra segue grudada
- GIVEN uma tela cujo conteúdo excede a altura da viewport
- WHEN o usuário rola
- THEN a barra de título permanece no topo, com o conteúdo passando por baixo dela
- AND o conteúdo não se confunde com o título, porque a barra é opaca

#### Scenario: Vale em todo o app
- GIVEN o usuário percorre a Home, a Consistência, as Configurações, o detalhe de um exercício e uma sessão
- WHEN observa o topo de cada tela
- THEN todas apresentam a mesma barra rente, sem linha e sem folga inferior

#### Scenario: A barra grudada não encobre o que sobe
- GIVEN um elemento rolado deliberadamente para o topo da tela (por exemplo o cartão de peso ao entrar em edição)
- WHEN a rolagem termina
- THEN o elemento fica logo abaixo da barra, inteiramente visível
- AND não fica parcialmente escondido atrás dela

---

### Requirement: User-Selectable Boot Splash

As Configurações MUST oferecer, em **Aparência**, a escolha da **arte de
abertura** entre um conjunto **curado** — hoje "Vazio", "Homem" e "Mulher". A
escolha MUST ser **local do aparelho**, como o tamanho da fonte e a cor de
destaque, e MUST NOT entrar no backup: ela descreve como este aparelho se abre,
não o que o usuário registrou nele.

O seletor MUST mostrar **a própria arte**, e não uma lista de nomes: o que se
escolhe é uma imagem, e escolher às cegas entre três nomes não é escolher.

A lista MUST ser **governada**, como a das cores: cada opção vem de um master
versionado e é gerada por `npm run splash`. O app MUST NOT aceitar uma URL
arbitrária — a abertura precisa pintar **offline, no primeiro quadro**, e uma
imagem que possa faltar deixaria o app abrindo em preto.

A arte **padrão** MUST ser a que **não traz pessoa alguma**: uma instalação nova
não deve atribuir uma figura ao seu dono antes que ele diga qualquer coisa.

A escolha MUST valer **a partir da próxima abertura**, e a tela MUST dizer isso.
Não é limitação a corrigir: a abertura existe justamente para cobrir o intervalo
antes de o pacote carregar, então nada que o React renderize pode alcançá-la a
tempo. Ela MUST, portanto, ser lida de forma **síncrona, antes do primeiro
quadro**, do mesmo armazenamento onde as preferências já estão — e um valor
ausente, ilegível ou desconhecido MUST cair na arte padrão, nunca em nenhuma.

As **imagens de lançamento do iOS** MUST continuar vindo da arte **padrão**
apenas. O iOS as resolve na instalação, a partir de `<link>` estáticos, e não há
como trocá-las em execução; gerar as vinte por arte custaria ~9 MB cada por uma
imagem que o sistema mostra num instante. A consequência MUST ser aceita: num
iPhone com outra arte escolhida, o sistema mostra a padrão no instante que é
dele e o app mostra a escolhida no instante que é seu. No Android, onde não
existe imagem de lançamento do sistema, só a escolhida aparece.

O **restaurar padrão** de Aparência MUST devolver também a arte de abertura.

#### Scenario: Escolher a arte de abertura
- GIVEN o usuário abre Configurações → Aparência
- WHEN olha a seção da tela de abertura
- THEN vê as artes disponíveis como imagens, com a atual marcada
- AND pode escolher outra

#### Scenario: A escolha vale na próxima abertura
- GIVEN o usuário escolhe outra arte
- WHEN fecha e abre o app de novo
- THEN a abertura mostra a arte escolhida
- AND a tela avisou, antes, que valeria a partir da próxima vez

#### Scenario: Padrão sem pessoa
- GIVEN um aparelho onde a escolha nunca foi feita
- WHEN o app abre
- THEN a arte exibida é a que não traz pessoa alguma

#### Scenario: Um valor que não dá para ler não deixa o app sem abertura
- GIVEN o armazenamento local está bloqueado, vazio ou com um valor desconhecido
- WHEN o app abre
- THEN a arte padrão é exibida
- AND nada na abertura falha por causa disso

#### Scenario: A escolha não viaja no backup
- GIVEN o usuário escolheu uma arte diferente da padrão
- WHEN exporta o backup completo
- THEN o documento não contém a escolha
- AND restaurar esse backup em outro aparelho não muda a abertura dele

---
