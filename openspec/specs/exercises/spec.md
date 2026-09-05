# exercises Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.

## Requirements

### Requirement: Register an Exercise

O usuário MUST poder cadastrar um exercício com **nome**, **mídia** opcional
(imagem ou GIF), **categorias** (zero ou mais), **tipo** (**Força** ou
**Cardio**, ver *Exercise Kind*) e **vídeos de execução** (zero ou mais, ver a
capability `exercise-videos`). O nome MUST ser obrigatório; o tipo MUST vir
preenchido como **Força**.

O formulário MUST NOT oferecer seletor de **aquecimentos**: o conceito deixou de
existir (ver *Deprecated*).

#### Scenario: Criar com tipo
- GIVEN o formulário de exercício aberto
- WHEN o usuário informa nome, escolhe o tipo e salva
- THEN o exercício é persistido com o tipo escolhido

#### Scenario: Nome continua obrigatório
- GIVEN o formulário de exercício aberto
- WHEN o usuário salva sem nome
- THEN o cadastro é bloqueado com uma mensagem de validação

#### Scenario: Não há campo de aquecimento
- GIVEN o formulário de exercício aberto
- WHEN o usuário percorre os campos
- THEN não há seletor nem seção de aquecimentos


### Requirement: Exercise Kind — Força or Cardio

Todo exercício MUST ter um **tipo**: **Força** ou **Cardio**. O tipo é do
exercício (não da academia, não do dia) e MUST ser escolhido no formulário do
exercício, com **Força** como padrão.

O tipo MUST determinar três coisas, e nada além delas:

- **Peso.** Um exercício de Cardio MUST NOT ter peso alvo nem histórico de peso
  exibidos em lugar algum. Observação e fotos continuam disponíveis, por
  academia, como em qualquer exercício.
- **Dias de treino.** Um exercício de Cardio MUST NOT ser oferecido ao montar
  um dia de treino.
- **Onde ele é iniciado.** Força começa a partir de um **dia** na Home; Cardio
  começa a partir do **próprio exercício**, na aba Cardio.

Exercícios já cadastrados MUST passar a valer como **Força**, sem exigir revisão
do catálogo.

#### Scenario: Novo exercício nasce Força
- GIVEN o usuário abre o formulário de novo exercício
- WHEN observa o campo de tipo
- THEN "Força" está selecionado
- AND salvar sem tocar no campo cria um exercício de Força

#### Scenario: Cadastrar um cardio
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário informa "Esteira", escolhe **Cardio** e salva
- THEN o exercício é criado como Cardio
- AND ele aparece na aba Cardio, não na lista de exercícios de um dia

#### Scenario: O tipo é visível na lista do catálogo
- GIVEN existem exercícios dos dois tipos
- WHEN o usuário abre a lista de exercícios em Configurações
- THEN cada linha indica o tipo do exercício

#### Scenario: Exercícios existentes viram Força
- GIVEN um catálogo criado antes desta mudança
- WHEN o app é aberto pela primeira vez depois dela
- THEN todo exercício existente é Força
- AND nada no comportamento deles muda

### Requirement: Changing an Exercise to Cardio Leaves the Days

Mudar um exercício de **Força para Cardio** MUST removê-lo de **todos** os dias
de treino em que estiver, porque um dia não pode conter cardio.

A remoção MUST ser **confirmada** antes de acontecer, e a confirmação MUST
**nomear os dias** que perderão o exercício. Recusar MUST deixar o exercício e
os dias exatamente como estavam.

Os **pesos e o histórico de peso** já registrados para esse exercício MUST NOT
ser apagados: eles apenas deixam de ser exibidos enquanto ele for Cardio, e
voltam se ele voltar a ser Força. Uma troca de campo não destrói histórico em
silêncio.

#### Scenario: Trocar para Cardio remove dos dias, com aviso
- GIVEN "Esteira" é Força e está no "Dia 2" e no "Dia 4"
- WHEN o usuário muda o tipo para Cardio e salva
- THEN uma confirmação informa que ele sairá de "Dia 2" e "Dia 4"
- AND ao confirmar, o exercício vira Cardio e some desses dois dias

#### Scenario: Recusar a confirmação não muda nada
- GIVEN a confirmação da troca de tipo está na tela
- WHEN o usuário recusa
- THEN o exercício continua Força
- AND continua nos mesmos dias

#### Scenario: Trocar para Cardio sem estar em dia algum não pergunta
- GIVEN "Bicicleta" é Força e não está em nenhum dia
- WHEN o usuário muda o tipo para Cardio e salva
- THEN a troca acontece direto, sem confirmação

#### Scenario: O peso sobrevive à ida e à volta
- GIVEN "Esteira" tem peso e histórico registrados como Força
- WHEN o usuário a torna Cardio e depois volta a torná-la Força
- THEN o peso e o histórico anteriores voltam a ser exibidos

### Requirement: Large Media Preview in the Exercise Form

O formulário de cadastro/edição de exercício MUST mostrar a mídia informada em
uma **pré-visualização grande**, com o mesmo tratamento visual da mídia na tela
de detalhe do exercício: largura total do conteúdo, **proporção natural
preservada** (sem corte) e altura limitada à viewport.

A pré-visualização MUST aparecer **imediatamente abaixo** do campo de URL da
mídia e MUST estar sempre presente: quando não há URL, ou quando a URL falha ao
carregar, o mesmo espaço MUST exibir o placeholder de mídia, de modo que o
layout não salte ao digitar.

#### Scenario: Pré-visualização em tamanho grande
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário informa uma URL de imagem válida
- THEN a imagem é exibida ocupando a largura do conteúdo, na sua proporção
  natural, sem recorte

#### Scenario: Paridade com a tela de detalhe
- GIVEN um exercício com uma mídia retrato
- WHEN o usuário compara a pré-visualização no formulário de edição com a mídia
  na tela de detalhe do mesmo exercício
- THEN o enquadramento e o tamanho são equivalentes (nenhuma das duas corta a
  imagem)

#### Scenario: Placeholder sem mídia
- GIVEN o formulário de novo exercício está aberto
- WHEN o campo de URL está vazio
- THEN o espaço da pré-visualização exibe o placeholder de mídia
- AND ao digitar uma URL válida a imagem substitui o placeholder sem deslocar os
  demais campos

#### Scenario: URL quebrada
- GIVEN o usuário informou uma URL que falha ao carregar
- WHEN a pré-visualização tenta renderizar
- THEN o placeholder de mídia é exibido no lugar da imagem

#### Scenario: GIF animado na pré-visualização
- GIVEN o usuário informou a URL de um GIF animado
- WHEN a pré-visualização renderiza
- THEN o GIF é exibido e anima (não um quadro congelado)

### Requirement: Reuse Exercises Across Days and Categories

The same exercise MUST be selectable in multiple training days without
duplication of the underlying exercise record.

#### Scenario: Same exercise on two days
- GIVEN exercise "Rosca Direta" exists
- WHEN the user adds it to both "Dia 1" and "Dia 3"
- THEN both days reference the same exercise record
- AND its target weight is shared across both days

### Requirement: Alternative Exercises

Um exercício MUST poder declarar **n outros exercícios** como suas
**alternativas** — formas diferentes de treinar a mesma coisa (supino com barra
e supino na máquina; supino e crucifixo). A relação MUST ser:

- **Simétrica** — marcar B como alternativa de A marca A como alternativa de B,
  de modo que o par é declarado **uma vez**, do lado que o usuário estiver
  editando;
- **NÃO transitiva** — A pode listar B e C **sem** que B e C virem alternativas
  entre si. É isso que permite um mesmo exercício encabeçar **vários tipos de
  variação**: o supino reto troca pela máquina (mesmo movimento) e pelo
  crucifixo (mesmo músculo), e esses dois nunca se tornam intercambiáveis por
  associação;
