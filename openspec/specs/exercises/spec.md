# exercises Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Register an Exercise

The user MUST be able to create an exercise with a name (e.g. "Rosca Direta"), a
**media URL**, **zero or more categories**, and **zero or more alternative
exercises** (see *Alternative Exercises*). A compound exercise (e.g. a bench
press training Peito **and** Tríceps) MAY carry several categories; an exercise
MAY also carry **none** — an exercise with no categories is **uncategorized** and
is shown with the label "Sem categoria". There is **no reserved "Sem categoria"
category**: uncategorized simply means an empty category list. The media MAY be a
**static image** (PNG/JPG/JPEG/WebP) or an **animated GIF** — a single URL field
accepts either. Exercises are global (not tied to a gym) and MAY be reused across
multiple training days and categories.

The category picker MUST let the user select **multiple** categories (e.g.
tap-to-toggle), and selecting none MUST be valid. O seletor de **alternativas**
segue a mesma forma — ver *Choose Alternatives in the Exercise Form*.

While the user fills the form, the media given MUST be previewed at large size —
see *Large Media Preview in the Exercise Form*. Listing thumbnails are unchanged.

#### Scenario: Create an exercise with a static image
- GIVEN category "Bíceps" exists
- WHEN the user creates exercise "Rosca Direta" with media URL "https://…/rosca.png" and category "Bíceps"
- THEN the exercise is persisted with its media URL and category
- AND it becomes available for selection when building training days

#### Scenario: Create an exercise with an animated GIF
- GIVEN category "Bíceps" exists
- WHEN the user creates exercise "Rosca Direta" with media URL "https://…/rosca.gif" and category "Bíceps"
- THEN the exercise is persisted with the GIF URL
- AND the app treats it as valid media (GIF is an accepted format)

#### Scenario: Require a name
- GIVEN the exercise form is open
- WHEN the user submits without a name
- THEN creation is blocked with a validation message

#### Scenario: Media URL is optional but validated when present
- GIVEN the user is creating an exercise
- WHEN a media URL is provided that is not a valid URL, or points to an unsupported type (not an image or GIF)
- THEN the app shows a validation message
- AND WHEN no media URL is provided, the exercise is still created (placeholder used at render time)

#### Scenario: Animated GIF renders animated
- GIVEN an exercise whose media URL is an animated GIF
- WHEN its detail view (or list thumbnail) renders the media
- THEN the GIF is shown and plays its animation (not a frozen frame)

#### Scenario: Create an exercise with multiple categories
- GIVEN categories "Peito" and "Tríceps" exist
- WHEN the user creates "Supino Reto" and selects both "Peito" and "Tríceps"
- THEN the exercise is persisted carrying both categories

#### Scenario: Create an exercise with no category
- GIVEN the exercise form is open
- WHEN the user creates "Alongamento" without selecting any category
- THEN the exercise is persisted with no categories and is shown as "Sem categoria"

#### Scenario: All of an exercise's categories are shown
- GIVEN "Supino Reto" is categorized as "Peito" and "Tríceps"
- WHEN it is shown in a listing or on its detail
- THEN both "Peito" and "Tríceps" are shown

#### Scenario: Create an exercise with no alternatives
- GIVEN the exercise form is open
- WHEN the user creates "Rosca Direta" without selecting any alternative
- THEN the exercise is persisted with no alternatives and behaves exactly as
  exercises did before alternatives existed

#### Scenario: Conferir a mídia antes de salvar
- GIVEN o usuário está criando "Rosca Direta"
- WHEN cola a URL "https://…/rosca.gif" no campo de mídia
- THEN vê a mídia em tamanho grande antes de salvar
- AND pode corrigir a URL caso não seja o exercício esperado

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
- AND its per-gym weight is shared across both days

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
  para ele.

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

Todo **detalhe de exercício** — o do catálogo (`/exercise/:id`) e o de uma
entrada de sessão — MUST apresentar uma seção **"Alternativas"** listando os
exercícios alternativos, cada um com sua **miniatura** e seu **nome**, e cada um
**tocável** para abrir o detalhe correspondente.

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
**alternatives**) and delete it. Deleting an exercise removes it from days,
removes its weight records, removes its **per-gym notes**, e **remove o vínculo
de alternativa nos exercícios que o apontavam**, de modo que nenhum vínculo
pendente sobreviva à exclusão.

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

### Requirement: Exercise Note and Photos on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**: a **"Detalhe"** tab with the existing content (the per-gym target
weight editor and its history), an **"Observações"** tab that shows and edits the
**per-gym exercise note** for `(active gym, exerciseId)` (see the
`exercise-notes` capability), and a **"Foto"** tab that shows and manages the
**per-gym exercise photos** for the same pair (see the `exercise-photos`
capability). The Observações tab provides an editable text field with an explicit
save; the Foto tab lists the pair's photos and lets the user attach one (camera or
gallery) or delete one. Both reflect the **same** data edited from the in-session
exercise detail (notes and photos are per `(gym, exercise)`, not per session).
When **no gym is active**, the Observações **and Foto** tabs MUST prompt the user
to create/select a gym first — the same treatment as the target-weight editor —
and nothing can be saved.

#### Scenario: Edit a note from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no note in "A"
- WHEN the user opens the exercise detail, switches to "Observações", types "banco no furo 3", and saves
- THEN the note `(A, Rosca Direta) = "banco no furo 3"` is persisted
- AND opening "Rosca Direta" during a session in gym "A" shows the same note

