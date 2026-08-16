# Delta: warmups (capability nova)

**Change ID:** `add-exercise-warmups`
**Affects:** `src/db/types.ts`, `src/db/db.ts` (v11), `src/db/repos.ts`,
`src/lib/warmupMedia.ts` (novo), `src/features/settings/WarmupsPage.tsx` (novo),
`src/features/warmup/WarmupViewer.tsx` (novo)

---

## ADDED

### Requirement: Warmup as a Reusable Record

Um **aquecimento** MUST ser um registro próprio do catálogo, com **nome** e
**uma URL de mídia**. Ele MUST ser cadastrado em Configurações, como as
categorias e os exercícios — é conteúdo reutilizável, e todo CRUD do app mora
ali.

O nome MUST ser obrigatório: é por ele que o aquecimento é encontrado no
seletor do exercício e identificado quando a mídia não carrega.

Um aquecimento MUST NOT pertencer a uma academia: como as alternativas, ele é
uma propriedade do exercício, não do lugar.

#### Scenario: Cadastrar um aquecimento
- GIVEN o usuário abre Configurações → Aquecimentos
- WHEN informa o nome "Rotação de ombro" e uma URL de imagem, e salva
- THEN o aquecimento é persistido e passa a aparecer na lista

#### Scenario: Nome é obrigatório
- GIVEN o formulário de aquecimento aberto
- WHEN o usuário salva sem nome
- THEN o cadastro é bloqueado com uma mensagem de validação

#### Scenario: A lista diz onde cada um é usado
- GIVEN "Rotação de ombro" está vinculado a três exercícios
- WHEN o usuário vê a lista de aquecimentos
- THEN aquela linha indica que três exercícios o usam

---

### Requirement: Warmup Media Is Classified From Its URL

A forma de exibir um aquecimento MUST ser derivada da **própria URL**, e MUST
ser a mesma classificação na validação e na renderização:

- URL terminando em extensão de **vídeo** (MP4, WebM) → tocada como vídeo, com
  controles, **sem autoplay** e sem pré-carregar;
- URL de um provedor com **endereço de player publicado** (YouTube, Vimeo) →
  **embutida** no visualizador, convertida para esse endereço de player;
- **qualquer outra** URL http(s) → exibida como **imagem**.

Imagem é o **padrão**, não um quarto caso de "desconhecido". Muita URL de imagem
real não tem extensão — um caminho de CDN, `?format=jpg`, um recurso assinado —
e tratá-las como outra coisa tirava o usuário do app por uma figura que teria
aparecido sem problema. Quando o palpite erra, o próprio `<img>` falha e o
visualizador MUST cair no seu estado de falha, que mantém o endereço acessível
(ver *Full-Screen Warmup Viewer*). É essa rede de segurança que torna o palpite
otimista seguro.

O tipo MUST NOT ser um campo do registro: seria uma segunda fonte de verdade
sobre a mesma URL, livre para divergir dela. Uma URL que não seja http(s) MUST
ser recusada.

**Embutir vale só para quem publica um endereço de player.** A página de
assistir não é o player: `youtube.com/watch?v=ID` recusa ser enquadrada
(`X-Frame-Options`), `youtube.com/embed/ID` não. O app MUST NOT tentar enquadrar
um site qualquer — produziria uma caixa em branco sem nada que a explique.

Um vídeo que a URL declara **vertical** (um Short do YouTube) MUST ser exibido
num quadro vertical que ocupa a **altura disponível** da tela, e não no quadro
16:9 — um vídeo vertical dentro de um quadro deitado vira uma tira estreita com
tarja dos dois lados. Os demais MUST continuar em 16:9, pelo motivo inverso.

A orientação MUST ser decidida apenas pelo que a URL **declara** (`/shorts/`).
Um Short compartilhado como `youtu.be/ID` é indistinguível de um vídeo em
paisagem nesse nível, e adivinhar vertical para esses colocaria todo vídeo comum
numa tira. Descobrir a proporção real exigiria consultar a API do provedor, o
que este app não faz.

