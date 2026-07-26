# Delta: home-navigation

**Change ID:** `home-day-card-tap-target`
**Affects:** card de dia na Home (`HomePage.tsx`, `home.css`) — alcance do toque
de expandir/recolher, e a posição e a natureza do chevron

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Training Day Card

Mantém-se boa parte do que já é exigido: cada dia é um card com o **nome**, as
**categorias**, uma affordance de **iniciar ou retomar** e uma de **expandir**; o
avatar vem de um mapa nome-para-arte com fallback neutro; e o nome acessível do
iniciar é exatamente "Iniciar" ou "Continuar", mesmo onde o rótulo visível está
oculto.

**Muda a distribuição das linhas.** O nome do dia MUST ocupar a **primeira
linha**, dividindo-a apenas com a **indicação de expandir**, que MUST ficar
alinhada à direita. O nome MUST ter toda a largura restante dessa linha, e é ele
que MUST quebrar quando não couber — a indicação não encolhe nem desce.

**Avatar**, **categorias** e a affordance de **iniciar** MUST ficar juntos na
**segunda linha**. Quando essa linha não puder dar às categorias uma largura
legível, a affordance de iniciar MUST quebrar para a própria linha em vez de
espremer as categorias até uma coluna ilegível.

A indicação de expandir sai de junto do iniciar por serem coisas de pesos
diferentes — uma começa um treino, a outra abre uma gaveta — e porque o que
expande é o **dia**, cujo nome está na primeira linha. A troca também devolve
largura às categorias, que são o aperto crônico da segunda linha.

Acrescenta-se ainda o **alcance do toque**.

O **cabeçalho inteiro do card** MUST expandir e recolher o dia: as duas linhas,
incluindo o avatar, as categorias e o espaço vazio ao redor. Não pode haver
região do cabeçalho que pareça parte do card e não responda ao toque — num
aparelho de toque, a diferença entre acertar o nome e errar por poucos pixels é
invisível, e a ausência de resposta se lê como travamento.

A affordance de **iniciar ou retomar** MUST permanecer um alvo próprio dentro
desse cabeçalho: tocá-la MUST iniciar o treino e MUST NOT expandir o dia.

A **lista de exercícios expandida** MUST NOT recolher o dia ao ser tocada. Ela
tem seus próprios destinos, e um toque perdido ali custaria ao usuário o estado
que ele acabou de abrir.

O cabeçalho MUST expor **um único controle** de expandir à navegação por teclado
e à tecnologia assistiva, carregando o nome do dia e seu estado de expandido.
A indicação visual de expandir — o chevron — MUST continuar visível e MUST
continuar respondendo ao toque, mas MUST NOT ser um segundo controle: dois
controles adjacentes que fazem a mesma coisa no mesmo card só gastam uma parada
de navegação por dia.

O estado de **foco** MUST corresponder ao que está de fato focado: quando o alvo
é o cabeçalho inteiro, um contorno desenhado apenas em volta do nome mente sobre
o alcance do controle.

Ampliar o alvo MUST NOT alterar a aparência do card — altura, espaçamento e
cores permanecem os mesmos.

#### Scenario: Name shares the first line only with the expand indicator
- GIVEN a day whose name is long
- WHEN the card renders
- THEN the name occupies the first line, with the expand indicator at its right edge
- AND the avatar, categories and start button are on the line below it

#### Scenario: O nome quebra, o indicador não
- GIVEN um dia cujo nome não cabe numa linha só
- WHEN o card é renderizado
- THEN o nome quebra em duas linhas
- AND o indicador de expandir continua no canto direito, alinhado à primeira
  linha do nome, sem encolher nem descer para a segunda

#### Scenario: The start affordance wraps instead of crushing the categories
- GIVEN a narrow viewport or a large font scale
- WHEN the categories cannot keep a readable width on the second line
- THEN the start affordance moves to its own line
- AND the expand indicator is unaffected, since it is on the first line

#### Scenario: Unmapped categories still render
- GIVEN a day whose categories match no artwork in the map
- WHEN the card renders
- THEN the avatar shows the neutral fallback and the card is otherwise complete

#### Scenario: Start button keeps its accessible name
- GIVEN a day with no active session
- WHEN assistive technology reads the start affordance
- THEN its name is exactly "Iniciar"

#### Scenario: Only the expected day carries the label
- GIVEN Home shows five days, one of them featured as "Próximo treino", and no active session
- WHEN the cards render
- THEN only the featured day's start affordance shows its text label
- AND the other four show the glyph alone while still being named "Iniciar" to assistive technology

#### Scenario: Tocar nas categorias expande o dia
- GIVEN um dia recolhido cujo cabeçalho mostra "Peito · Tríceps"
- WHEN o usuário toca nas categorias
- THEN o dia expande e lista seus exercícios

