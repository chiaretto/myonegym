# home-navigation Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Home Accordion of Training Days

The Home screen MUST present training days as an **accordion**. Each day's header
MUST show the day **name** and, as a secondary line, the day's **derived
categories** — the distinct categories of the exercises in that day (see the
training-days spec) — falling back to the **exercise count** when the day has no
categorized exercises. Expanding a day lists that day's active exercises, each
showing its **name** and **media thumbnail** (a static image or an animated GIF).

The **expanded day MUST be part of the address**, not transient screen state, so
it survives leaving Home and coming back (see Open Exercise Detail). Opening Home
with a day addressed MUST expand that day; collapsing MUST clear it. Addressing a
day that no longer exists MUST expand nothing rather than fail. Expanding or
collapsing MUST NOT add browser history entries — otherwise Back would step
through the accordion instead of leaving Home.

O gesto de expandir e recolher MUST ser o **toque no cabeçalho do card**, e não
apenas no nome do dia — ver "Training Day Card".

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

### Requirement: Weekly Training Summary

The Home screen MUST present a **weekly training summary** at the top of the
content, showing how many workout sessions the user has **completed this week**
against a **fixed weekly goal of 7**.

This replaces the previous behaviour, where the total was the **number of
configured training days** (`days.length`). That denominator was misleading: with
9 configured days a user could never reach "9 / 9" inside a 7-day week, and the
number silently meant "sessions against day-plans" rather than a weekly goal.

The summary MUST include a **seven-day track**, one cell per day of the current
week, **Monday first** — matching the existing `startOfWeek` helper
(`src/lib/week.ts`), which anchors the week to local-midnight Monday.

Each cell MUST convey one of:

- **done** — at least one session was completed that day
- **today** — the current day, still open
- **future** — a day later in the week
- **empty** — a past day with no completed session

A past day with no session MUST render as **empty**, and MUST NOT be marked as a
failure. The app stores no weekday expectation per training day, so "no session
here" is the only claim the data supports.

All values MUST be **derived** from the existing completed-session history —
`Session.completedAt` is already persisted and indexed. No new persisted state is
introduced and no migration is required.

When there is no session history for the current week, the summary MUST render a
valid zero state (0 completed, all cells empty or future) rather than being absent
or broken.

The summary MAY show a **streak** of consecutive days trained, also derived from
completed-session history.

A contagem, a trilha e a sequência MUST considerar as sessões concluídas em
**todas as academias**, e MUST NOT ser recortadas pela academia ativa. A pergunta
que o resumo responde é "eu treinei esta semana?", não "eu treinei esta semana
**aqui**?" — quem treina em mais de um lugar tem uma semana só. Dois treinos em
academias diferentes na mesma semana MUST somar, e MUST marcar seus respectivos
dias na trilha.

Sessões cuja academia foi excluída MUST contar como qualquer outra: o treino
aconteceu.

Where the count and the track can disagree — more than one session on the same
calendar day — the day MUST be marked so the difference is legible rather than
looking like a defect.

#### Scenario: Summary reflects completed sessions
- GIVEN the user completed 3 sessions on distinct days of the current week
- WHEN the user opens Home
- THEN the summary shows the text "3 / 7 treinos"
- AND exactly 3 cells of the seven-day track are marked done

#### Scenario: Treinos em academias diferentes somam
- GIVEN o usuário treinou segunda na academia "A" e terça na academia "B"
- WHEN o usuário abre a Home, com qualquer uma das duas ativa
- THEN o resumo mostra "2 / 7 treinos"
- AND segunda e terça estão marcadas na trilha

#### Scenario: A contagem não muda ao trocar de academia
- GIVEN a Home mostra "2 / 7 treinos"
- WHEN o usuário troca a academia ativa
- THEN a contagem e a trilha continuam as mesmas

#### Scenario: Treino em academia excluída continua contando
- GIVEN o usuário treinou quarta e depois excluiu aquela academia
- WHEN o usuário abre a Home na mesma semana
- THEN quarta segue marcada na trilha e o treino segue somando na contagem

#### Scenario: Goal is fixed, not derived from configured days
- GIVEN the user has 4 configured training days
- WHEN the user opens Home
- THEN the summary shows a goal of 7, not 4

#### Scenario: Zero state at the start of the week
- GIVEN the user has completed no sessions in the current week
- WHEN the user opens Home on Monday
- THEN the summary renders "0 / 7 treinos" without error
- AND Monday is marked as today while the remaining six cells are future

#### Scenario: Week starts on Monday
- GIVEN the user completed a session on Sunday of the current week
- WHEN the user opens Home
- THEN that session counts toward the current week
- AND it is shown in the last cell of the track

#### Scenario: Past day with no session is not accused
- GIVEN today is Friday and the user did not train on Wednesday
- WHEN the user opens Home
- THEN Wednesday renders as an empty cell
- AND it carries no failure marker

