# workout-sessions Specification

## Purpose
Record and review **workout sessions** — a single training visit, scoped to a
gym like weights. A session lists a training day's exercises, lets the user run
through them (mark done, and adjust each exercise's **target weight** via
the same editor as the catalog), complete the session, and review, **share**, or
delete past sessions per gym. A completed session can be shared to other apps as
an **image**, with or without weights and duration. The session stores **no
independent weight** — the weight shown and edited is always the exercise's
target weight resolved for that gym.

## Requirements

### Requirement: Start a Workout Session

The user MUST be able to **start a workout session** from a training day. The
session is created in the **active gym** and captures that day's active exercises
as **session entries**, one per exercise, each snapshotting the exercise **name**
(for durability if the source exercise is later renamed/deleted). Entries do
**NOT** store a weight — the weight shown and edited for an entry is always the
exercise's **target weight** resolved for the session's gym (see the `weights`
capability). A session starts **in-progress** and records its **start time**.
Starting a session MUST require an active gym.

#### Scenario: Start a session from a day
- GIVEN gym "A" is active and "Dia 1" contains "Rosca Direta" (target 20 KG) and "Supino" (target 40 KG)
- WHEN the user starts a workout for "Dia 1"
- THEN an in-progress session is created in gym "A" with a start time
- AND it has two entries, "Rosca Direta" and "Supino", each showing the exercise's current target (20 KG and 40 KG)

#### Scenario: Entry shows "definir" when no target weight exists
- GIVEN gym "A" is active and "Dia 1" contains "Agachamento" with no target weight in "A"
- WHEN the user starts a workout for "Dia 1"
- THEN the "Agachamento" entry shows a "definir" hint (no weight is stored on the entry)

#### Scenario: The session reflects later target changes (no snapshot)
- GIVEN an in-progress session lists "Rosca Direta" showing 20 KG
- WHEN the user changes the target weight of "Rosca Direta" to 25 KG in gym "A"
- THEN the session entry now shows 25 KG (the session holds no independent weight)

#### Scenario: Cannot start without an active gym
- GIVEN no gym exists (or none is active)
- WHEN the user attempts to start a workout
- THEN starting is blocked and the user is prompted to create/select a gym first

### Requirement: Single Active Session Per Gym

At most **one in-progress session** MAY exist for a gym at a time. While a
session is active for the gym, starting another MUST be prevented; the user
resumes the existing session instead.

#### Scenario: Prevent a second active session
- GIVEN gym "A" has an in-progress session for "Dia 1"
- WHEN the user tries to start a workout for "Dia 2" in gym "A"
- THEN a new session is NOT created
- AND the user is directed to resume or complete the active "Dia 1" session

#### Scenario: Active session is per gym
- GIVEN gym "A" has an in-progress session
- WHEN the user switches the active gym to "B"
- THEN gym "B" has no in-progress session and the user may start one in "B"

### Requirement: Run a Session

While a session is in progress, the user MUST be able to **mark each entry as
done** (and toggle it back). Each entry MUST be presented as a **Home-style row**
— a **media thumbnail**, the exercise **name** and **category**, a **done
checkbox**, and a compact **read-only weight badge** showing the exercise's
**current target weight** resolved for the session's gym (or a "definir" hint when
unset). Each row MUST end with an **icon-only navigation indicator** (a chevron,
no label), so that "tapping opens the detail" is visible rather than something
the user has to discover. Tapping the row (outside the checkbox) MUST open that
entry's **detail** (see Session Exercise Detail). Marking an entry done MUST be
possible from the list checkbox **or** from the detail, and the session's
progress MUST reflect either. **Adjusting the weight** for an entry happens on
the detail screen and updates the **exercise's target weight** in the saved scope (and its
history) — there is no separate per-session weight. Changes to the done state
persist immediately and are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, target 20 KG in the session's gym)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge (the current target)

#### Scenario: Rows show a visible navigation affordance
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user views the runner
- THEN the row ends with an icon-only chevron indicating it opens the detail
- AND the chevron carries no text label

#### Scenario: Mark an exercise done from the list
- GIVEN an in-progress session with entry "Rosca Direta" not done
- WHEN the user taps its done checkbox in the list
- THEN the entry is recorded as done
- AND the session progress count reflects it

#### Scenario: Tapping a row opens the detail
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user taps the row (not the checkbox)
- THEN the session exercise detail for "Rosca Direta" opens

#### Scenario: Un-mark a done exercise
- GIVEN entry "Supino" is marked done
- WHEN the user toggles it off (from the list or the detail)
- THEN the entry is no longer marked done

### Requirement: Complete a Session

