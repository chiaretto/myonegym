# Delta: Home Navigation

**Change ID:** `add-consistency-screen`
**Affects:** a apresentação das linhas de exercício dentro do acordeão (indicador
de navegação icon-only). Nada mais na Home muda.

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Home Accordion of Training Days

The Home screen MUST present training days as an **accordion**. Each day's header
MUST show the day **name** and, as a secondary line, the day's **derived
categories** — the distinct categories of the exercises in that day (see the
training-days spec) — falling back to the **exercise count** when the day has no
categorized exercises. Expanding a day lists that day's active exercises, each
showing its **name** and **media thumbnail** (a static image or an animated GIF).
Each exercise row MUST end with an **icon-only navigation indicator** (a chevron,
no label), so that "tapping opens the exercise detail" is visible — the same cue
the workout-session entry rows carry.

The **expanded day MUST be part of the address**, not transient screen state, so
it survives leaving Home and coming back (see Open Exercise Detail). Opening Home
with a day addressed MUST expand that day; collapsing MUST clear it. Addressing a
day that no longer exists MUST expand nothing rather than fail. Expanding or
collapsing MUST NOT add browser history entries — otherwise Back would step
through the accordion instead of leaving Home.

O gesto de expandir e recolher MUST ser o **toque no cabeçalho do card**, e não
apenas no nome do dia — ver "Training Day Card".

O **estado vazio** MUST ser exibido apenas quando a leitura dos dias respondeu e
não há nenhum dia. Enquanto a resposta não chega — inclusive a cada volta para a
Home, que a remonta —, a Home MUST NOT exibir "Nenhum dia de treino ainda". Ver
"Estados Vazios Só Depois da Resposta" na spec app-foundation.

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

#### Scenario: Exercise rows show a visible navigation affordance
- GIVEN "Dia 1" is expanded, listing "Rosca Direta"
- WHEN the user views the row
- THEN it ends with an icon-only chevron indicating it opens the exercise detail
- AND the chevron carries no text label

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
- WHEN the user opens Home and the read resolves
- THEN an empty state guides the user to create data in Settings

#### Scenario: O estado vazio não pisca ao voltar para a Home
- GIVEN existem dias de treino cadastrados
- WHEN o usuário abre um exercício, as Configurações ou as Sessões e volta para a Home
- THEN a Home mostra os dias
- AND "Nenhum dia de treino ainda" não é exibido em nenhum quadro da transição

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