- **Global** — pertence aos exercícios, não a um dia de treino nem a uma
  academia;
- **Opcional** — um exercício sem alternativas é o caso normal, e nada muda
  para ele;
- **Válida entre as duas fontes** — um exercício do usuário MUST poder declarar
  um **oficial** como alternativa, e um oficial MAY trazer alternativas entre
  oficiais já declaradas no arquivo.

A simetria vale para o usuário **como comportamento observável**, mas o vínculo
usuário→oficial MUST ser gravado **somente no registro do usuário**: o oficial
não existe no banco e não pode receber o vínculo de volta. A simetria MUST,
então, ser restabelecida na **leitura** — as alternativas de um exercício são as
que ele declara **mais** os exercícios que o declaram. Para dois exercícios do
usuário isso não muda nada, porque os dois lados já estão gravados.

As alternativas MUST NOT alterar a composição dos **dias de treino**: adicionar
um exercício a um dia adiciona **somente ele**, e as alternativas não entram
junto (ver *Alternatives Do Not Join a Training Day*).

O **peso alvo** MUST continuar por exercício: cada alternativa mantém seu
próprio valor por academia e seu próprio histórico (ver a capability `weights`).
Observações e fotos também continuam por `(academia, exercício)`.

#### Scenario: Declarar uma alternativa
- GIVEN os exercícios "Supino Reto" e "Supino Máquina" existem sem alternativas
- WHEN o usuário declara "Supino Máquina" como alternativa de "Supino Reto"
- THEN "Supino Reto" lista "Supino Máquina"
- AND "Supino Máquina" lista "Supino Reto" (a relação vale nos dois sentidos)

#### Scenario: Declarar um oficial como alternativa de um exercício meu
- GIVEN o usuário cadastrou "Supino Caseiro" e existe o oficial "Supino Reto com Barra"
- WHEN ele declara o oficial como alternativa do seu exercício
- THEN "Supino Caseiro" lista o oficial
- AND o detalhe do oficial lista "Supino Caseiro" de volta
- AND nada foi gravado no registro oficial

#### Scenario: Desfazer o vínculo com um oficial
- GIVEN "Supino Caseiro" tem o oficial "Supino Reto com Barra" como alternativa
- WHEN o usuário remove o oficial das alternativas dele
- THEN nenhum dos dois lista o outro

#### Scenario: Excluir o exercício do usuário desfaz o vínculo
- GIVEN "Supino Caseiro" aponta para um oficial
- WHEN o usuário exclui "Supino Caseiro"
- THEN o detalhe do oficial não lista mais nada dele

#### Scenario: As alternativas entre oficiais vêm do arquivo
- GIVEN o arquivo oficial declara dois exercícios como alternativas um do outro
- WHEN o usuário abre qualquer um dos dois
- THEN o outro aparece na seção de alternativas
- AND nenhuma das duas pode ser removida pelo usuário

#### Scenario: Vários tipos de variação no mesmo exercício
- GIVEN "Supino Reto", "Supino Máquina" e "Crucifixo" existem
- WHEN o usuário declara "Supino Máquina" **e** "Crucifixo" como alternativas de
  "Supino Reto"
- THEN "Supino Reto" lista as duas
- AND "Supino Máquina" lista apenas "Supino Reto"
- AND "Crucifixo" lista apenas "Supino Reto"

#### Scenario: Escolher um exercício que já tem alternativas não absorve as dele
- GIVEN "Supino Máquina" já é alternativa de "Supino Halter"
- WHEN o usuário declara "Supino Máquina" como alternativa de "Supino Reto"
- THEN "Supino Máquina" passa a listar "Supino Halter" e "Supino Reto"
- AND "Supino Reto" e "Supino Halter" **não** viram alternativas um do outro

#### Scenario: Remover uma alternativa não mexe nas outras
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário remove "Crucifixo"
- THEN "Supino Reto" mantém "Supino Máquina"
- AND "Crucifixo" fica sem alternativas
- AND as demais alternativas de "Supino Máquina", se houver, ficam intactas

#### Scenario: Desfazer o par
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário remove "Supino Máquina" das alternativas de "Supino Reto"
- THEN nenhum dos dois lista o outro

#### Scenario: Pesos permanecem separados
- GIVEN "Supino Reto" (60 KG na academia "A") e "Supino Máquina" (45 KG na
  academia "A") são alternativas entre si
- WHEN o usuário edita o peso alvo de "Supino Reto" para 62,5 KG
- THEN "Supino Máquina" continua em 45 KG na academia "A"
- AND o histórico de cada um registra apenas as próprias mudanças

### Requirement: Alternatives Do Not Join a Training Day

Declarar alternativas MUST NOT alterar nenhum dia de treino, nem no cadastro nem
na exibição. Um dia lista **exatamente** os exercícios que o usuário colocou
nele: as alternativas não são acrescentadas, não são agrupadas com nada, não
alteram a contagem de exercícios do dia e não viram parada da navegação
Voltar/Avançar. Elas são um caminho a percorrer a partir do detalhe, não uma
mudança na composição do treino.

O usuário **pode** colocar duas alternativas no mesmo dia, se quiser fazer as
duas — nesse caso são dois exercícios independentes, como quaisquer outros.

#### Scenario: O dia mostra só o que foi adicionado
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário adiciona apenas "Supino Reto" a "Dia 1" e abre a Home
- THEN a lista de "Dia 1" mostra "Supino Reto" e nenhuma das alternativas

#### Scenario: A contagem do dia não muda
- GIVEN "Dia 1" contém 8 exercícios, um deles com duas alternativas
- WHEN o dia é listado
- THEN a contagem exibida continua sendo 8

#### Scenario: A sessão tem uma entrada por exercício do dia
- GIVEN "Dia 1" contém "Supino Reto" (com alternativas) e "Tríceps Corda"
- WHEN o usuário inicia o treino
- THEN a sessão tem duas entradas, "Supino Reto" e "Tríceps Corda"

### Requirement: Choose Alternatives in the Exercise Form

O formulário de exercício (novo e edição) MUST oferecer um seletor
**"Alternativas"** — seleção múltipla, com **busca por nome**, sobre os demais
exercícios cadastrados. O próprio exercício MUST NOT aparecer entre as opções, e
os já selecionados MUST permanecer visíveis independentemente da busca, para que
desmarcar não exija procurá-los de novo.

Salvar o exercício A com a seleção `L` MUST tornar `L` a lista de A e escrever
**apenas o vínculo de volta para A** nos demais — as alternativas que cada um
deles já tinha não são assunto dessa edição.

O formulário MUST explicar, em texto de apoio, que as alternativas **não** entram
nos dias de treino junto com o exercício.

#### Scenario: Selecionar alternativas ao criar
- GIVEN "Supino Reto" existe
- WHEN o usuário cria "Supino Máquina" e seleciona "Supino Reto" em Alternativas
- THEN os dois passam a ser alternativas entre si

#### Scenario: Selecionar várias de uma vez
- GIVEN "Supino Máquina" e "Crucifixo" existem
- WHEN o usuário edita "Supino Reto" e seleciona as duas
- THEN "Supino Reto" lista as duas, e cada uma delas lista apenas "Supino Reto"

#### Scenario: O próprio exercício não é uma opção
- GIVEN o usuário está editando "Supino Reto"
- WHEN abre o seletor de alternativas
- THEN "Supino Reto" não está entre as opções

#### Scenario: Buscar entre as opções
- GIVEN existem "Supino Reto", "Supino Máquina" e "Rosca Direta"
- WHEN o usuário digita "supino" na busca do seletor
- THEN apenas "Supino Máquina" é oferecido (o próprio exercício nunca aparece)
- AND os já selecionados continuam visíveis mesmo fora da busca