#### Scenario: Note follows the active gym
- GIVEN "Rosca Direta" has a note in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Observações" tab
- THEN no note text is shown (the note is scoped to the active gym)

#### Scenario: No active gym prompts for one
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Observações"
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

### Requirement: Exercise Media Display on Detail Views

On every **exercise detail view** (the exercise detail page, the in-session
exercise detail, and the day-form exercise preview), the exercise's media
(static image or animated GIF) MUST be shown **whole and at its natural
proportions** — the full image at at least its proportional height, never
cropped by a fixed-height container. Very tall media MUST be capped to a
screen-friendly height while remaining fully visible (contained, not cropped).
When the media is missing or fails to load, a placeholder MUST render as a tidy
box. This applies uniformly across all detail views (they share one media
presentation).

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

Every **exercise detail view** (the catalog exercise detail and the in-session
exercise detail) MUST show the exercise's **name exactly once**, in the screen's
**top bar** — the same bar that carries the back control. The body of the screen
MUST NOT repeat the name as a heading: a duplicated title reads as a layout
defect and pushes the useful content (media, tabs, target weight) further down a
screen that is used mid-workout.

These views MUST NOT show **training-day information** (neither the day the
detail was opened from, nor the count of days the exercise belongs to, nor the
session's day name). The user reaches the detail from a day they have just
chosen, so the day answers no question there and only costs vertical space. This
does **not** affect the **exercises list** (Settings → Exercícios), which MUST
keep showing each exercise's days — see *Show Training Days on the Exercises
List*.

The header MAY still carry **contextual labels that are not the name and not the
day** — the exercise's **categories**, and (in a session) the entry's
**"Concluído"** status indicator.

Removing the day from the header MUST NOT change **navigation**: the catalog
detail still carries its day context in the address, still offers Voltar /
Avançar over that day's exercises, and going back still returns to Home with
that day expanded (see the `home-navigation` capability).

#### Scenario: Catalog detail shows the name once
- GIVEN the user opens "Rosca Direta" from "Dia 2"
- WHEN the detail renders
- THEN "Rosca Direta" appears exactly once on the screen, in the top bar
- AND no heading below the media repeats it

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
- THEN "Peito" and "Tríceps" are shown as labels
- AND the "Concluído" indicator is still shown

#### Scenario: Navigation is unaffected
- GIVEN the user opened "Supino" from "Dia 4" on the catalog detail
- WHEN the user taps "Avançar" and then goes back
- THEN stepping still follows "Dia 4"'s order
- AND going back returns to Home with "Dia 4" still expanded

#### Scenario: The exercises list still shows days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views Settings → Exercícios
- THEN the "Rosca Direta" item still shows both day labels


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
and **filters by category and by training day**, combinable, that narrow the
displayed exercises without changing any underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category (matching exercises that **include** that category among their
  categories), and "no category" (matching exercises with **no** categories).
- The **day filter** MUST support "all days" (no filtering), a specific
  training day (matching exercises registered in that day), and "no day"
  (matching exercises registered in no training day).
- All active filters MUST combine with AND logic.
- When the combination of filters matches **no exercise**, the list MUST show a
  distinct "no matches" message (different from the message shown when there
  are no exercises at all) with a way to clear the filters.
- The filtered list MUST update live as filters change and as the underlying
  exercises/categories/days change.

#### Scenario: Search by name narrows the list
- GIVEN exercises "Rosca Direta" and "Rosca Scott" and "Supino Reto" exist
- WHEN the user types "rosca" in the search field
- THEN only "Rosca Direta" and "Rosca Scott" are shown

#### Scenario: Search is accent-insensitive
- GIVEN an exercise named "Elevação Lateral" exists
- WHEN the user types "elevacao" (no accent) in the search field
- THEN "Elevação Lateral" is shown

#### Scenario: Filter by a specific category (including compound exercises)
- GIVEN "Rosca Direta" is categorized "Bíceps" and "Remada" is categorized "Costas" and "Bíceps"
- WHEN the user selects category "Bíceps" in the category filter
- THEN both "Rosca Direta" and "Remada" are shown (any exercise that includes "Bíceps")

#### Scenario: Filter by "no category"
- GIVEN "Alongamento" has no category and "Rosca Direta" is categorized as "Bíceps"
- WHEN the user selects "Sem categoria" in the category filter
- THEN only "Alongamento" is shown

#### Scenario: Filter by a specific training day
- GIVEN "Rosca Direta" is in "Dia 2" and "Supino Reto" is in "Dia 1"
- WHEN the user selects "Dia 2" in the day filter
- THEN only "Rosca Direta" is shown

#### Scenario: Filter by "no day"
- GIVEN "Alongamento" is registered in no training day
- WHEN the user selects "Nenhum dia" in the day filter
- THEN only exercises registered in no day (including "Alongamento") are shown

#### Scenario: Combined filters apply together
- GIVEN "Rosca Direta" (category "Bíceps", in "Dia 2") and "Rosca Scott" (category "Bíceps", in "Dia 1") both exist
- WHEN the user selects category "Bíceps" and day "Dia 2"
- THEN only "Rosca Direta" is shown

#### Scenario: No matches shows a distinct empty state
- GIVEN the exercises list has items
- WHEN the active filters match no exercise
- THEN a "no matches" message is shown (distinct from the "no exercises at all" message)
- AND the user can clear the filters to see the full list again

#### Scenario: Filters do not affect underlying data
- GIVEN exercises are filtered down to a subset
- WHEN the user creates, edits, or deletes an exercise
- THEN the operation behaves the same as when unfiltered
- AND the underlying exercise records are unaffected by the current filter selection
