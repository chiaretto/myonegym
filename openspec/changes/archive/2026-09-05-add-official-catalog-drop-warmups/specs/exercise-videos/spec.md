# Delta: exercise-videos

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** classificação de mídia pela URL, paginador de mídia, reprodução

---

## ADDED Requirements

### Requirement: Media Is Classified From Its URL

> Requisito **movido** da capability `warmups`, que deixa de existir, e
> reescrito sem a palavra "aquecimento". O código que ele especifica
> (`lib/embedMedia`) continua vivo e continua sendo usado — pelos vídeos, pelo
> paginador e pela validação de URL no repositório.

A forma de exibir uma mídia MUST ser derivada da **própria URL**, e MUST ser a
mesma classificação na validação e na renderização:

- URL terminando em extensão de **vídeo** (MP4, WebM) → tocada como vídeo, com
  controles;
- URL de um provedor com **endereço de player publicado** (YouTube, Vimeo,
  Instagram) → **embutida** no visualizador, convertida para esse endereço de
  player;
- **qualquer outra** URL http(s) → exibida como **imagem**.

Imagem é o **padrão**, não um quarto caso de "desconhecido". Muita URL de imagem
real não tem extensão — um caminho de CDN, `?format=jpg`, um recurso assinado —
e tratá-las como outra coisa tirava o usuário do app por uma figura que teria
aparecido sem problema. Quando o palpite erra, o próprio `<img>` falha e o
visualizador MUST cair no seu estado de falha, que mantém o endereço acessível
(ver *Media Pager*). É essa rede de segurança que torna o palpite otimista
seguro.

O tipo MUST NOT ser um campo do registro: seria uma segunda fonte de verdade
sobre a mesma URL, livre para divergir dela. Uma URL que não seja http(s) MUST
ser recusada.

**Embutir vale só para quem publica um endereço de player.** A página de
assistir não é o player: `youtube.com/watch?v=ID` recusa ser enquadrada
(`X-Frame-Options`), `youtube.com/embed/ID` não. O app MUST NOT tentar enquadrar
um site qualquer — produziria uma caixa em branco sem nada que a explique.

Uma mídia que a URL declara **vertical** (um Short do YouTube, um reel do
Instagram) MUST ser exibida num quadro vertical que ocupa a **altura disponível**
da tela, e não no quadro 16:9 — um vídeo vertical dentro de um quadro deitado
vira uma tira estreita com tarja dos dois lados. As demais MUST continuar em
16:9, pelo motivo inverso.

A orientação MUST ser decidida apenas pelo que a URL **declara** (`/shorts/`,
`/reel/`). Um Short compartilhado como `youtu.be/ID` é indistinguível de um vídeo
em paisagem nesse nível, e adivinhar vertical para esses colocaria todo vídeo
comum numa tira. Descobrir a proporção real exigiria consultar a API do
provedor, o que este app não faz.

O embed MUST reduzir o que entrega ao provedor no que estiver ao alcance do
próprio app: usar o host **sem cookies** quando o provedor publica um
(`youtube-nocookie.com`) e carregar sob demanda. Isso não torna o embed privado —
o provedor continua vendo a requisição e o endereço de quem assiste —, e essa é
uma **troca consciente**: o vídeo que a pessoa tem à mão está quase sempre nesses
provedores, e mandá-la para fora do app a cada consulta custava mais do que o
recurso valia.

#### Scenario: URL de imagem vira imagem
- GIVEN um item cuja URL termina em `.gif`
- WHEN ele é exibido
- THEN aparece como imagem, animada quando for um GIF

#### Scenario: URL de vídeo vira player
- GIVEN um item cuja URL termina em `.mp4`
- WHEN ele é exibido
- THEN aparece um player com controles

#### Scenario: Um Short ocupa a altura da tela
- GIVEN um item cuja URL é um Short do YouTube
- WHEN ele é exibido
- THEN o player aparece em quadro vertical, usando a altura disponível
- AND um vídeo em paisagem, no mesmo visualizador, continua em quadro deitado