#### Scenario: Nenhuma alternativa é válido
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário salva sem selecionar nenhuma alternativa
- THEN o exercício é criado sem alternativas

### Requirement: Alternatives on the Exercises List

A lista de exercícios (Configurações → Exercícios) MUST indicar, em cada item
que tenha alternativas, **quais são elas** — junto dos rótulos de dia que o item
já mostra. Um exercício sem alternativas MUST NOT ganhar indicador nenhum (a
ausência é o caso comum e não precisa de ruído).

A indicação MUST atualizar automaticamente quando as alternativas mudam.

#### Scenario: Item com alternativas
- GIVEN "Supino Reto" tem "Supino Máquina" como alternativa
- WHEN o usuário vê a lista de Exercícios
- THEN o item "Supino Reto" indica "Supino Máquina" como alternativa

#### Scenario: Item sem alternativas
- GIVEN "Rosca Direta" não tem alternativas
- WHEN o usuário vê a lista
- THEN o item não mostra nenhum indicador de alternativa

#### Scenario: A indicação acompanha as mudanças
- GIVEN o item "Supino Reto" indica "Supino Máquina"
- WHEN o usuário desfaz o par
- THEN o indicador desaparece do item (atualiza ao vivo)

### Requirement: Alternatives Section on the Exercise Detail

Todo **detalhe de exercício** MUST apresentar uma seção **"Alternativas"**
listando os exercícios alternativos, cada um com sua **miniatura** e seu
**nome**, e cada um **tocável** para abrir o detalhe correspondente — tanto o
detalhe do catálogo (`/exercise/:id`) quanto o de uma entrada de sessão.

A seção MUST ficar no corpo da tela (junto do peso alvo), não na faixa de
rótulos do cabeçalho: é um lugar para onde ir, não um rótulo, e cresce com o
número de alternativas.

A seção MUST NOT ser exibida quando o exercício não tem alternativas — um card
vazio apareceria em quase todo exercício do catálogo.

Abrir uma alternativa a partir do catálogo MUST **preservar o contexto de dia**
presente no endereço, de modo que Voltar continue devolvendo à Home com aquele
dia expandido. Como a alternativa pode **não** pertencer àquele dia, ver *Open
Exercise Detail* na capability `home-navigation` para o comportamento da barra
Voltar/Avançar nesse caso.

#### Scenario: A seção lista as alternativas
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário abre o detalhe de "Supino Reto"
- THEN uma seção "Alternativas" lista os dois, com miniatura e nome

#### Scenario: Abrir a alternativa
- GIVEN o usuário abriu "Supino Reto" a partir de "Dia 1"
- WHEN toca "Supino Máquina" na seção Alternativas
- THEN o detalhe de "Supino Máquina" abre, ainda no contexto de "Dia 1"

#### Scenario: Cada alternativa mostra o próprio peso
- GIVEN "Supino Reto" (60 KG em "A") e "Supino Máquina" (45 KG em "A") são
  alternativas
- WHEN o usuário vai do detalhe de um para o do outro
- THEN o editor "Peso alvo" mostra 60 KG no primeiro e 45 KG no segundo

#### Scenario: Sem alternativas, sem seção
- GIVEN "Rosca Direta" não tem alternativas
- WHEN o usuário abre seu detalhe
- THEN nenhuma seção "Alternativas" é exibida

#### Scenario: A alternativa mostra o caminho de volta
- GIVEN "Supino Máquina" tem apenas "Supino Reto" como alternativa
- WHEN o usuário abre o detalhe de "Supino Máquina"
- THEN a seção Alternativas lista "Supino Reto"
- AND não lista "Crucifixo", que é alternativa do reto e não da máquina

### Requirement: Edit and Delete Exercises

The user MUST be able to edit an exercise (name, media URL, categories,
**alternatives**) and delete it — **desde que seja um exercício dele**. Um
exercício **oficial** MUST NOT ser editável nem excluível (ver *An Official
Exercise Is Read-Only*).

Deleting an exercise removes it from days, removes its weight records, removes
its **per-gym notes**, e **remove o vínculo de alternativa nos exercícios que o
apontavam**, de modo que nenhum vínculo pendente sobreviva à exclusão. Um
vínculo com um **oficial** não exige remoção alguma: ele só existia no registro
que está sendo excluído.

#### Scenario: Delete an exercise in use
- GIVEN exercise "Rosca Direta" is used by "Dia 1" and has weights in gym "A"
- WHEN the user deletes it
- THEN it is removed from "Dia 1"
- AND its weight records across all gyms are removed

#### Scenario: Deleting an exercise removes its notes
- GIVEN exercise "Rosca Direta" has notes in gyms "A" and "B"
- WHEN the user deletes it
- THEN its note records across all gyms are removed

#### Scenario: Excluir uma alternativa
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário exclui "Crucifixo"
- THEN "Supino Reto" mantém "Supino Máquina" e não lista mais o excluído

#### Scenario: Excluir um dos dois lados
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário exclui "Supino Máquina"
- THEN "Supino Reto" fica sem alternativas

#### Scenario: Um oficial não é excluível
- GIVEN um exercício oficial que o usuário não quer ver
- WHEN ele procura a ação de excluir
- THEN ela não é oferecida, e uma exclusão solicitada ao repositório é recusada

### Requirement: Exercise Note and Photos on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**, and those tabs MUST be the **first control below the top bar** —
before the media and before the target weight. The screen is opened to look
something up, and which of the four things the user wants is the first decision
they make on it.

Each tab MUST carry what belongs to it:

- **"Detalhe"** — the exercise's **media**, the per-gym **target weight** editor
  and its **history**, and the **Alternativas** section (see *Alternatives
  Section on the Exercise Detail*), in that order.
- **"Notas"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(active gym, exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit save.
  A aba chamava-se "Notas"; o rótulo mais curto é o que paga a quarta aba
  sem apertar a faixa numa tela estreita, e diz a mesma coisa.
- **"Vídeos"** — os **vídeos de execução** do exercício (ver a capability
  `exercise-videos`), listados e abertos no visualizador de tela cheia. Ao
  contrário da nota e das fotos, eles são do **exercício** e não do par
  `(academia, exercício)`: não dependem de academia ativa.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): listing them, attaching one (camera or gallery)
  and deleting one.

The media MUST NOT be rendered outside the "Detalhe" tab, and the categories
MUST NOT be rendered above the tabs — that is the vertical space this
arrangement exists to free.

This MUST match the in-session exercise detail's arrangement (see the
`workout-sessions` capability, *Session Exercise Detail*), down to which tab
holds the media and the categories. The two screens are the same view in two
contexts and the user moves between them constantly; only their first tab's
**label** differs ("Detalhe" here, "Execução" in a session), because only one of
them is about executing something right now.

Both the note and the photos reflect the **same** data edited from the
in-session exercise detail (notes and photos are per `(gym, exercise)`, not per
session). When **no gym is active**, the Notas **and Foto** tabs MUST
prompt the user to create/select a gym first — the same treatment as the
target-weight editor — and nothing can be saved. A aba **"Vídeos"** MUST continuar funcionando sem
academia ativa — não há o que escopar.

#### Scenario: Edit a note from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no note in "A"
- WHEN the user opens the exercise detail, switches to "Notas", types "banco no furo 3", and saves
- THEN the note `(A, Rosca Direta) = "banco no furo 3"` is persisted
- AND opening "Rosca Direta" during a session in gym "A" shows the same note

#### Scenario: Note follows the active gym
- GIVEN "Rosca Direta" has a note in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Notas" tab
- THEN no note text is shown (the note is scoped to the active gym)

#### Scenario: No active gym prompts for one
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Notas"
- THEN the tab prompts the user to create/select a gym first
- AND no note can be saved until a gym is active