The user MUST be able to **complete** an in-progress session, which records a
**completion time** and moves the session to a **completed** state. A completed
session is immutable except for deletion, and the gym is then free to start a
new session. Completing MUST be allowed when **at least one** entry is marked
done (even if not all are). The **"Concluir treino"** action MUST be **disabled
when no entry is marked done**, so a session cannot be completed empty; an empty
session is instead abandoned via delete.

#### Scenario: Complete a session
- GIVEN gym "A" has an in-progress session with some entries done
- WHEN the user completes the session
- THEN the session is stamped with a completion time and marked completed
- AND gym "A" has no in-progress session afterward

#### Scenario: Complete with unfinished entries
- GIVEN an in-progress session where only one of three entries is done
- WHEN the user completes it
- THEN the session is completed and retains the done/not-done state of each entry

#### Scenario: Cannot complete with nothing done
- GIVEN an in-progress session where no entry is marked done
- WHEN the user views the runner
- THEN the "Concluir treino" action is disabled
- AND becomes enabled once at least one entry is marked done

### Requirement: Session History Across Gyms

O histórico de sessões concluídas MUST ser apresentado **dentro da tela de
Consistência** (capability `consistency`), como a **lista dos treinos do mês
exibido** pelo calendário — não mais como uma lista única de todo o período.

A lista MUST mostrar as sessões concluídas do **mês exibido**, mais recentes
primeiro, cada uma resumindo o nome do dia, a data e a contagem de itens
concluídos. Ela MUST abrir **recolhida nos 3 treinos mais recentes** do mês,
com um link discreto **"Ver mais N treinos"** (N = quantos faltam) que expande
o restante no lugar; expandida, o link MUST virar **"Ver menos"**. Trocar o mês
exibido MUST recolher a lista de volta ao estado de 3.

O histórico MUST continuar abrangendo **todas as academias**, e MUST NOT ser
filtrado pela academia ativa. Como a lista mistura academias, cada item MUST
indicar **de qual academia** foi aquele treino; sessões de academia **excluída**
MUST continuar aparecendo, identificadas como de uma academia removida.
Qualquer contagem apresentada MUST se referir ao conjunto exibido (o mês),
sem sugerir recorte por academia. A tela MUST NOT oferecer o controle de troca
de academia ativa.

Tocar um item MUST continuar abrindo o **detalhe da sessão** existente, com
compartilhar e excluir inalterados. Cada card MUST terminar com um **indicador
de navegação icon-only** (chevron, sem rótulo) — o mesmo sinal das linhas do
runner e das linhas de exercício da Home.

#### Scenario: Lista recolhida com "Ver mais"
- GIVEN o mês exibido tem 13 sessões concluídas
- WHEN o usuário abre a Consistência
- THEN a lista mostra as 3 mais recentes
- AND um link "Ver mais 10 treinos" aparece abaixo dela

#### Scenario: Expandir e recolher
- GIVEN a lista está recolhida com "Ver mais 10 treinos"
- WHEN o usuário toca o link
- THEN as 13 sessões do mês aparecem e o link vira "Ver menos"
- AND WHEN o usuário navega para outro mês
- THEN a lista volta recolhida (3 mais recentes do novo mês)

#### Scenario: Mês com 3 ou menos treinos não tem "Ver mais"
- GIVEN o mês exibido tem 2 sessões concluídas
- WHEN o usuário vê a lista
- THEN as 2 aparecem e nenhum link "Ver mais" é exibido

#### Scenario: Cada item diz de onde veio
- GIVEN uma sessão feita na academia "Smart Fit" no mês exibido
- WHEN o usuário vê essa sessão na lista
- THEN o item mostra "Smart Fit" junto das demais informações do treino

#### Scenario: Sessão de academia excluída
- GIVEN o usuário concluiu um treino numa academia e depois excluiu essa academia
- WHEN o usuário vê a lista do mês daquele treino
- THEN a sessão continua listada, identificada como de uma academia removida

#### Scenario: A lista não segue a academia ativa
- GIVEN a Consistência está aberta com a academia "A" ativa
- WHEN o usuário troca a academia ativa para "B" e volta
- THEN a lista continua mostrando exatamente as mesmas sessões

#### Scenario: Abrir o detalhe a partir da lista
- GIVEN a lista do mês mostra a sessão "Dia 1 – Peito e Tríceps"
- WHEN o usuário toca o card
- THEN o detalhe da sessão abre, com compartilhar e excluir como hoje

#### Scenario: Cards mostram o indicador de navegação
- GIVEN a lista do mês mostra uma sessão
- WHEN o usuário vê o card
- THEN ele termina com um chevron icon-only indicando que abre o detalhe

#### Scenario: Empty history
- GIVEN não há sessões concluídas em nenhuma academia
- WHEN o usuário abre a Consistência
- THEN um estado vazio convida o usuário a iniciar o primeiro treino