#### Scenario: Vídeo de provedor conhecido toca dentro do app
- GIVEN um item com uma URL de vídeo do YouTube
- WHEN ele é exibido
- THEN o player aparece **dentro** do visualizador
- AND o endereço usado é o de player do provedor, não a página de assistir

#### Scenario: URL sem extensão é exibida como imagem
- GIVEN um item cuja URL não termina em extensão conhecida e não é de um
  provedor com player (um caminho de CDN, por exemplo)
- WHEN ele é exibido
- THEN o app o exibe como imagem, dentro do visualizador
- AND o usuário não é mandado para fora do app

#### Scenario: O palpite errado não vira beco sem saída
- GIVEN um item cuja URL é uma página, não uma imagem
- WHEN o visualizador tenta exibi-la e a carga falha
- THEN aparece o estado de falha com o nome do item
- AND o endereço continua acessível, para abrir fora do app
- AND avançar e voltar continuam funcionando

#### Scenario: URL inválida é recusada
- GIVEN o formulário de vídeo
- WHEN o usuário informa algo que não é http(s)
- THEN o cadastro é bloqueado com uma mensagem de validação

### Requirement: Media Pager

> Requisito **movido** da capability `warmups` (*Full-Screen Warmup Viewer*) e
> reescrito sem a palavra "aquecimento". A apresentação em **sobreposição**
> chegou a ser removida com os aquecimentos, por falta de cliente, e voltou
> quando a tela de visualização somente leitura passou a abrir um vídeo — agora
> com o modo **derivado** de haver um `onClose`, em vez de passado à parte.

Os vídeos de um exercício MUST ser apresentados num **paginador**, com um item
por vez. Ele MUST oferecer:

- **avançar e voltar**, em controles `<` e `>` que **flutuam sobre a mídia**,
  nas bordas laterais, para que a mídia use a largura inteira da tela — o que
  mais importa para um vídeo vertical;
- **circulação infinita**: depois do último vem o primeiro, e antes do primeiro
  vem o último. Diferente do Voltar/Avançar do detalhe do exercício, que para
  nas pontas porque "não há próximo exercício" é informação real, uma pilha de
  vídeos não tem posição numa rotina — dar a volta é o caminho mais curto de
  volta ao que se quer rever. Os controles MUST NOT aparecer desabilitados;
- a **posição atual** ("N de M"), porque uma pilha sem contador não diz quanto
  falta;
- o **nome** do item exibido, já que a mídia sozinha pode não identificar o que é.

Com um **único** item os controles MUST NOT ser exibidos: um ciclo de um seria
dois botões que visivelmente não fazem nada.

O paginador MUST ter **duas** apresentações, e a escolha entre elas MUST ser
**derivada de haver um jeito de fechar**, e não de um sinalizador próprio —
assim não existe a combinação quebrada de pedir um diálogo e esquecer a saída:

- **na página**, dentro da aba "Vídeos", que já **é** o paginador: não há o que
  fechar, não há tela atrás para travar, e as setas do teclado pertencem à
  página que ele divide;
- **em sobreposição**, para um vídeo aberto a partir de uma **lista** (a tela de
  visualização somente leitura). Diálogo modal: `role="dialog"`, `aria-modal`,
  fechar no topo, rolagem de trás travada e as setas do teclado ligadas —
  um paginador que só responde a toque não se usa com uma mão num desktop.

O paginador MUST aceitar **em qual item abrir**. Quem abre a partir de uma lista
clicou num vídeo específico, e começar sempre no primeiro obrigaria a percorrer
até ele — enquanto a aba, que não tem lista, simplesmente abre no primeiro.

Uma mídia que **falhe ao carregar** MUST degradar para um estado legível, com o
nome do item visível, em vez de uma tela quebrada ou vazia. Esse estado MUST
oferecer **abrir o endereço fora do app**: ele atende dois casos — mídia remota
inalcançável, normal num app offline-first, e uma URL que nunca foi um vídeo, já
que é assim que o app trata o que não reconhece.