#### Scenario: Two sessions on the same day stay legible
- GIVEN the user completed two sessions on Tuesday
- WHEN the user opens Home
- THEN Tuesday is marked as done and additionally flagged as having more than one session

### Requirement: Training Day Card

Each training day on Home MUST be presented as a card carrying the day **name**,
the **categories** it covers, an affordance to **start or resume** it, and an
affordance to **expand** it.

O nome do dia MUST ocupar a **primeira linha**, dividindo-a apenas com a
**indicação de expandir**, que MUST ficar alinhada à direita. O nome MUST ter toda
a largura restante dessa linha, e é ele que MUST quebrar quando não couber — a
indicação não encolhe nem desce.

**Avatar**, **categorias** e a affordance de **iniciar** MUST ficar juntos na
**segunda linha**. Quando essa linha não puder dar às categorias uma largura
legível, a affordance de iniciar MUST quebrar para a própria linha em vez de
espremer as categorias até uma coluna ilegível.

A indicação de expandir fica com o nome, e não com o iniciar, por serem coisas de
pesos diferentes — uma começa um treino, a outra abre uma gaveta — e porque o que
expande é o **dia**, cujo nome está na primeira linha.

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
A indicação visual de expandir MUST continuar visível e MUST continuar
respondendo ao toque, mas MUST NOT ser um segundo controle: dois controles
adjacentes que fazem a mesma coisa no mesmo card só gastam uma parada de
navegação por dia.

O estado de **foco** MUST corresponder ao que está de fato focado: quando o alvo
é o cabeçalho inteiro, um contorno desenhado apenas em volta do nome mente sobre
o alcance do controle.

The card MAY show a **muscle-group avatar** derived from the day's categories.
There is no muscle-group concept in the data model — `Category` is free text —
so the avatar MUST come from a name-to-artwork map with a neutral fallback, and a
day whose categories match nothing MUST still render a valid card.

The start affordance's **visible label** MAY be reserved for the days where
starting is the expected next action — the featured "Próximo treino" day, and the
day whose session is being resumed. On the remaining days it MAY be reduced to its
glyph alone, so that a screen of five day cards does not read as five equally
weighted calls to action.

The start affordance's accessible name MUST remain exactly **"Iniciar"**, or
**"Continuar"** when a session for that day is already active — including where
the visible label is hidden, since a hidden label contributes nothing to the
accessibility tree.

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

### Requirement: Open Exercise Detail

Tapping an exercise on Home MUST open its detail view showing the **rendered
media** (a static image or an animated GIF, played back animated) and the
**editable per-gym weight** (see weights spec).

The detail MUST **remember the training day it was opened from** — an exercise
may belong to several days, so the day cannot be inferred from the exercise. That
context MUST be carried in the **address**, so it survives a reload and the
browser's Back button. It has two consequences:

- **Going back MUST return to Home with that day still expanded** — not to a
  collapsed Home, which would make the user hunt for their place again.
- The detail MUST offer **Voltar / Avançar** controls that step to the
  **previous / next exercise of that day**, in the day's order, disabled at the
  first / last exercise. Stepping MUST preserve the day context. These controls
  MUST be presented as a **floating bar fixed to the bottom of the screen**, and
  MUST NOT cover any content (see the `workout-sessions` spec, which specifies the
  same bar for the in-session detail). There is **no "Concluir"** here — that
  belongs to a workout session.

When the detail is opened **without** a day (a direct link, a stale bookmark, or
a day that no longer exists), it MUST degrade gracefully: **no navigation bar**,
and going back returns to Home.

#### Scenario: View exercise detail
- GIVEN gym "A" is active and "Rosca Direta" has a media URL and weight 20 KG in "A"
- WHEN the user taps "Rosca Direta" from "Dia 1"
- THEN the detail view renders the media (image or animated GIF) and shows 20 KG with an edit control

#### Scenario: Broken media fallback
- GIVEN an exercise's media URL (image or GIF) fails to load
- WHEN its detail view (or list item) renders
- THEN a placeholder is shown instead of a broken image/GIF

#### Scenario: Going back returns to the day you came from
- GIVEN "Dia 3" is expanded on Home and the user taps "Supino" inside it
- WHEN the user goes back from the exercise detail
- THEN Home is shown with "Dia 3" still expanded

#### Scenario: Step through a day's exercises
- GIVEN "Dia 1" contains "Rosca Direta", "Supino" and "Tríceps Corda" in that order
- AND the user opened "Supino" from "Dia 1"
- WHEN the user taps "Avançar"
- THEN the detail for "Tríceps Corda" is shown, still in the context of "Dia 1"
- AND tapping "Voltar" twice from there returns to "Rosca Direta"

#### Scenario: Navigation is disabled at the ends
- GIVEN the user opened the **first** exercise of "Dia 1"
- THEN "Voltar" is disabled
- AND GIVEN the user opened the **last** exercise of "Dia 1", "Avançar" is disabled