### Requirement: View Session Detail

Opening a session from history MUST show its entries: each exercise's **name**
(from the entry snapshot) and the exercise's **current target weight** resolved for
the session's gym (live — or a "definir"/empty indicator when unset or the source
was deleted), plus its done state. The recap does **not** store or show a frozen
per-session weight.

#### Scenario: Open a completed session
- GIVEN a completed session for "Dia 1" with "Rosca Direta" (done) and "Supino" (not done), and current targets 22.5 KG and 40 KG in the session's gym
- WHEN the user opens it from history
- THEN the detail lists both entries with the current target weights (22.5 KG, 40 KG) and their done states

#### Scenario: Recap reflects the current target, not a frozen value
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target for "Rosca Direta" is later changed to 25 KG in that gym
- THEN reopening the completed session shows 25 KG (the recap reads the live target)

#### Scenario: Recap survives source deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted from the app
- THEN the session detail still shows the "Rosca Direta" name (from the snapshot) with an empty/"definir" weight

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap), showing the exercise's **media**
(static image or animated GIF, played animated), the exercise **name — once, in
the screen's top bar** — its **category** context, and — for the weight — the
**same "Peso alvo" editor used on the catalog exercise detail** (see the
`weights` capability), resolvido para a **academia da sessão**: o **peso
global** do exercício, ou a **exceção** daquela academia quando existe (edit →
save, valor + unidade KG/LB/#), junto da **linha do tempo do histórico** do
escopo resolvido (com exclusão por registro). Salvar MUST gravar no escopo
indicado pela flag **"Só nessa academia"** — peso global por padrão, exceção da
academia da sessão quando marcada — e anexar um registro de **histórico** na
mesma chave. A sessão não guarda peso próprio.

The detail MUST present its content in **tabs**, and the tabs MUST be the
**first control below the top bar** — before the media, before the weight,
before anything else the screen shows. They are how the user moves around this
screen mid-workout, so reaching them MUST NOT require scrolling. Only the
entry's **status labels** (below) MAY precede them.

Each tab MUST carry what belongs to it, and nothing else:

- **"Execução"** — the exercise's **media**, the **Peso alvo** editor with its
  **history**, and the **Alternativas** section described below, in that order.
  The media lives **here**, not above the tabs: it illustrates how the movement
  is executed, which is a question the other two tabs do not ask, and it is tall
  enough to push their content off the fold if it sat outside them.
- **"Observações"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(session.gymId, entry.exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit
  save. Categories and the note are both **descriptions of the exercise**, and
  neither is acted upon between sets.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): the pair's photos, attaching one (camera or
  gallery), and deleting one.

The media MUST NOT be rendered outside the "Execução" tab, and the categories
MUST NOT be rendered outside "Observações" — repeating either above the tabs
would give back exactly the vertical space this arrangement buys.

The entry's **status** labels — the **"Concluído"** indicator and, while
previewing an alternative, the **"Alternativa de X"** label — MUST sit **above
the tabs**, visible on every tab. They describe the **entry**, not a section of
it, exactly like the fixed stepper bar at the bottom.

A **nota** e as **fotos** continuam **duráveis e por `(academia, exercício)`**,
compartilhadas com o detalhe do catálogo e com sessões futuras do mesmo
exercício na mesma academia — diferentemente do **peso**, que é do exercício e
só é da academia quando há exceção. Enquanto uma **alternativa** está sendo
vista, as três abas MUST refletir o exercício **exibido**, não o da entrada — é
a nota e a foto daquele aparelho que ajudam a decidir. When the entry has no linked exercise
(`exerciseId` absent because the source exercise was deleted), the Observações
**and Foto** tabs MUST show an empty/disabled state (nothing can be attached to
a missing exercise).

Quando o exercício da entrada tem **alternativas**, o detalhe MUST apresentar a
seção **"Alternativas"** descrita na capability `exercises`, no corpo da aba
"Execução", abaixo do peso alvo. Tocar uma alternativa abre o detalhe dela
**dentro da sessão** — ver *Do an Alternative Instead*. Enquanto uma alternativa
está sendo vista, o detalhe MUST NOT oferecer uma nova seção "Alternativas" a
partir dela: o usuário está escolhendo o que fazer nesta linha, não navegando o
catálogo.

The detail MUST NOT repeat the exercise name in the body, and MUST NOT show the
session's **training-day** name — see the `exercises` capability's *Single
Exercise Title on Detail Views*, which governs the header of both detail views.

While the session is **in progress** the Peso alvo editor and its history delete
MUST be **editable**, incluindo a flag "Só nessa academia". When the parent
session is **completed**, the weight card MUST be **read-only** — mostra o peso
**vigente** resolvido para a academia da sessão, para referência (sem edição,
sem exclusão de histórico, sem flag).