#### Scenario: Percorrer os vídeos
- GIVEN um exercício com três vídeos e a aba "Vídeos" aberta
- WHEN o usuário toca `>` duas vezes
- THEN vê o terceiro, com "3 de 3"

#### Scenario: A navegação dá a volta
- GIVEN o paginador mostrando o último de três
- WHEN o usuário toca `>`
- THEN volta ao primeiro
- WHEN toca `<` a partir do primeiro
- THEN vai ao último
- AND em nenhum momento um controle aparece desabilitado

#### Scenario: As setas ficam sobre a mídia
- GIVEN a aba "Vídeos" aberta numa tela de celular
- WHEN o usuário observa a tela
- THEN os controles aparecem **sobre** a mídia, junto às bordas laterais
- AND a mídia ocupa a largura da tela, sem espaço reservado para eles

#### Scenario: Um único vídeo
- GIVEN um exercício com apenas um vídeo
- WHEN o usuário abre a aba
- THEN vê "1 de 1" e nenhuma seta

#### Scenario: Mídia que não carrega
- GIVEN um vídeo cuja URL não responde
- WHEN ele é exibido
- THEN um estado de falha é mostrado, com o nome do item legível
- AND a navegação continua funcionando

#### Scenario: A aba não é um diálogo
- GIVEN a aba "Vídeos" aberta
- WHEN o usuário observa a tela
- THEN não há botão de fechar, e a faixa de abas continua acessível acima dela
- AND as setas do teclado continuam pertencendo à página

#### Scenario: A partir de uma lista, abre em sobreposição e no item clicado
- GIVEN uma lista com três vídeos
- WHEN o usuário toca o **segundo**
- THEN o paginador abre **sobre** a tela, como diálogo, mostrando "2 de 3"
- AND fechar devolve a mesma tela, como estava
- AND `Esc` fecha do mesmo jeito

---

## MODIFIED Requirements

### Requirement: The Videos Tab on Both Exercise Details

O detalhe do exercício MUST apresentar uma aba **"Vídeos"**, tanto no **catálogo**
(`/exercise/:id`) quanto **dentro de uma sessão**. Os vídeos são do exercício —
não da academia —, e as duas telas são a mesma vista em dois contextos (ver
*Exercise Note and Photos on the Catalog Detail*, em `exercises`). É durante o
treino que se confere a execução, e obrigar a sair da sessão para isso derrotaria
o propósito.

A aba **É** o carrossel: abri-la MUST já exibir o **primeiro vídeo**, sem
listagem intermediária. Abrir a aba já é o ato de pedir os vídeos, e uma lista
poria um segundo toque entre a pergunta e a resposta. O que a lista diria — qual
vídeo é este — o próprio paginador já diz, com o **nome** (rótulo, ou provedor
quando não houver) e o **trecho**, ao lado da posição "N de M".

O vídeo exibido MUST começar a tocar **sozinho** e MUST **repetir** ao chegar ao
fim. Havendo recorte, a repetição MUST voltar ao **início do trecho**, e MUST NOT
voltar ao início do vídeo: quem marcou 2:10 a 2:45 pediu aquele trecho, e uma
segunda passagem que começa no segundo zero devolve exatamente o que o recorte
existia para evitar. Um vídeo de execução é visto muitas vezes seguidas para ler
o movimento; tanto o primeiro toque quanto o reinício de cada passagem são atrito
que não paga nada.

Sem vídeo algum, a aba MUST exibir um **estado vazio** — e ele MUST se limitar a
dizer que não há vídeo. MUST NOT explicar o que a aba guarda nem apontar o
caminho do cadastro: quem chegou aqui abriu uma aba chamada "Vídeos" e já sabe o
que ela guarda, e a instrução se paga uma vez e depois cobra em toda visita. É a
mesma decisão que tirou o parágrafo de origem da tela de visualização. Enquanto o
exercício não foi lido, a aba MUST NOT afirmar que está vazia (ver *Estados
Vazios Só Depois da Resposta*).