O embed MUST reduzir o que entrega ao provedor no que estiver ao alcance do
próprio app: usar o host **sem cookies** quando o provedor publica um
(`youtube-nocookie.com`), **não** conceder autoplay, e carregar sob demanda.
Isso não torna o embed privado — o provedor continua vendo a requisição e o
endereço de quem assiste —, e essa é uma **troca consciente**: o vídeo de
aquecimento que a pessoa tem à mão está quase sempre nesses provedores, e mandá-la
para fora do app a cada consulta custava mais do que o recurso valia.

#### Scenario: URL de imagem vira imagem
- GIVEN um aquecimento com URL terminando em `.gif`
- WHEN ele é exibido
- THEN aparece como imagem, animada quando for um GIF

#### Scenario: URL de vídeo vira player
- GIVEN um aquecimento com URL terminando em `.mp4`
- WHEN ele é exibido
- THEN aparece um player com controles
- AND o vídeo não começa sozinho nem baixa antes de o usuário pedir

#### Scenario: Um Short ocupa a altura da tela
- GIVEN um aquecimento cuja URL é um Short do YouTube
- WHEN ele é exibido
- THEN o player aparece em quadro vertical, usando a altura disponível
- AND um vídeo em paisagem, no mesmo visualizador, continua em quadro deitado

#### Scenario: Vídeo de provedor conhecido toca dentro do app
- GIVEN um aquecimento com uma URL de vídeo do YouTube
- WHEN ele é exibido
- THEN o player aparece **dentro** do visualizador
- AND o endereço usado é o de player do provedor, não a página de assistir
- AND nada começa a tocar sozinho

#### Scenario: URL sem extensão é exibida como imagem
- GIVEN um aquecimento cuja URL não termina em extensão conhecida e não é de um
  provedor com player (um caminho de CDN, por exemplo)
- WHEN ele é exibido
- THEN o app o exibe como imagem, dentro do visualizador
- AND o usuário não é mandado para fora do app

#### Scenario: O palpite errado não vira beco sem saída
- GIVEN um aquecimento cuja URL é uma página, não uma imagem
- WHEN o visualizador tenta exibi-la e a carga falha
- THEN aparece o estado de falha com o nome do aquecimento
- AND o endereço continua acessível, para abrir fora do app
- AND avançar e voltar continuam funcionando

#### Scenario: URL inválida é recusada
- GIVEN o formulário de aquecimento
- WHEN o usuário informa algo que não é http(s)
- THEN o cadastro é bloqueado com uma mensagem de validação

---

### Requirement: A Warmup Belongs to Many Exercises

A relação entre exercício e aquecimento MUST ser **muitos-para-muitos**: um
exercício MAY listar vários aquecimentos, e o mesmo aquecimento MAY estar em
vários exercícios, sem cópia do registro.

A relação MUST ser **assimétrica** — vincular um aquecimento a um exercício não
diz nada sobre outros exercícios, ao contrário das alternativas, que são
simétricas por definição.

A **ordem** em que os aquecimentos foram vinculados a um exercício MUST ser a
ordem em que o visualizador os percorre.

Excluir um aquecimento MUST desvinculá-lo de **todos** os exercícios que o
usavam, na mesma operação. A exclusão MUST NOT ser bloqueada por estar em uso, e
MUST NOT deixar exercício apontando para um registro que não existe mais.

#### Scenario: O mesmo aquecimento em vários exercícios
- GIVEN "Rotação de ombro" existe
- WHEN o usuário o vincula ao "Supino" e ao "Desenvolvimento"
- THEN os dois exercícios passam a oferecê-lo
- AND existe **um** registro de aquecimento, não dois

#### Scenario: Vários aquecimentos num exercício, na ordem escolhida
- GIVEN o usuário vincula "A", depois "B", depois "C" ao "Supino"
- WHEN abre os aquecimentos do "Supino"
- THEN eles são percorridos nessa ordem