#### Scenario: Tocar no avatar expande o dia
- GIVEN um dia recolhido
- WHEN o usuário toca no avatar do grupo muscular
- THEN o dia expande

#### Scenario: Tocar no vazio do cabeçalho expande o dia
- GIVEN um dia recolhido cujo nome é curto, deixando espaço vazio entre o nome e
  o indicador de expandir
- WHEN o usuário toca nesse espaço vazio
- THEN o dia expande

#### Scenario: Iniciar não expande
- GIVEN um dia recolhido
- WHEN o usuário toca na affordance de iniciar
- THEN o treino começa
- AND o dia permanece recolhido

#### Scenario: O chevron continua expandindo, na nova posição
- GIVEN um dia recolhido, com o indicador de expandir à direita do nome
- WHEN o usuário toca no indicador
- THEN o dia expande

#### Scenario: A lista aberta não recolhe o dia
- GIVEN um dia expandido, listando seus exercícios
- WHEN o usuário toca em um dos exercícios
- THEN o exercício é aberto
- AND o dia continua expandido

#### Scenario: Um controle de expandir por dia
- GIVEN a Home mostra um dia
- WHEN a navegação por teclado percorre o card
- THEN há exatamente dois controles: o cabeçalho, que anuncia o nome do dia e se
  está expandido, e a affordance de iniciar
- AND o chevron não é uma parada de navegação

#### Scenario: O foco mostra o alcance real
- GIVEN o usuário navega até o cabeçalho de um dia pelo teclado
- WHEN o foco chega nele
- THEN a indicação de foco cobre o cabeçalho inteiro, e não apenas o nome

#### Scenario: Ampliar o alvo não mexe no visual
- GIVEN a Home com dias recolhidos, expandidos e o destacado como "Próximo treino"
- WHEN os cards são comparados com os de antes da mudança
- THEN fora a posição do indicador de expandir, altura, espaçamento e cores são
  os mesmos
- AND a faixa vermelha na borda esquerda continua visível em todos eles

---

### Requirement: Home Accordion of Training Days

Mantém-se tudo o que já é exigido: a Home apresenta os dias como **acordeão**,
com nome e categorias derivadas no cabeçalho (ou a contagem de exercícios como
fallback); o dia expandido faz parte do **endereço**, sobrevive a sair e voltar,
e expandir ou recolher **não** empilha histórico.

Acrescenta-se que o gesto de expandir e recolher MUST ser o **toque no cabeçalho
do card**, e não apenas no nome do dia — ver "Training Day Card".

#### Scenario: Day header shows derived categories
- GIVEN "Dia 1" contains "Supino" (Peito) and "Tríceps Corda" (Tríceps)
- WHEN the user views Home
- THEN the "Dia 1" header shows "Peito · Tríceps" as its secondary line

#### Scenario: Header falls back to the count
- GIVEN "Dia 2" contains 3 exercises, none with a category
- WHEN the user views Home
- THEN the "Dia 2" header shows "3 exercícios" as its secondary line

#### Scenario: Expand a day
- GIVEN "Dia 1" contains "Rosca Direta" and "Supino"
- WHEN the user taps "Dia 1" on Home
- THEN the day expands and lists "Rosca Direta" and "Supino" with their media thumbnails (image or GIF)

#### Scenario: Collapse a day
- GIVEN "Dia 1" is expanded
- WHEN the user taps "Dia 1" again
- THEN the day collapses and hides its exercise list

#### Scenario: Expandir tocando fora do nome
- GIVEN "Dia 1" está recolhido
- WHEN o usuário toca no cabeçalho do card, numa região que não é o nome
- THEN "Dia 1" expande, exatamente como se o nome tivesse sido tocado

#### Scenario: Empty state
- GIVEN no training days exist
- WHEN the user opens Home
- THEN an empty state guides the user to create data in Settings

#### Scenario: The expanded day survives leaving and returning
- GIVEN "Dia 3" is expanded on Home
- WHEN the user opens one of its exercises and then goes back
- THEN Home is shown with "Dia 3" still expanded

#### Scenario: Opening Home with a day addressed
- GIVEN the user opens Home addressed to "Dia 3" (e.g. reloads that address)
- WHEN Home renders
- THEN "Dia 3" is expanded

#### Scenario: A day that no longer exists
- GIVEN Home is opened addressed to a day that has since been deleted
- WHEN Home renders
- THEN no day is expanded and the screen behaves normally

#### Scenario: Toggling days does not pile up history
- GIVEN the user expands and collapses several days on Home
- WHEN the user then goes back
- THEN they leave Home, rather than stepping back through the accordion

---

## REMOVED

(None)