Unlike the Peso alvo editor, the Observações and Foto tabs MUST remain
**editable even when the parent session is completed** — a note and a photo
describe the exercise in that gym, not that session, so there is nothing to
freeze.

The stepper's controls (the done call-to-action and Voltar/Avançar, described
below) MUST be presented as a **floating bar fixed to the bottom of the screen**,
**visible on every tab** — not as content inside the "Execução" panel. Mid-set the
user reaches for these first, so they must not require scrolling, and a bar that
vanished when switching to Observações or Foto would not read as fixed chrome.

The bar MUST NOT cover any content: the screen's content MUST reserve room equal
to the bar's **actual height**, at **any font-size setting** (see the
`app-foundation` typography spec — the bar scales with it, so a fixed reservation
would hide content at large scales). Transient messages MUST NOT render
underneath the bar either.

Enquanto uma **alternativa** está sendo vista, essa mesma barra MUST carregar a
única decisão que cabe ali — **"Fiz este no lugar"** — e **nenhum**
Voltar/Avançar: percorrer os exercícios pertence à lista da sessão, e esta tela
está ao lado dela.

The detail MUST act as a **guided stepper** over the session's exercises:

- The **done control** MUST **visually reflect whether the current entry is
  already done**, so stepping between exercises makes each one's status obvious:
  - **Not done** → a prominent **call-to-action** (e.g., "Concluir") that
    **marks the entry done and advances** to the next exercise's detail. On the
    **last** exercise, it either **prompts to finish the workout** (when all
    entries are now done — see below) or returns to the session overview / runner.
  - **Already done** → a **distinct completed state** (e.g., "Concluído" with a
    check and a calmer/confirmed styling), clearly different from the pending
    call-to-action; activating it still advances (and, on the last exercise, runs
    the same finish check).
  - The detail SHOULD also show a **"Concluído" indicator** (e.g., a chip above
    the tabs) when the entry is done, reinforcing the status at a glance.
- **Voltar** and **Avançar** controls MUST navigate to the **previous / next**
  exercise **without changing the done state**, and MUST be disabled at the
  first / last exercise respectively.

When the user completes the **last exercise in the list** via the done
call-to-action and, as a result, **all** of the session's entries are done, the
detail MUST **prompt** the user that all exercises are complete and ask whether to
**finish the workout**. **Confirming** MUST complete the session (see Complete a
Session) and leave for the session history. **Declining or dismissing** MUST
return to the **runner** (the session's exercise list) with the session still in
progress. If completing the last exercise leaves **any entry not done** (skipped
via Avançar), the detail MUST NOT prompt and MUST return to the runner.

Un-marking an entry is done from the runner list (not the detail). When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, no history delete, no marking, no swapping) and MUST show the static
done state;
Voltar/Avançar MAY still be used to browse. The detail MUST render from the
entry's name snapshot where the source exercise was deleted (media falls back to
a placeholder and the live target/history are empty).

#### Scenario: The exercise name is shown once
- GIVEN an in-progress session on an entry's detail
- WHEN the detail renders
- THEN the exercise name appears exactly once, in the top bar
- AND no heading below the tabs repeats it

#### Scenario: The session's training day is not shown
- GIVEN an in-progress session of "Dia 2"
- WHEN the user opens an entry's detail
- THEN "Dia 2" is not shown anywhere on the screen

#### Scenario: The stepper is fixed to the bottom on every tab
- GIVEN an entry's detail on an in-progress session
- WHEN the user switches between "Execução", "Observações" and "Foto"
- THEN the done call-to-action and Voltar/Avançar stay fixed at the bottom of the
  screen on all three tabs


#### Scenario: Concluir works from another tab
- GIVEN an in-progress session on the detail of exercise 1 of 3, with the "Foto" tab open
- WHEN the user taps "Concluir" in the bar
- THEN exercise 1 is marked done and the detail of exercise 2 is shown

#### Scenario: The bar covers no content at any font size
- GIVEN an exercise detail with content taller than the screen, at the maximum font-size setting
- WHEN the user scrolls to the bottom
- THEN the last content is fully readable above the bar

#### Scenario: A message is not hidden by the bar
- GIVEN the detail shows a confirmation message (e.g. after saving a note)
- WHEN the message appears
- THEN it renders above the floating bar, not underneath it

#### Scenario: Pending exercise shows a call-to-action
- GIVEN an in-progress session on the detail of an exercise that is **not** done
- WHEN the user views the done control
- THEN it shows a prominent "Concluir" call-to-action (not a "done" appearance)

#### Scenario: Done exercise shows a distinct completed state
- GIVEN an in-progress session on the detail of an exercise that **is** done
- WHEN the user views the detail
- THEN the done control shows a distinct "Concluído" completed state
- AND a "Concluído" indicator is shown in the header's label row