#### Scenario: Excluir desvincula em vez de bloquear
- GIVEN "Rotação de ombro" está em três exercícios
- WHEN o usuário o exclui e confirma
- THEN a exclusão acontece
- AND os três exercícios deixam de listá-lo, sem referência órfã

---

### Requirement: Full-Screen Warmup Viewer

Os aquecimentos de um exercício MUST ser apresentados num **visualizador em tela
cheia**, com um item por vez. Ele MUST oferecer:

- **fechar**, no **topo**, devolvendo o usuário à tela do exercício de onde veio,
  na mesma aba;
- **avançar e voltar**, em controles `<` e `>` que **flutuam sobre a mídia**,
  nas bordas laterais, para que a mídia use a largura inteira da tela — o que
  mais importa para um vídeo vertical;
- **circulação infinita**: depois do último vem o primeiro, e antes do primeiro
  vem o último. Diferente do Voltar/Avançar do detalhe do exercício, que para
  nas pontas porque "não há próximo exercício" é informação real, uma pilha de
  aquecimentos não tem posição numa rotina — dar a volta é o caminho mais curto
  de volta ao que se quer rever. Os controles MUST NOT aparecer desabilitados;
- a **posição atual** ("N de M"), porque uma pilha sem contador não diz quanto
  falta;
- o **nome** do aquecimento exibido, já que a mídia sozinha pode não identificar
  o que é.

Com **um único** aquecimento os controles MUST NOT ser exibidos: um ciclo de um
seria dois botões que visivelmente não fazem nada.

O visualizador MUST ser um diálogo modal (`role="dialog"`, `aria-modal`): a
rolagem da tela de trás MUST ficar travada enquanto ele está aberto. Ele MUST
responder ao **teclado** — setas para navegar, `Esc` para fechar.

Uma mídia que **falhe ao carregar** MUST degradar para um estado legível, com o
nome do aquecimento visível, em vez de uma tela quebrada ou vazia. Esse estado
MUST oferecer **abrir o endereço fora do app**: ele atende dois casos — mídia
remota inalcançável, normal num app offline-first, e uma URL que nunca foi uma
imagem, já que é assim que o app trata o que não reconhece.

#### Scenario: Abrir, percorrer e fechar
- GIVEN um exercício com três aquecimentos
- WHEN o usuário abre o visualizador
- THEN vê o primeiro, com "1 de 3" e o nome dele
- WHEN toca `>` duas vezes
- THEN vê o terceiro, com "3 de 3"
- WHEN toca fechar
- THEN volta ao detalhe do exercício, na aba de onde saiu

#### Scenario: A navegação dá a volta
- GIVEN o visualizador mostrando o **último** de três
- WHEN o usuário toca `>`
- THEN volta ao primeiro
- WHEN toca `<` a partir do primeiro
- THEN vai ao último
- AND em nenhum momento um controle aparece desabilitado

#### Scenario: As setas ficam sobre a mídia
- GIVEN o visualizador aberto numa tela de celular
- WHEN o usuário observa a tela
- THEN os controles aparecem **sobre** a mídia, junto às bordas laterais
- AND a mídia ocupa a largura da tela, sem espaço reservado para eles

#### Scenario: Teclado
- GIVEN o visualizador aberto
- WHEN o usuário pressiona a seta direita
- THEN avança um item
- WHEN pressiona `Esc`
- THEN o visualizador fecha

#### Scenario: Um único aquecimento
- GIVEN um exercício com apenas um aquecimento
- WHEN o usuário abre o visualizador
- THEN vê "1 de 1"
- AND nenhuma seta é exibida

#### Scenario: Mídia que não carrega
- GIVEN um aquecimento cuja URL não responde
- WHEN ele é exibido no visualizador
- THEN um estado de falha é mostrado, com o nome do aquecimento legível
- AND a navegação e o fechar continuam funcionando

---

## MODIFIED

(Nenhum — capability nova.)

## REMOVED

(Nenhum.)