#### Scenario: Attach a photo from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no photos in "A"
- WHEN the user opens the exercise detail, switches to "Foto", and attaches a photo
- THEN the photo is persisted for `(A, Rosca Direta)`
- AND opening "Rosca Direta" during a session in gym "A" shows the same photo

#### Scenario: Photos follow the active gym
- GIVEN "Rosca Direta" has photos in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Foto" tab
- THEN no photos are shown (photos are scoped to the active gym)

#### Scenario: No active gym prompts for one before a photo
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Foto"
- THEN the tab prompts the user to create/select a gym first
- AND no photo can be attached until a gym is active

#### Scenario: The tabs come before everything else
- GIVEN the user opens an exercise from the catalog
- WHEN the detail renders
- THEN the "Detalhe", "Notas", "Vídeos" and "Foto" tabs appear directly below
  the top bar, above the media and the target weight
- AND reaching them requires no scrolling

#### Scenario: The media belongs to the first tab
- GIVEN an exercise with a media URL
- WHEN the user opens its detail and switches to "Notas"
- THEN no media is shown
- AND switching back to "Detalhe" shows it again, above the target weight

#### Scenario: A aba de vídeos não depende de academia
- GIVEN nenhuma academia existe ainda
- WHEN o usuário abre um exercício e vai em "Vídeos"
- THEN os vídeos são exibidos normalmente
- AND nenhum convite para criar academia aparece nessa aba

#### Scenario: Categories live in "Notas"
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps"
- WHEN the user opens its catalog detail
- THEN no category label is shown above the tabs
- AND switching to "Notas" shows "Peito" and "Tríceps" above the note field

### Requirement: Exercise Media Display on Detail Views

Every **exercise detail view** MUST show the exercise's media (static image or
animated GIF) **whole and at its natural proportions** — the full image at at
least its proportional height, never cropped by a fixed-height container. Very
tall media MUST be capped to a screen-friendly height while remaining fully
visible (contained, not cropped). When the media is missing or fails to load, a
placeholder MUST render as a tidy box. This applies uniformly to the exercise
detail page, the in-session exercise detail and the day-form exercise preview
(they share one media presentation).

#### Scenario: Portrait image shows at full height
- GIVEN an exercise whose image is taller than it is wide
- WHEN the user opens the exercise detail
- THEN the whole image is shown at its natural proportion (no crop, not forced into a short landscape box)

#### Scenario: Landscape/square image shows fully
- GIVEN an exercise whose image is landscape or square
- WHEN the user opens the exercise detail
- THEN the whole image is shown proportionally, filling the available width

#### Scenario: Very tall media is capped, not cropped
- GIVEN an exercise whose media is extremely tall
- WHEN the user opens the exercise detail
- THEN the media is capped to a screen-friendly height
- AND the entire media is still visible (contained), not cropped

#### Scenario: Missing or broken media
- GIVEN an exercise with no media URL, or one that fails to load
- WHEN the user opens the exercise detail
- THEN a placeholder is shown as a tidy box (not a collapsed or distorted area)

#### Scenario: Consistent across detail views
- GIVEN the same exercise
- WHEN it is viewed on the exercise detail page, the in-session detail, and the day-form preview
- THEN its media is presented the same way (full, proportional) in all three

### Requirement: Single Exercise Title on Detail Views

Every **exercise detail view** MUST show the exercise's **name exactly once**, in
the screen's **top bar** — the same bar that carries the back control. This holds
for both the catalog exercise detail and the in-session one. The body of the screen
MUST NOT repeat the name as a heading: a duplicated title reads as a layout
defect and pushes the useful content (the tabs, the media, the target weight)
further down a screen that is used mid-workout.