#### Scenario: Concluir marks done and advances; returning shows it done
- GIVEN the detail of exercise 1 of 3, not done
- WHEN the user taps "Concluir"
- THEN exercise 1 is recorded as done AND the detail of exercise 2 is shown
- AND WHEN the user taps "Voltar" back to exercise 1
- THEN exercise 1 now shows the distinct "Concluído" completed state

#### Scenario: Finishing the last exercise prompts to complete the workout
- GIVEN a 3-exercise session where exercises 1 and 2 are done and the user is on exercise 3 (the last), not done
- WHEN the user taps "Concluir"
- THEN exercise 3 is marked done
- AND a prompt appears stating all exercises are complete and asking whether to finish the workout

#### Scenario: Confirming the finish prompt completes the session
- GIVEN the finish prompt is shown at the end of the stepper
- WHEN the user confirms ("Concluir treino")
- THEN the session is completed (stamped and marked completed)
- AND the user is taken to the session history

#### Scenario: Declining the finish prompt returns to the runner
- GIVEN the finish prompt is shown at the end of the stepper
- WHEN the user declines or dismisses it
- THEN the session remains in progress
- AND the runner (session exercise list) is shown

#### Scenario: Last exercise with skipped entries returns to the runner without a prompt
- GIVEN a 3-exercise session where exercise 2 was skipped (not done) and the user is on exercise 3 (the last), not done
- WHEN the user taps "Concluir"
- THEN exercise 3 is marked done
- AND no finish prompt is shown
- AND the runner is shown with the session still in progress

#### Scenario: Avançar navigates without marking
- GIVEN the detail of exercise 1 of 3, not done
- WHEN the user taps "Avançar"
- THEN the detail of exercise 2 is shown
- AND exercise 1 remains not done

#### Scenario: Navigation is disabled at the ends
- GIVEN the detail of the first exercise
- THEN "Voltar" is disabled
- AND GIVEN the detail of the last exercise, "Avançar" is disabled

#### Scenario: Weight editor on the session detail edits the global weight
- GIVEN uma sessão em andamento na academia "A" e "Rosca Direta" com peso global 20 KG
- WHEN o usuário abre o detalhe da entrada, edita para 22,5 KG e salva com a flag desmarcada
- THEN o peso global passa a 22,5 KG e um registro de histórico global é anexado
- AND o detalhe do exercício no catálogo mostra 22,5 KG

#### Scenario: Weight editor on the session detail creates a gym exception
- GIVEN uma sessão em andamento na academia "A" e peso global 22,5 KG
- WHEN o usuário salva 18 KG com a flag "Só nessa academia" marcada
- THEN a academia "A" passa a ter exceção de 18 KG, com rótulo da academia
- AND o peso global permanece 22,5 KG

#### Scenario: Completed session shows the resolved weight without the flag
- GIVEN uma sessão **concluída** na academia "B", onde "Supino" tem exceção de 30 KG
- WHEN o usuário abre o detalhe daquela entrada
- THEN o cartão de peso mostra 30 KG somente-leitura, com o rótulo da academia "B"
- AND nenhuma flag de escopo é oferecida

#### Scenario: Setting a weight when none existed
- GIVEN an in-progress session in gym "A" on the detail of "Agachamento" with no weight yet
- WHEN the user sets the weight to 60 KG and saves with the flag unchecked
- THEN the global weight for "Agachamento" is created as 60 KG (with a first history entry)
- AND the runner row for "Agachamento" now shows "60 KG" instead of "definir"

#### Scenario: Add a note from the Observações tab
- GIVEN an in-progress session in gym "A" on the detail of "Rosca Direta"
- WHEN the user opens the "Observações" tab, types "manter cotovelo fixo", and saves
- THEN the per-gym note `(A, Rosca Direta)` is persisted
- AND the note is shown the next time "Rosca Direta" is opened in gym "A" (in a later session or on the catalog detail)

#### Scenario: Observações tab is empty for a deleted source exercise
- GIVEN a session entry whose source exercise was later deleted (`exerciseId` absent)
- WHEN the user opens its detail and switches to the "Observações" tab
- THEN the tab shows an empty/disabled state and no note can be saved

#### Scenario: Attach a photo from the Foto tab
- GIVEN an in-progress session in gym "A" on the detail of "Rosca Direta"
- WHEN the user opens the "Foto" tab and attaches a photo of the machine
- THEN the photo is persisted for `(A, Rosca Direta)`
- AND it is shown the next time "Rosca Direta" is opened in gym "A" (in a later session or on the catalog detail)

#### Scenario: Foto tab is empty for a deleted source exercise
- GIVEN a session entry whose source exercise was later deleted (`exerciseId` absent)
- WHEN the user opens its detail and switches to the "Foto" tab
- THEN the tab shows an empty/disabled state and no photo can be attached