Enquanto uma **alternativa** está sendo vista dentro de uma sessão, a aba MUST
refletir o exercício **exibido**, como as demais abas já fazem.

Dentro de uma sessão, ver um vídeo MUST NOT marcar nada como feito nem avançar o
stepper: assistir não é executar. Como a aba não abre nada por cima da tela, não
há o que fechar — a faixa de abas MUST continuar alcançável acima do carrossel,
que é o que o mantém uma aba e não uma tomada de tela.

A aba MUST exibir, ao lado do seu rótulo, **quantos vídeos** há — assim o usuário
sabe se vale o toque antes de gastá-lo. A aba **Foto** MUST fazer o mesmo. Um
número **zero** MUST NOT ser exibido: "Vídeos (0)" gasta largura para dizer que a
aba está vazia, o que abri-la diz melhor — a mesma decisão que já esconde a seção
Alternativas. Enquanto a contagem não é **conhecida**, nada MUST ser exibido, e
não um zero (ver *Estados Vazios Só Depois da Resposta*).

#### Scenario: A aba abre já no vídeo
- GIVEN "Supino Reto" tem dois vídeos, o primeiro rotulado "pegada fechada"
- WHEN o usuário abre o detalhe e vai em "Vídeos"
- THEN o primeiro vídeo já está sendo exibido, com "1 de 2" e o seu nome
- AND nenhuma lista de vídeos é exibida antes dele

#### Scenario: Nada é aberto por cima da tela
- GIVEN o usuário está na aba "Vídeos"
- WHEN observa a tela
- THEN não há controle de fechar
- AND a faixa de abas continua visível acima do carrossel

#### Scenario: A repetição volta ao início do TRECHO
- GIVEN um vídeo com trecho de 2:10 a 2:45
- WHEN ele chega ao fim do trecho
- THEN volta a **2:10** e toca de novo, sem intervenção
- AND não volta ao início do vídeo

#### Scenario: Sem recorte, a repetição volta ao começo
- GIVEN um vídeo sem início marcado
- WHEN ele termina
- THEN volta ao segundo zero e toca de novo

#### Scenario: A aba existe na sessão
- GIVEN uma sessão em andamento com "Supino Reto"
- WHEN o usuário abre o detalhe da entrada
- THEN a aba "Vídeos" está lá, com os mesmos vídeos do catálogo

#### Scenario: Ver um vídeo não mexe na sessão
- GIVEN a aba "Vídeos" aberta a partir de uma entrada de sessão
- WHEN o usuário passa para o próximo vídeo
- THEN nada foi marcado como concluído e o stepper não avançou

#### Scenario: A aba diz quantos vídeos tem
- GIVEN "Supino Reto" tem dois vídeos e uma foto na academia ativa
- WHEN o usuário abre o detalhe
- THEN a aba de vídeos aparece como "Vídeos (2)"
- AND a aba de fotos aparece como "Foto (1)"

#### Scenario: Aba vazia não mostra zero
- GIVEN um exercício sem vídeo e sem foto
- WHEN o usuário abre o detalhe
- THEN as abas aparecem como "Vídeos" e "Foto", sem número

#### Scenario: A alternativa traz os próprios vídeos
- GIVEN o usuário está vendo uma alternativa dentro da sessão
- WHEN abre a aba "Vídeos"
- THEN vê os vídeos do exercício **exibido**, não os da entrada

#### Scenario: Sem vídeo, o estado vazio diz só isso
- GIVEN um exercício sem vídeo algum
- WHEN o usuário abre a aba "Vídeos"
- THEN a aba informa que não há vídeo
- AND não há texto explicando o que a aba guarda nem como cadastrar

### Requirement: YouTube and Instagram Play Inside the App

O app MUST exibir **embutidos**, sem tirar o usuário dele, os vídeos de
**YouTube** (`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`) e de **Instagram**
(`/reel/`, `/p/`, `/tv/`). Qualquer outro endereço MUST ser tratado como manda
*Media Is Classified From Its URL*.