These views MUST NOT show **training-day information** (neither the day the
detail was opened from, nor the count of days the exercise belongs to, nor the
session's day name). The user reaches the detail from a day they have just
chosen, so the day answers no question there and only costs vertical space. This
does **not** affect the **exercises list** (Settings → Exercícios), which MUST
keep showing each exercise's days — see *Show Training Days on the Exercises
List*.

Above the tabs, the header MAY carry only the **"Alternativa de X"** label — the
one thing up there that says the screen is showing something other than the
entry's own exercise. Everything else that once sat there belongs elsewhere: the
exercise's **categories** to a tab, because a category describes the exercise and
reads with the note (see *Exercise Note and Photos on the Catalog Detail*); and
the **"Concluído"** indicator to nothing at all, because the floating bar's
ticked control, that control's label and done tint, and the filled segment of the
progress strip already carry the fact three times over (see *Segmented Progress
on the Session Exercise Detail* and *One-Line Stepper With a Toggleable Done
Control*, in `workout-sessions`). A fourth badge for one boolean is a line the
user has to read past mid-workout. On the catalog detail there is no such label
at all, so the tabs meet the top bar directly.

Removing the day from the header MUST NOT change **navigation**: the catalog
detail still carries its day context in the address, still offers Voltar /
Avançar over that day's exercises, and going back still returns to Home with
that day expanded (see the `home-navigation` capability).

#### Scenario: Catalog detail shows the name once
- GIVEN the user opens "Rosca Direta" from "Dia 2"
- WHEN the detail renders
- THEN "Rosca Direta" appears exactly once on the screen, in the top bar
- AND no heading below the tabs repeats it

#### Scenario: In-session detail shows the name once
- GIVEN the user opens an entry's detail during a session
- WHEN the detail renders
- THEN the entry's exercise name appears exactly once, in the top bar

#### Scenario: No training day on the catalog detail
- GIVEN "Rosca Direta" belongs to "Dia 2" and "Dia 5" and is opened from "Dia 2"
- WHEN the detail renders
- THEN neither "Dia 2" nor a "2 dias" indication is shown anywhere on the screen

#### Scenario: No training day on the in-session detail
- GIVEN an in-progress session of "Dia 2"
- WHEN the user opens an entry's detail
- THEN the session's day name is not shown on the screen

#### Scenario: Categories and done status remain
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps", and its
  session entry is already done
- WHEN the user opens the in-session detail
- THEN no "Concluído" indicator is shown above the tabs
- AND the done state is legible from the floating bar's control
- AND "Peito" and "Tríceps" are shown as labels inside the notes tab

#### Scenario: Navigation is unaffected
- GIVEN the user opened "Supino" from "Dia 4" on the catalog detail
- WHEN the user taps "Avançar" and then goes back
- THEN stepping still follows "Dia 4"'s order
- AND going back returns to Home with "Dia 4" still expanded

#### Scenario: The exercises list still shows days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views Settings → Exercícios
- THEN the "Rosca Direta" item still shows both day labels

---

### Requirement: Show Training Days on the Exercises List

The exercises list (Settings → Exercícios) MUST show, for **each exercise**, the
**training days it is registered in** — the names of the days whose exercise
selection includes it, in the days' **display order**, each presented as an
**outlined label** (chip). When an exercise is in **no** day, the list MUST show
a neutral hint (e.g., "Nenhum dia"). The information MUST update automatically as
exercises are added to or removed from days.

#### Scenario: Exercise used in multiple days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views the Exercícios list
- THEN the "Rosca Direta" item shows both day names as outlined labels, in the days' display order

#### Scenario: Exercise used in no day
- GIVEN "Alongamento" is not in any training day
- WHEN the user views the Exercícios list
- THEN the "Alongamento" item shows a neutral hint (e.g., "Nenhum dia")

#### Scenario: Updates when membership changes
- GIVEN "Rosca Direta" shows "Dia 2" on the Exercícios list
- WHEN the user removes "Rosca Direta" from "Dia 2"
- THEN the list no longer shows "Dia 2" for it (updates live)

### Requirement: Filter and Search the Exercises List

The exercises list (Settings → Exercícios) MUST provide a **name search field**
and **filters by category, by training day and by kind**, combinable, that
narrow the displayed exercises without changing any underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category (matching exercises that **include** that category among
  their categories), and "no category" (matching exercises with **no**
  categories).
- The **day filter** MUST support "all days" (no filtering), a specific
  training day (matching exercises registered in that day), and "no day"
  (matching exercises registered in no training day).
- The **kind filter** MUST support "Todos" (no filtering), **Força** and
  **Cardio**. There is no "sem tipo": every exercise has one, and a record
  without the field is **Força** — the same default the form and the v10 upgrade
  use, so the filter cannot disagree with them about a partial row.
- All active filters MUST combine with AND logic.
- When the combination of filters matches **no exercise**, the list MUST show a
  distinct "no matches" message (different from the message shown when there
  are no exercises at all) with a way to clear the filters — which MUST reset
  the kind along with the rest.
- The filtered list MUST update live as filters change and as the underlying
  exercises/categories/days change.

O filtro por tipo MUST ser apresentado como um **controle segmentado** com as
três opções visíveis, e não como um terceiro seletor. São três opções, cabem no
mesmo controle que o formulário já usa para a mesma palavra, e um toque é menos
do que tocar-rolar-tocar. Ele MUST ficar **acima** dos seletores de categoria e
dia: é o corte mais grosso da lista, e a lista agora é longa (o catálogo oficial
sozinho já traz dezenas).

#### Scenario: Narrow to Cardio
- GIVEN a lista com exercícios de Força e de Cardio, das duas fontes
- WHEN o usuário escolhe "Cardio" no filtro de tipo
- THEN só exercícios de Cardio são exibidos, oficiais e do usuário
- AND nenhum de Força aparece

#### Scenario: Narrow to Força
- GIVEN a mesma lista
- WHEN o usuário escolhe "Força"
- THEN nenhum exercício de Cardio aparece

#### Scenario: The kind combines with the search
- GIVEN nenhum exercício de Cardio se chama "rosca"
- WHEN o usuário escolhe "Cardio" e busca "rosca"
- THEN a lista mostra a mensagem de "nenhum exercício encontrado"

#### Scenario: Clearing the filters resets the kind too
- GIVEN o filtro de tipo em "Cardio" e uma busca digitada
- WHEN o usuário toca "Limpar filtros"
- THEN o tipo volta para "Todos"
- AND os exercícios de Força voltam à lista

### Requirement: Two Sources, One Listing

O catálogo de exercícios MUST ser composto por **duas fontes**: o catálogo
**oficial**, que vem com o app, e o catálogo **do usuário**, que ele cadastra e
edita. Toda listagem de exercícios MUST apresentar as duas **concatenadas**, na
mesma lista e ordenadas por nome — a lista de Exercícios, a busca, os filtros, a
aba Cardio, o seletor de exercícios de um dia de treino e o seletor de
alternativas.

O catálogo oficial MUST viver **apenas no app**, como um arquivo JSON no bundle.
Nenhum registro oficial MUST ser gravado no banco de dados — nem na primeira
execução, nem em migração alguma. É isso que permite corrigir uma mídia
quebrada ou acrescentar exercícios apenas publicando uma versão nova, sem
migração e sem risco de sobrescrever o que é do usuário.

Um exercício oficial MUST ser distinguível de um do usuário por um selo
**"Oficial"** onde os dois aparecem **lado a lado**: na listagem de exercícios,
na de categorias e em todo seletor — o de exercícios de um dia de treino, o de
alternativas e o da troca dentro da sessão.

O selo no **seletor** não é decoração. Quem já usava o app tem exercícios com o
mesmo nome dos oficiais, e é montando um dia novo que se escolhe entre os dois —
pegar o oficial por engano no lugar do seu não perde nada, mas começa sem o peso
e sem o histórico que o outro tem.

O **detalhe do exercício** (`/exercise/:id`) MUST NOT exibir o selo nem explicar
de onde o exercício veio. Ali não há nenhum par para desempatar: a tela mostra um
movimento só, e quem chegou nela quer ver a execução e registrar o próprio peso.
A origem é resposta para uma pergunta que só a lista faz, e o selo lá já a
responde. Nenhuma tela MUST gastar um parágrafo explicando por que um exercício
oficial não é editável: os controles ausentes dizem isso, em toda visita, sem
cobrar uma linha de leitura.

Um exercício do usuário com o **mesmo nome** de um oficial MUST continuar
existindo separado dele. Nomes de exercício nunca foram únicos, os dois são
registros diferentes, e apagar o do usuário levaria junto o peso, o histórico, a
observação e as fotos dele.

#### Scenario: Um app recém-instalado já tem catálogo
- GIVEN um aparelho onde o app nunca foi usado
- WHEN o usuário abre a lista de exercícios
- THEN os exercícios do catálogo oficial aparecem
- AND o banco de dados não contém nenhum exercício

#### Scenario: As duas fontes numa lista só
- GIVEN o usuário cadastrou "Rosca Martelo Cabo"
- WHEN ele abre a lista de exercícios
- THEN "Rosca Martelo Cabo" aparece junto dos exercícios oficiais, em ordem de nome
- AND os oficiais exibem o selo "Oficial" e o dele não

#### Scenario: A busca e os filtros valem para as duas fontes
- GIVEN existem oficiais e exercícios do usuário com "rosca" no nome
- WHEN o usuário busca "rosca" ou filtra por uma categoria
- THEN o resultado inclui os das duas fontes que casam

#### Scenario: O detalhe não anuncia a origem
- GIVEN um exercício oficial aberto em `/exercise/:id`
- WHEN o usuário olha a tela
- THEN não há selo "Oficial" nem texto explicando que ele vem do catálogo do app
- AND o peso, as observações e as fotos funcionam normalmente

#### Scenario: O seletor do dia distingue as duas fontes
- GIVEN o usuário tem um "Supino Reto" seu e existe um oficial de nome parecido
- WHEN ele adiciona exercícios a um dia de treino
- THEN os dois aparecem no seletor, e só o oficial tem o selo

#### Scenario: Nome repetido convive
- GIVEN existe o oficial "Supino Reto com Barra" e o usuário já cadastrou um
  "Supino Reto com Barra" seu
- WHEN ele abre a lista
- THEN os dois aparecem, distinguidos pelo selo
- AND o peso e o histórico do exercício dele continuam intactos

#### Scenario: A aba Cardio também é unificada
- GIVEN o catálogo oficial traz exercícios de Cardio
- WHEN o usuário abre a aba Cardio
- THEN eles aparecem junto dos cardios que ele cadastrou

### Requirement: Official Ids Are the File's Ids, User Ids Live Above 10000

A origem de um exercício MUST ser lida do seu **id**, numa faixa reservada:

- **oficial** — `id ≤ 9999`, e o id MUST ser exatamente o do arquivo (o
  exercício `7` do arquivo é o `7` no app);
- **do usuário** — `id ≥ 10001`, atribuído no cadastro.

A origem MUST NOT ser guardada em campo algum. É uma propriedade do id, como o
tipo de mídia de um vídeo é uma propriedade da URL — um segundo lugar dizendo a
mesma coisa poderia discordar dela.

A faixa é a **baixa** porque os ids do arquivo já são os ids que os aparelhos em
uso carregam: o arquivo é um export do próprio banco. Preservá-los é o que faz a
migração custar nada (ver *Updating Swaps the Source, Not the Identity*), e
`10000` dá ao catálogo oficial espaço para crescer de 53 para milhares sem nunca
esbarrar num registro do usuário.

O id de um exercício ou categoria criado pelo usuário MUST ser atribuído
**explicitamente** pelo repositório, como `max(10000, maior id existente) + 1`,
dentro da mesma transação da escrita. MUST NOT depender do gerador de chaves do
IndexedDB: esvaziar uma object store **não** zera o contador, e numa instalação
nova ele começa em 1 — os dois entregariam um id dentro da faixa oficial. A
atribuição explícita MUST valer igual em aparelho novo e atualizado, e duas
criações concorrentes MUST NOT receber o mesmo id.

Toda referência a exercício MUST aceitar um id oficial sem tratamento especial:
os exercícios de um dia, o peso e seu histórico, a observação e a foto por
academia, a entrada de sessão e a lista de alternativas.

Os ids do arquivo oficial MUST ser **permanentes**. Uma versão nova do catálogo
MAY acrescentar, renomear, trocar a mídia ou aposentar um exercício; MUST NOT
renumerar os existentes — o número é o que liga o peso que o usuário registrou
ao movimento que ele fez. Um id que o arquivo não traz (hoje, o **10**) MUST
continuar vago: reaproveitá-lo daria a um movimento novo o histórico de um
movimento antigo.

#### Scenario: Um oficial recebe peso como qualquer outro
- GIVEN o usuário abre um exercício oficial na academia "A"
- WHEN ele define o peso alvo em 60 KG
- THEN o peso é gravado para aquele exercício
- AND o histórico registra a alteração como registra a de qualquer exercício

#### Scenario: Um oficial entra num dia de treino e numa sessão
- GIVEN o usuário adiciona um exercício oficial ao "Dia 1"
- WHEN ele inicia o treino desse dia
- THEN a sessão tem uma entrada para esse exercício, com o nome dele

#### Scenario: Observação e foto de um oficial
- GIVEN o usuário está na academia "A" com um exercício oficial aberto
- WHEN ele escreve uma observação e anexa uma foto
- THEN as duas são gravadas para aquele par (academia, exercício)
- AND aparecem quando ele volta ao mesmo exercício na mesma academia

#### Scenario: Um exercício novo nasce acima da faixa oficial
- GIVEN um aparelho recém-atualizado, cujas tabelas de exercícios e categorias
  foram esvaziadas
- WHEN o usuário cadastra um exercício
- THEN ele recebe um id maior que 10000

#### Scenario: Instalação nova também nasce acima da faixa
- GIVEN um aparelho onde o app nunca foi usado
- WHEN o usuário cadastra o primeiro exercício dele
- THEN ele recebe um id maior que 10000, e não 1

#### Scenario: Renumerar o arquivo é proibido
- GIVEN uma versão nova do catálogo oficial
- WHEN ela é publicada
- THEN todo exercício que continua existindo mantém o id que já tinha
- AND acrescentar exercícios novos usa ids ainda não usados
- AND o id 10, ausente do arquivo, continua sem ser usado

### Requirement: Updating Swaps the Source, Not the Identity

A atualização para esta versão MUST **esvaziar** as tabelas de exercícios e de
categorias do banco, e MUST NOT reescrever **nenhuma** referência a elas.

Isso não é perda de dado, e a razão é a premissa desta mudança: o arquivo oficial
é um **export do próprio banco**, então os ids que ele traz são os ids que os
aparelhos em uso já carregam. A linha sai do IndexedDB e o catálogo do app passa
a responder pelo mesmo número — a fonte muda, a identidade não.

Portanto, depois de atualizar:

- os **dias de treino** MUST continuar com os mesmos exercícios, na mesma ordem;
- o **peso** de cada exercício, global e por academia, e todo o seu **histórico**
  MUST continuar valendo para o mesmo movimento;
- as **observações**, as **fotos** e as **entradas de sessão** MUST continuar
  ligadas ao mesmo movimento;
- as **academias** e as **sessões** MUST ficar intactas.

Não renumerar é uma decisão de segurança, não de economia: reescrever seis
tabelas de referências é uma operação com muitas formas de sair pela metade, e
não reescrever nenhuma não tem nenhuma.

Um id na faixa oficial **sem correspondente** no arquivo — um exercício que o
usuário tenha criado além do catálogo — deixa de resolver. Os registros que
apontam para ele (peso, histórico, nota, foto, entrada de sessão) MUST NOT ser
excluídos: a tela MUST tratá-los como já trata a entrada de sessão cujo exercício
foi excluído. Apagar dado do usuário por causa de um id que não casou é o único
desfecho aqui que não teria volta.

#### Scenario: Atualizar troca a fonte e preserva o treino
- GIVEN um aparelho em uso, com dias de treino, pesos, histórico, notas, fotos e
  sessões concluídas
- WHEN o app é atualizado para esta versão
- THEN as tabelas de exercícios e categorias ficam vazias
- AND os dias continuam com os mesmos exercícios, na mesma ordem
- AND os pesos, os históricos, as notas, as fotos e as sessões continuam
  mostrando os mesmos exercícios de antes, agora vindos do catálogo oficial

#### Scenario: A migração não reescreve referência alguma
- GIVEN um aparelho em uso, antes da atualização
- WHEN a migração roda
- THEN nenhum registro de dia, peso, histórico, nota, foto ou entrada de sessão
  é alterado

#### Scenario: Um exercício criado além do catálogo não leva o histórico junto
- GIVEN o usuário tinha um exercício próprio, com um id que o arquivo oficial
  não traz, com peso e histórico
- WHEN o app é atualizado
- THEN o exercício deixa de aparecer na lista
- AND os registros de peso e histórico dele continuam no banco
- AND nenhuma tela quebra ao encontrá-los

### Requirement: The Official Catalog's Pictures Are Served by the App

A imagem de um exercício **oficial** MUST ser servida pelo **próprio app**, sob a
URL dele, e MUST NOT ser buscada no site de onde veio.

Elas nasceram como links para uma dúzia de sites de fitness. Cada um deles é uma
forma de o catálogo quebrar sem ninguém tocar no projeto — uma página que muda de
lugar, um host que passa a recusar hotlink, um domínio que expira — e nenhum
funciona na academia sem sinal, que é justamente onde o app é usado.

O arquivo MUST ser nomeado pelo **exercício** (`supino-reto-com-barra.webp`), e
não por um número nem pelo nome remoto: assim ele se lê na pasta, na aba de rede
e num relato de erro. O nome MUST ser seguro para URL — sem acento e sem
pontuação —, porque é numa URL que ele viaja.

O catálogo MUST NOT carregar endereço remoto algum. Ele viaja para **todo
aparelho instalado**, e uma dúzia de URLs de terceiros dentro dele não serve a
nenhum: as imagens foram baixadas **uma vez** e o que a partir daí importa é o
arquivo. A **procedência** — de onde cada figura veio — MUST ser preservada
junto dos masters, fora do que é publicado, porque ela interessa a quem mantém o
projeto e a mais ninguém.

Um exercício **sem** imagem MUST simplesmente não ter uma. É um estado válido do
catálogo, que as telas já sabem exibir; o que MUST NOT acontecer é o catálogo
nomear um arquivo que não existe.

A URL local MUST ser resolvida contra a **base do app**, que difere entre o
servidor de desenvolvimento e o site publicado.

As imagens MUST ficar **fora do precache** e ser guardadas em cache **no uso**.
São 51 e pesam alguns megabytes, quase tudo demonstração animada; ninguém usa 51
exercícios, então pré-carregar cobraria de toda instalação um catálogo que ela
nunca vai abrir. Uma passada pela própria rotina deixa offline os exercícios que
a pessoa de fato faz — que é o offline que importa.

Uma imagem em `public/` que o catálogo **não nomeia mais** MUST ser removida: um
exercício renomeado deixaria o arquivo antigo sendo publicado para sempre, sem
ninguém apontar para ele.

Isto vale para o catálogo **oficial**. A imagem de um exercício do **usuário**
continua sendo a URL que ele informou — é dele, e o app não baixa nem hospeda o
que o usuário aponta.

#### Scenario: A imagem vem do app
- GIVEN um exercício oficial com imagem
- WHEN a tela o exibe
- THEN a imagem é buscada na URL do próprio app
- AND nenhuma requisição vai para o site original

#### Scenario: O arquivo se chama como o exercício
- GIVEN o exercício oficial "Supino Reto com Barra"
- WHEN se olha o arquivo servido
- THEN ele se chama `supino-reto-com-barra.webp`

#### Scenario: O catálogo não leva endereço de terceiro
- GIVEN o catálogo publicado no app
- WHEN se inspeciona qualquer exercício
- THEN não há URL de site algum nele

#### Scenario: A procedência não se perde
- GIVEN uma imagem que veio de um site
- WHEN se procura de onde ela veio
- THEN o endereço está registrado junto do master, fora do que é publicado

#### Scenario: Um exercício sem imagem
- GIVEN um exercício oficial para o qual não há master
- WHEN a tela o exibe
- THEN ele aparece sem imagem, e nenhum arquivo inexistente é requisitado

#### Scenario: A instalação não paga pelo catálogo inteiro
- GIVEN o app recém-instalado
- WHEN o service worker termina de pré-carregar
- THEN as imagens dos exercícios não estão entre os arquivos pré-carregados

#### Scenario: O que a pessoa usa fica offline
- GIVEN o usuário abriu um exercício com imagem uma vez
- WHEN volta a ele sem rede
- THEN a imagem aparece

### Requirement: An Official Exercise Is Read-Only

Um exercício oficial MUST NOT poder ser editado nem excluído. A lista e o
detalhe MUST NOT oferecer as ações de editar e excluir para ele, e o
**repositório** MUST recusar a operação com erro de validação — um botão
escondido é apresentação, e a regra tem que valer para quem chamar a função.

Isso inclui as partes do exercício: nome, mídia, tipo, categorias e vídeos são
o que o arquivo diz, e nada na tela os altera. O que a lista oferece no lugar de
editar é **ver** (ver *A Read-Only View for an Exercise With No Form*).

O que é **do usuário** continua editável no exercício oficial: peso, histórico,
observação, foto e a presença dele nos dias de treino. Esses dados não são o
exercício; são o que o usuário registrou sobre ele.

#### Scenario: A lista não oferece editar nem excluir um oficial
- GIVEN a lista de exercícios com oficiais e exercícios do usuário
- WHEN o usuário olha as ações de cada linha
- THEN as linhas oficiais não têm editar nem excluir
- AND as dele têm as duas

#### Scenario: O repositório recusa alterar um oficial
- GIVEN um exercício oficial
- WHEN uma atualização ou exclusão é solicitada para ele
- THEN a operação é rejeitada com uma mensagem de validação
- AND nada é alterado

#### Scenario: O que é do usuário continua editável
- GIVEN um exercício oficial com peso e observação na academia "A"
- WHEN o usuário altera o peso e edita a observação
- THEN as duas alterações são gravadas normalmente

### Requirement: A Read-Only View for an Exercise With No Form

A lista de exercícios em Configurações MUST oferecer, para um exercício
**oficial**, um caminho para **visualizá-lo** — uma tela somente leitura
(`/settings/exercises/:id/view`) que mostra o que o formulário mostraria: mídia,
tipo, categorias, alternativas e vídeos.

Ela existe porque o oficial não tem formulário: não há registro para editar, e
sem essa tela a lista não oferecia **nenhuma** forma de ver com que categorias
ele veio, quais alternativas o arquivo declarou ou que vídeos ele carrega. O
detalhe de acompanhamento (`/exercise/:id`) é outra coisa, para outro momento —
é onde se registra peso, observação e foto.

A tela MUST NOT oferecer nenhum campo editável, nenhum "Salvar" e nenhum
"Excluir". Ela MUST NOT explicar de onde o exercício veio nem por que não é
editável: a ausência dos controles já diz, e um parágrafo repetindo isso em toda
visita cobra do leitor uma linha que ele só precisaria da primeira vez.

A rota MUST aceitar **qualquer** exercício, oficial ou não. Um exercício do
usuário chega ao formulário pela lista, que já mostra tudo isso e mais — mas uma
rota que recusasse metade dos ids seria uma armadilha para um link
compartilhado.

A tela é para **olhar**, e só. Ela MUST NOT oferecer atalho para o detalhe de
acompanhamento: o usuário veio de Configurações, e devolvê-lo à tela de treino a
partir daqui trocaria o contexto em que ele estava.

A lista de **vídeos** MUST mostrar, por vídeo, o **nome** (o rótulo, ou o
provedor quando não houver) e a **URL**, e MUST oferecer **copiar o endereço**.
Esta tela não edita nada, então o endereço é a única coisa que um leitor pode
querer levar para outro lugar. A cópia MUST relatar o que aconteceu — inclusive
a falha: a área de transferência não existe em todo contexto, e um botão que não
faz nada visível é pior do que um que diz que não conseguiu.

Tocar um vídeo da lista MUST abri-lo **em sobreposição**, no item tocado e com a
lista inteira atrás dele (ver *Media Pager*, em `exercise-videos`). Fechar MUST
devolver esta tela como estava: assistir a um vídeo não é sair dela.

#### Scenario: Ver um oficial a partir da lista
- GIVEN a lista de exercícios em Configurações
- WHEN o usuário aciona "Ver" numa linha oficial
- THEN abre uma tela com a mídia, o tipo, as categorias, as alternativas e os
  vídeos daquele exercício
- AND não há campo, "Salvar" nem "Excluir"
- AND não há atalho para o detalhe de acompanhamento

#### Scenario: O vídeo abre sobre a tela, no que foi tocado
- GIVEN um exercício com dois vídeos na tela de visualização
- WHEN o usuário toca o segundo
- THEN ele abre em sobreposição, mostrando "2 de 2"
- AND fechar devolve a tela de visualização como estava

#### Scenario: Copiar o endereço de um vídeo
- GIVEN a lista de vídeos na tela de visualização
- WHEN o usuário aciona copiar numa linha
- THEN a URL daquele vídeo vai para a área de transferência
- AND a tela confirma que copiou

#### Scenario: A cópia que não dá certo diz isso
- GIVEN um contexto em que a área de transferência recusa a escrita
- WHEN o usuário aciona copiar
- THEN a tela informa que não conseguiu copiar
- AND nada além disso muda

#### Scenario: Nada de aviso sobre a origem
- GIVEN a tela de visualização de um exercício oficial
- WHEN o usuário a lê
- THEN não há texto explicando de onde o exercício veio nem por que não é editável
- AND a ausência de campos, de "Salvar" e de "Excluir" é o que diz isso

#### Scenario: Um id que ninguém carrega
- GIVEN a rota de visualização com um id que não existe em nenhuma das fontes
- WHEN a tela abre
- THEN ela informa que o exercício não foi encontrado

---

### Requirement: An Official Exercise That the App No Longer Carries

Uma versão nova do app MAY aposentar um exercício oficial que o usuário usa.
Nesse caso os dados **dele** — peso, histórico, observação, foto, entradas de
sessão e a presença em dias de treino — MUST NOT ser apagados. A referência
simplesmente deixa de resolver, e a tela MUST tratá-la como já trata a entrada
de sessão cujo exercício foi excluído.

Apagar dado do usuário porque o app trocou de catálogo é o pior desfecho
possível, e o único irreversível.

#### Scenario: Um oficial aposentado não leva o histórico junto
- GIVEN o usuário tem peso e histórico num exercício oficial
- WHEN uma versão do app deixa de trazer esse exercício
- THEN os registros de peso e histórico dele continuam no banco
- AND nenhuma tela quebra ao encontrá-los

#### Scenario: Uma sessão antiga continua legível
- GIVEN uma sessão concluída com uma entrada de um exercício oficial aposentado
- WHEN o usuário abre essa sessão no histórico
- THEN a entrada aparece com o nome que foi guardado nela

---

### Requirement: The Notas Tab Says Whether There Is a Note

A aba **"Notas"** MUST indicar, **antes do toque**, que existe uma anotação para
aquele `(academia, exercício)` — um `(*)` ao lado do rótulo. Sem anotação, a aba
MUST ficar exatamente como está hoje.

É a mesma pergunta que a contagem responde para "Vídeos" e "Foto" — vale a pena
abrir? —, mas a nota **não é contável**: existe no máximo uma por par, então um
"(1)" seria um número que nunca varia e diz menos do que uma marca. Por isso a
aba carrega uma **marca**, não uma contagem.

A marca MUST seguir a regra das contagens no que importa: enquanto a leitura não
respondeu, a aba MUST NOT afirmar nada — nem que há nota, nem que não há. Uma
nota **em branco** MUST NOT ser marcada: espaços não são uma anotação, e a aba
tem de dizer o que o usuário veria dentro dela.

A marca MUST valer nas **duas** telas que têm a aba: o detalhe do catálogo e o
detalhe da entrada de sessão. Na sessão ela MUST refletir o exercício
**exibido** — enquanto uma alternativa está sendo vista, é a nota daquele
movimento que interessa, como já vale para a contagem de vídeos.

#### Scenario: A nota aparece na aba
- GIVEN um exercício sem anotação na academia ativa
- WHEN o usuário escreve e salva uma anotação
- THEN a aba "Notas" passa a exibir `(*)`

#### Scenario: Apagar a anotação tira a marca
- GIVEN um exercício com anotação
- WHEN o usuário apaga o texto e salva
- THEN a aba "Notas" volta a não exibir marca alguma

#### Scenario: A marca é daquele exercício, naquela academia
- GIVEN "Supino" tem anotação na academia "A" e "Rosca" não tem
- WHEN o usuário abre "Rosca"
- THEN a aba "Notas" não exibe marca

#### Scenario: Nada é afirmado antes da resposta
- GIVEN a tela do exercício acabou de montar
- WHEN o primeiro quadro é pintado
- THEN a aba "Notas" não exibe marca até a leitura responder

---

## Deprecated

### Warmup Button on the Exercise Detail (Removido: 2026-09-05)

O conceito de aquecimento sai do app inteiro. Os **vídeos de
execução** já cobrem o que o botão entregava — mídia de apoio ao exercício,
alcançada de dentro do detalhe dele — e cobrem melhor, porque vivem numa aba
própria, aceitam recorte de tempo e não exigem um cadastro à parte para depois
serem vinculados.

O botão, o visualizador que ele abria e a aba de onde ele saía deixam de existir.
O que fica no lugar é a aba **"Vídeos"**, que já está lá.

### Requirement: Stepping Through the Exercise List From the View

A tela de visualização MUST oferecer **Voltar** e **Avançar**, que levam ao
exercício **anterior** e ao **seguinte** da lista de onde o usuário veio, sem
passar por ela.

Sem isso a tela é um beco: andar uma posição custa voltar à lista, reencontrar
onde se estava e tocar de novo. E a lista é longa — o catálogo oficial sozinho
traz dezenas —, de modo que percorrer é exatamente o que se está fazendo ali.

Os controles MUST ser os **mesmos** que o detalhe do exercício já usa para
percorrer um dia de treino: mesma barra, mesmo lugar, mesmos nomes acessíveis. O
gesto já é conhecido; o que muda é o que ele percorre.

#### Scenario: Andar para o próximo e para o anterior
- GIVEN a tela de visualização de um exercício que está no meio da lista
- WHEN o usuário aciona "Avançar"
- THEN a tela mostra o exercício seguinte da lista
- WHEN aciona "Voltar"
- THEN volta ao exercício de onde saiu

### Requirement: The Walk Follows the List the User Came From

O percurso MUST ser a lista **como ela estava na tela**: os mesmos exercícios, na
mesma ordem, com **os filtros que estavam ativos** (busca, categoria, dia e
tipo).

Quem filtrou por "Cardio" e avançou não pode cair num exercício de Força que
acabou de filtrar fora — seria o app desfazendo, no gesto seguinte, o que o
usuário pediu no anterior.

Os filtros MUST viajar **no endereço** da tela, e não em estado de navegação. É a
mesma decisão que o detalhe do exercício já toma com o dia de origem, pela mesma
razão: o percurso tem de sobreviver a um recarregamento e a um link
compartilhado, e o histórico do navegador não sobrevive a nenhum dos dois.

Um parâmetro **ausente** MUST significar "sem esse filtro". Uma rota nua, sem
query alguma, MUST continuar abrindo a tela — percorrendo, então, a lista
inteira. Um valor que não dá para ler MUST ser tratado como ausente, e MUST NOT
impedir a tela de abrir.

A lista percorrida MUST ser obtida pelo **mesmo** filtro que a lista de
Configurações usa. Duas implementações da pergunta "quais exercícios são estes"
divergiriam na primeira mudança de filtro.

Navegar dentro da tela — avançar, voltar, ou abrir uma **alternativa** — MUST
preservar os mesmos filtros no endereço.

#### Scenario: O percurso respeita o filtro
- GIVEN a lista filtrada por tipo "Cardio"
- WHEN o usuário abre um resultado e aciona "Avançar"
- THEN o próximo é outro exercício de Cardio
- AND nenhum exercício de Força aparece no percurso

#### Scenario: O percurso respeita a busca
- GIVEN a lista com "rosca" digitado na busca
- WHEN o usuário percorre a partir de um resultado
- THEN só exercícios cujo nome casa com "rosca" aparecem

#### Scenario: Recarregar mantém o percurso
- GIVEN a tela aberta a partir de uma lista filtrada
- WHEN a página é recarregada
- THEN o percurso continua o mesmo, porque os filtros estão no endereço

#### Scenario: Uma rota sem filtros percorre tudo
- GIVEN a rota de visualização sem nenhum parâmetro
- WHEN a tela abre
- THEN ela funciona, e o percurso é a lista inteira

#### Scenario: Um parâmetro ilegível não impede a tela de abrir
- GIVEN um endereço com um filtro que não dá para interpretar
- WHEN a tela abre
- THEN o exercício é exibido normalmente
- AND aquele filtro é tratado como ausente

### Requirement: The Walk Stops at the Ends, and Is Absent Without a Place in It

No **primeiro** exercício da lista percorrida, "Voltar" MUST estar
desabilitado; no **último**, "Avançar". "Não há próximo" é informação real, e é o
que o detalhe do exercício já faz ao percorrer um dia. A lista MUST NOT dar a
volta: diferente de uma pilha de vídeos, uma lista ordenada tem começo e fim.

Quando o exercício aberto **não está** na lista percorrida, os controles MUST
estar **ausentes**, e não presentes com os dois lados mortos. Isso acontece de
formas normais: um link compartilhado que carregava outros filtros, uma
alternativa alcançada de dentro da própria tela, um exercício que deixou de casar
com a busca. Uma barra que visivelmente não faz nada é pior do que nenhuma — a
mesma decisão que o detalhe já toma quando o exercício não está no dia.

#### Scenario: Nas pontas
- GIVEN a tela aberta no **primeiro** exercício da lista
- WHEN o usuário olha os controles
- THEN "Voltar" está desabilitado e "Avançar" não
- AND no último exercício vale o inverso

#### Scenario: Fora da lista, sem controles
- GIVEN um exercício que não pertence à lista percorrida
- WHEN a tela abre
- THEN nenhum controle de percurso é exibido
- AND o resto da tela funciona normalmente

#### Scenario: A alternativa não finge um percurso
- GIVEN o usuário abre, de dentro da tela, uma alternativa que não está na lista
  filtrada
- WHEN a tela dela aparece
- THEN não há controles de percurso

---