#### Scenario: Photos stay editable on a completed session
- GIVEN a completed session's recap in gym "A"
- WHEN the user opens an entry's detail and switches to the "Foto" tab
- THEN a photo can still be attached or deleted (the weight editor remains read-only)

#### Scenario: A seção Alternativas fica na aba Execução
- GIVEN uma sessão em andamento na entrada de um exercício com alternativas
- WHEN o detalhe renderiza
- THEN a seção "Alternativas" aparece abaixo do card "Peso alvo"

#### Scenario: A barra troca de papel sobre a alternativa
- GIVEN o usuário está vendo uma alternativa a partir da entrada
- WHEN olha a barra inferior
- THEN ela oferece "Fiz este no lugar"
- AND não oferece Voltar/Avançar entre exercícios da sessão

#### Scenario: As abas seguem o exercício exibido
- GIVEN "Supino Máquina" tem foto na academia da sessão e "Supino Reto" não
- WHEN o usuário abre "Supino Máquina" a partir da entrada "Supino Reto" e vai à
  aba "Foto"
- THEN a foto de "Supino Máquina" é exibida

#### Scenario: Read-only for a completed session
- GIVEN a completed session's recap
- WHEN the user opens an entry's detail
- THEN the media, the current target weight, done state, and history are shown
- AND the weight cannot be edited, history entries cannot be deleted, and the done state cannot be changed
- AND Voltar/Avançar may still be used to browse the exercises

#### Scenario: Detail survives source exercise deletion
- GIVEN a session entry whose source exercise "Rosca Direta" was later deleted
- WHEN the user opens that entry's detail
- THEN the entry's snapshot name still renders in the top bar
- AND the media falls back to a placeholder and the target/history are empty

#### Scenario: The tabs come before everything else
- GIVEN the user opens an entry's detail during a session
- WHEN the detail renders
- THEN the "Execução", "Observações" and "Foto" tabs appear directly below the
  top bar, above the exercise's media and the Peso alvo editor
- AND reaching them requires no scrolling

#### Scenario: The media belongs to "Execução"
- GIVEN an entry whose exercise has a media URL
- WHEN the user opens the detail
- THEN the media is shown inside the "Execução" panel, above the Peso alvo editor
- AND switching to "Observações" or "Foto" shows no media

#### Scenario: Categories live in "Observações"
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps"
- WHEN the user opens the entry's detail
- THEN no category label is shown above the tabs
- AND switching to "Observações" shows "Peito" and "Tríceps" above the note field

#### Scenario: Status stays visible on every tab
- GIVEN an entry that is already done
- WHEN the user switches between "Execução", "Observações" and "Foto"
- THEN the "Concluído" indicator remains visible above the tabs on all three
- AND the fixed bottom bar remains visible as well

#### Scenario: Previewing an alternative keeps its label above the tabs
- GIVEN the user is previewing an alternative of the entry's exercise
- WHEN the user switches to "Foto"
- THEN the "Alternativa de X" label is still shown above the tabs
- AND the photos shown are the previewed exercise's

### Requirement: Do an Alternative Instead

Durante uma sessão **em andamento**, o usuário MUST poder registrar que fez uma
**alternativa** do exercício da linha, no lugar dele — a máquina estava ocupada,
a academia da vez não tem aquele aparelho, o ombro reclamou.

O caminho MUST ser o mesmo de consultar: na seção **"Alternativas"** do detalhe
da entrada (ver a capability `exercises`), tocar uma alternativa abre o detalhe
dela **dentro da sessão**, mostrando a **mídia**, o **peso alvo**, as
**observações** e as **fotos** daquele exercício naquela academia — é com isso
que o usuário decide. A partir daí, uma ação **"Fiz este no lugar"** MUST
substituir o exercício da linha.

A troca MUST:

- reescrever o **exercício** da entrada e o **snapshot do nome**;
- **preservar o estado de concluído** — a troca diz *qual* foi feito, não desfaz
  o que foi feito;
- **não criar nem remover entradas**: o treino continua com exatamente as linhas
  que o dia tinha, e o progresso não se mexe;
- valer apenas entre **alternativas do exercício atual** da entrada.

Enquanto o usuário está vendo a alternativa, a tela MUST deixar claro que está
**um nível abaixo** da entrada: o indicador **"Concluído"** pertence à entrada e
MUST NOT ser exibido sobre a alternativa, Voltar MUST retornar à entrada (não ao
runner), e a navegação Voltar/Avançar entre exercícios da sessão MUST NOT ser
oferecida ali.