A classificação MUST continuar **derivada da URL**, nunca gravada junto dela: a
URL é o fato, a classificação é uma leitura dela, e uma coluna `kind` seria uma
segunda fonte de verdade livre para divergir. O **recorte**, ao contrário, MUST
ser gravado — ele é dado do usuário, não está na URL e não pode ser derivado
dela.

Um **reel** do Instagram MUST ser exibido em **retrato**, como um Short do
YouTube já é: é vertical por definição do formato, e apresentá-lo em paisagem o
espremeria numa tira.

Um vídeo de exercício MUST **começar a tocar sozinho** ao ser exibido, e MUST
começar **mudo**. Abrir a aba já é o pedido para assistir — a aba **é** o
paginador —, e o mudo não é preferência e sim o preço: navegador algum concede
autoplay com áudio, e pedi-lo audível deixaria o vídeo simplesmente parado.

#### Scenario: YouTube embutido
- GIVEN um vídeo com a URL de um `watch?v=`
- WHEN o usuário o abre
- THEN ele toca dentro do app

#### Scenario: Reel do Instagram embutido e vertical
- GIVEN um vídeo com a URL de um reel
- WHEN o usuário o abre
- THEN ele toca dentro do app, em retrato

#### Scenario: Endereço não reconhecido
- GIVEN um vídeo cuja URL não é de nenhum provedor conhecido
- WHEN o usuário o abre
- THEN o estado de falha é exibido, com a opção de abrir o endereço fora do app

#### Scenario: O vídeo começa sozinho, mudo
- GIVEN um exercício com vídeos
- WHEN o usuário abre a aba "Vídeos"
- THEN o primeiro vídeo começa a tocar sem outra ação
- AND começa mudo

### Requirement: Videos Are Viewed in the Media Pager

> **Renomeia** *Videos Are Viewed in the Same Full-Screen Viewer as Warmups*:
> o título nomeava o outro cliente do paginador, que deixou de existir. Mesmo
> requisito, sem a comparação que não tem mais com quem ser feita.

Os vídeos MUST ser apresentados pelo paginador descrito em *Media Pager* — um
item por vez, `<` e `>` flutuando sobre a mídia nas bordas laterais, circulação
infinita, posição "N de M", o nome do item, e o estado de falha que oferece
abrir o endereço fora do app.

O paginador tinha **dois** clientes; agora tem um. Com o aquecimento fora, ele
deixa de precisar escolher entre duas apresentações e passa a ter só a que a aba
usa: **na página**, sem diálogo, sem fechar, sem travar rolagem alguma e sem
capturar as setas do teclado.

Com um **único** vídeo os controles MUST NOT ser exibidos.

#### Scenario: Percorrer os vídeos
- GIVEN um exercício com três vídeos e a aba "Vídeos" aberta
- WHEN o usuário toca `>` duas vezes
- THEN vê o terceiro, com "3 de 3"

#### Scenario: A navegação dá a volta
- GIVEN o carrossel mostrando o último vídeo
- WHEN o usuário toca `>`
- THEN volta ao primeiro

#### Scenario: Um único vídeo
- GIVEN um exercício com apenas um vídeo
- WHEN o usuário o abre
- THEN vê "1 de 1" e nenhuma seta

---

## REMOVED

(None)

---

## Nota de arquivamento

Dois requisitos **não modificados** aqui carregam, na sua justificativa,
comparações com o aquecimento — *Videos Belong to the Exercise, Not to a Record
of Their Own* e *A Video Is Registered Inside the Exercise Form*. Ao arquivar,
essas menções MUST ser reescritas ou removidas: nenhuma pode continuar dizendo
"ver a capability `warmups`", que não existirá mais. (*The Videos Tab on Both
Exercise Details* já foi limpo, na versão modificada acima.)

Onde a comparação era a **razão** de uma decisão (o vídeo é valor e não
registro, porque serve a um exercício só), ela MAY ser mantida em passado, como
histórico da decisão — desde que não aponte para uma capability inexistente.