#### Scenario: An exercise in two days follows the day it was opened from
- GIVEN "Supino" belongs to both "Dia 1" and "Dia 4"
- WHEN the user opens "Supino" from "Dia 4" and taps "Avançar"
- THEN the next exercise of **"Dia 4"** is shown (not of "Dia 1")

#### Scenario: Opened without a day
- GIVEN the user opens an exercise detail directly, with no day context
- WHEN the detail renders
- THEN no Voltar/Avançar bar is shown
- AND going back returns to Home

#### Scenario: The bar covers no content
- GIVEN an exercise detail opened from a day, at any font-size setting
- WHEN the user scrolls to the bottom of the screen
- THEN the last content is fully readable above the floating bar

### Requirement: Preview Current Weight on Home Rows

Each exercise row on Home MUST also display, as a compact read-only badge, the
**current target weight** (value + unit) for the exercise in the **active
gym**. When no weight is recorded for the exercise in the active gym, the badge
MUST invite the action (e.g., render "definir" or an equivalent hint) instead
of a numeric value or empty space. The badge is not independently editable —
tapping the row still opens the exercise detail (see Open Exercise Detail
requirement).

#### Scenario: Row shows the active-gym weight
- GIVEN gym "A" is active and "Rosca Direta" has weight 20 KG in gym "A"
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge "20 KG"

#### Scenario: Row invites action when no weight is set
- GIVEN "Rosca Direta" has no weight recorded in the active gym
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge with a hint (e.g., "definir")

#### Scenario: Badge follows the active gym
- GIVEN "Rosca Direta" is 20 KG in gym "A" and 15 LB in gym "B"
- WHEN the user switches the active gym from "A" to "B"
- THEN Home rows update to reflect gym "B" weights ("15 LB")

### Requirement: Start or Resume a Workout From a Day

Each training day on the Home accordion MUST expose a **start workout**
affordance that begins a session for that day in the **active gym** (see the
workout-sessions spec). When the active gym already has an in-progress session,
the affordance MUST instead offer to **resume** that session rather than start a
new one.

#### Scenario: Start a workout from Home
- GIVEN gym "A" is active and "Dia 1" is shown on Home with no active session
- WHEN the user taps the start-workout affordance on "Dia 1"
- THEN an in-progress session for "Dia 1" is created in gym "A"
- AND the user is taken to the active-session runner

#### Scenario: Resume instead of starting a second session
- GIVEN gym "A" already has an in-progress session for "Dia 1"
- WHEN the user views Home
- THEN the affordance invites the user to resume the active session
- AND tapping it opens the existing session rather than creating a new one

#### Scenario: Start requires an active gym
- GIVEN no gym is active
- WHEN the user taps the start-workout affordance
- THEN starting is blocked and the user is prompted to create/select a gym first

### Requirement: Feature the Next Training Day

Home MUST mark exactly one training day as the **"Próximo treino"** (next
workout), chosen from the workout history rather than always the first day. The
featured day MUST be the one **immediately after** the day of the **most recent
completed session** in the accordion's display order. The next day MUST **wrap to
the first** day when there are **no completed sessions**, when the most recent
session's day was the **last** in the list, or when that day is **no longer in
the list** (e.g. it was deleted).

A sessão mais recente MUST ser tomada entre **todas as academias**, e não apenas
a da academia ativa. Os dias de treino são **globais** — não pertencem a academia
nenhuma —, então a rotação "treinou o Dia 1, o próximo é o Dia 2" MUST NOT se
reiniciar porque o usuário passou a treinar em outro lugar.

A sessão **em andamento**, essa sim, continua sendo por academia: a marcação MAY
ser suprimida enquanto a **academia ativa** tiver uma sessão em andamento sendo
retomada (ver "Single Active Session Per Gym").

#### Scenario: No history features the first day
- GIVEN there are no completed sessions in any gym and days are "Dia 1", "Dia 2", "Dia 3"
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

#### Scenario: Advances to the day after the last session
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino"

#### Scenario: Wraps to the first day after the last day
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 3" (the last day)
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino" (the rotation restarts)

#### Scenario: Uses the most recent session, not the highest day
- GIVEN the user completed "Dia 3" and then later completed "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino" (based on the most recent session, "Dia 1")

#### Scenario: A rotação não se reinicia ao trocar de academia
- GIVEN o treino concluído mais recente foi o "Dia 2", na academia "A", e a
  academia "B" não tem nenhuma sessão
- WHEN o usuário torna "B" a academia ativa e abre a Home
- THEN "Dia 3" continua marcado como "Próximo treino"
- AND a rotação não volta para o "Dia 1"

#### Scenario: Deleted last-session day falls back to the first
- GIVEN the most recent completed session was for a day that has since been deleted
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

#### Scenario: A sessão em andamento continua sendo da academia ativa
- GIVEN há uma sessão em andamento na academia "A"
- WHEN o usuário torna "B" a academia ativa e abre a Home
- THEN nenhum dia é apresentado como retomável
- AND o "Próximo treino" segue marcado normalmente, a partir do histórico global