Com a sessão **concluída**, a seção "Alternativas" MUST continuar navegável — é
referência —, mas a ação **"Fiz este no lugar" MUST NOT ser oferecida**: um
histórico registra o que aconteceu.

#### Scenario: Fazer a alternativa no lugar
- GIVEN uma sessão em andamento na entrada "Supino Reto", que tem "Supino
  Máquina" como alternativa
- WHEN o usuário abre "Supino Máquina" na seção Alternativas e toca "Fiz este no
  lugar"
- THEN a entrada passa a ser "Supino Máquina"
- AND o peso alvo, as observações e as fotos exibidos passam a ser os dela

#### Scenario: A decisão é informada pelo peso da alternativa
- GIVEN "Supino Reto" está em 60 KG e "Supino Máquina" em 45 KG na academia da
  sessão
- WHEN o usuário abre "Supino Máquina" a partir da entrada
- THEN o card "Peso alvo" mostra 45 KG antes de qualquer troca

#### Scenario: A troca preserva o concluído
- GIVEN a entrada "Supino Reto" está marcada como concluída
- WHEN o usuário troca por "Crucifixo"
- THEN a entrada continua concluída, agora registrando "Crucifixo"

#### Scenario: A troca não muda o tamanho do treino
- GIVEN uma sessão em andamento com 2 entradas
- WHEN o usuário troca o exercício de uma delas
- THEN a sessão continua com 2 entradas e o progresso não muda

#### Scenario: A alternativa não herda o concluído da entrada
- GIVEN a entrada "Supino Reto" está concluída
- WHEN o usuário abre "Supino Máquina" na seção Alternativas
- THEN o indicador "Concluído" não é exibido
- AND a tela indica que aquilo é uma alternativa de "Supino Reto"

#### Scenario: Voltar da alternativa devolve à entrada
- GIVEN o usuário está vendo "Supino Máquina" a partir da entrada "Supino Reto"
- WHEN toca Voltar
- THEN o detalhe da entrada "Supino Reto" é exibido (não o runner)

#### Scenario: Trocar é possível nos dois sentidos
- GIVEN o usuário trocou "Supino Reto" por "Supino Máquina"
- WHEN abre a seção Alternativas da entrada
- THEN "Supino Reto" está listado e pode ser escolhido de volta

#### Scenario: Sessão concluída não permite trocar
- GIVEN uma sessão concluída cuja entrada tem alternativas
- WHEN o usuário abre uma delas a partir do recap
- THEN o detalhe é exibido
- AND nenhuma ação "Fiz este no lugar" é oferecida

#### Scenario: Entrada sem alternativas
- GIVEN uma entrada cujo exercício não tem alternativas
- WHEN o usuário abre seu detalhe
- THEN nenhuma seção "Alternativas" é exibida

### Requirement: Delete a Session

The user MUST be able to **delete** a session (in-progress or completed).
Deletion removes the session and all of its entries and MUST be confirmed before
it takes effect. Deleting a session MUST NOT affect exercises, days, target
weights, or the weight change history.

#### Scenario: Delete a completed session
- GIVEN a completed session exists in gym "A"
- WHEN the user deletes it and confirms
- THEN the session and its entries are removed from history
- AND the referenced exercises, days, and target weights are unaffected

#### Scenario: Confirmation required
- GIVEN a session is queued for deletion
- WHEN the user taps delete
- THEN a confirmation is presented before removal
- AND declining leaves the session unchanged

#### Scenario: Delete the active session
- GIVEN gym "A" has an in-progress session
- WHEN the user deletes it and confirms
- THEN gym "A" has no in-progress session and may start a new one

### Requirement: Share a Completed Session as an Image

The **completed** session detail MUST offer **two share actions**, each
generating a **PNG image** of the session and handing it to the device's share
mechanism:

- **"Compartilhar"** (detailed) — includes each exercise's **weight** and the
  session's **training duration**.
- **"Compartilhar sem pesos"** (simplified) — includes **neither weights nor
  duration**, so a user can show the workout without revealing how much they
  lift or how long they took.

Both images MUST resemble the session detail screen and MUST contain: the
session's **day name**, its **gym**, the **date**, the **exercise list** (media
thumbnail, name, category, done state) taken from the entry's **name snapshot**,
and the **done count**. The detailed variant additionally shows a **weight badge**
per entry — the exercise's **current target weight** resolved for the session's
gym, read **live** (consistent with View Session Detail — the session stores no
weight of its own) — and the **duration** (`completedAt − startedAt`).

The image MUST be rendered at a **fixed size**, independent of the user's
**font-scale** setting (see the `app-foundation` typography spec) — a shared
image is a fixed design, not a responsive screen.

The image MUST emphasise **done** entries over **skipped** ones — the opposite of
the runner, which dims and strikes through what is done because crossing an item
off a checklist reads as progress *there*. On a shared image that would invert the
meaning: the work the user did would look cancelled while the exercises they
skipped would look like the highlight.

The date on the image MUST be **absolute** (e.g. "16 jul 2026"), not the
**relative** label the screen uses ("Hoje"), because a shared image outlives the
day it was created.

An entry with **no target weight** MUST render **no weight badge** in the detailed
variant — the screen's **"definir"** hint is a call-to-action for the owner and
MUST NOT appear on a shared image.

Share actions MUST NOT be offered for an **in-progress** session.

#### Scenario: Two share actions on a completed session
- GIVEN a completed session for "Dia 1" is open from history
- WHEN the user views it
- THEN a "Compartilhar" action and a "Compartilhar sem pesos" action are shown

#### Scenario: No sharing while a session is in progress
- GIVEN gym "A" has an in-progress session
- WHEN the user views the runner
- THEN no share action is shown

#### Scenario: Detailed image includes weights and duration
- GIVEN a completed session for "Dia 1" in gym "A" lasting 48 minutes, with "Rosca Direta" (done, current target 22,5 KG) and "Supino" (not done, current target 40 KG)
- WHEN the user taps "Compartilhar"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows "22,5 KG" and "40 KG"
- AND it shows the duration "48 min"

#### Scenario: Simplified image omits weights and duration
- GIVEN the same completed session
- WHEN the user taps "Compartilhar sem pesos"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows **no** weight for any exercise
- AND it shows **no** training duration

#### Scenario: The image shows the live target weight
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target is later changed to 25 KG in that gym and the user shares the session with details
- THEN the image shows 25 KG (the card reads the live target, like the recap)

#### Scenario: An entry with no target shows no badge
- GIVEN a completed session entry "Agachamento" with no target weight in the session's gym
- WHEN the user taps "Compartilhar"
- THEN the image shows the "Agachamento" row with **no** weight badge
- AND the word "definir" does **not** appear on the image

#### Scenario: Done exercises are emphasised over skipped ones
- GIVEN a completed session where "Supino" is done and "Agachamento" was skipped
- WHEN the user shares it
- THEN "Supino" is rendered at full strength (not dimmed, not struck through)
- AND "Agachamento" recedes visually

#### Scenario: The image uses an absolute date
- GIVEN a session completed on 16 July 2026
- WHEN the user shares it on that same day
- THEN the image shows an absolute date ("16 jul 2026")
- AND it does **not** show the relative label "Hoje"

#### Scenario: The image ignores the font-scale setting
- GIVEN the user set the Aparência font scale to its maximum
- WHEN the user shares a completed session
- THEN the generated image is identical to the one produced at the default scale

#### Scenario: Image survives source exercise deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted and the user shares the session
- THEN the image still shows the "Rosca Direta" name (from the entry snapshot)
- AND its thumbnail falls back to a placeholder and no weight badge is drawn

### Requirement: Deliver the Session Image

Generating a session image MUST hand it to the platform's **share sheet** when
the device supports sharing files, so the user can send it to any other app. When
file sharing is **unavailable**, the app MUST fall back to **downloading** the
PNG and confirm with a message — sharing MUST NOT simply fail.

Image generation MUST be **resilient to unreachable exercise media**: an
exercise's media URL is arbitrary and remote, and MUST NOT be able to prevent the
image from being produced. Any media that cannot be loaded (unreachable,
cross-origin-restricted, or missing) MUST fall back to the **placeholder** used
elsewhere for missing media.

**Cancelling** the share sheet MUST be treated as a non-event — no error is
reported. A genuine failure MUST report an error and leave the session unchanged.
Sharing MUST NOT modify any data: the session, its entries, the target weights,
and the weight history are untouched.

#### Scenario: Share via the platform share sheet
- GIVEN a device that supports sharing files
- WHEN the user taps a share action on a completed session
- THEN the platform share sheet opens with the PNG attached, ready to send to another app

#### Scenario: Fall back to a download
- GIVEN a device that does **not** support sharing files
- WHEN the user taps a share action
- THEN the PNG is downloaded to the device
- AND a message confirms the image was saved

#### Scenario: Unreachable media falls back to the placeholder
- GIVEN a completed session whose exercise media URL cannot be loaded (offline, missing, or cross-origin-restricted)
- WHEN the user shares the session
- THEN the image is still produced, with a placeholder in that exercise's thumbnail
- AND no error is reported

#### Scenario: Cancelling the share sheet is silent
- GIVEN the share sheet is open with the generated image
- WHEN the user dismisses it without choosing an app
- THEN no error is reported and the session detail is unchanged

#### Scenario: Sharing changes no data
- GIVEN a completed session in gym "A"
- WHEN the user shares it with details
- THEN the session, its entries, the target weights, and the weight history are unchanged
