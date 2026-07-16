# workout-sessions Specification

## Purpose
Record and review **workout sessions** — a single training visit, scoped to a
gym like weights. A session lists a training day's exercises, lets the user run
through them (mark done, and adjust each exercise's **per-gym target weight** via
the same editor as the catalog), complete the session, and review or delete past
sessions per gym. The session stores **no independent weight** — the weight shown
and edited is always the exercise's per-gym target.

## Requirements
### Requirement: Start a Workout Session

The user MUST be able to **start a workout session** from a training day. The
session is created in the **active gym** and captures that day's active exercises
as **session entries**, one per exercise, each snapshotting the exercise **name**
(for durability if the source exercise is later renamed/deleted). Entries do
**NOT** store a weight — the weight shown and edited for an entry is always the
exercise's **per-gym target weight** for the session's gym (see the `weights`
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
**current per-gym target weight** for the session's gym (or a "definir" hint when
unset). Tapping the row (outside the checkbox) MUST open that entry's **detail**
(see Session Exercise Detail). Marking an entry done MUST be possible from the
list checkbox **or** from the detail, and the session's progress MUST reflect
either. **Adjusting the weight** for an entry happens on the detail screen and
updates the **exercise's per-gym target weight** (and its history) — there is no
separate per-session weight. Changes to the done state persist immediately and
are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, target 20 KG in the session's gym)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge (the current target)

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

### Requirement: Session History Per Gym

The app MUST provide a **history view** listing the **completed sessions of the
active gym**, ordered newest first, each summarizing the day name, the date, and
the count of entries done. History is scoped to the active gym — switching gyms
shows a different list.

#### Scenario: List completed sessions
- GIVEN gym "A" has three completed sessions
- WHEN the user opens the session history
- THEN the three sessions are listed newest first with day name, date, and done count

#### Scenario: History follows the active gym
- GIVEN gym "A" has 3 completed sessions and gym "B" has 1
- WHEN the user switches the active gym from "A" to "B"
- THEN the history shows only gym "B"'s single session

#### Scenario: Empty history
- GIVEN the active gym has no completed sessions
- WHEN the user opens the session history
- THEN an empty state invites the user to start their first workout

### Requirement: View Session Detail

Opening a session from history MUST show its entries: each exercise's **name**
(from the entry snapshot) and the exercise's **current per-gym target weight** for
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
the runner or the completed-session recap). The detail MUST render the exercise's
**media** (static image or animated GIF, played animated), the exercise name and
its category/day context, and — for the weight — the **same "Peso alvo" editor
used on the catalog exercise detail** (see the `weights` capability), scoped to
the **session's gym**: the per-gym **target weight** (edit → save, value + unit
KG/LB/#) together with the per-gym **weight-history timeline** (with per-entry
delete). Saving the weight MUST update the exercise's **per-gym target weight**
and append a **history** entry — the session stores no independent weight.

While the session is **in progress** the Peso alvo editor and its history delete
MUST be **editable**. When the parent session is **completed**, the weight card
MUST be **read-only** — it shows the gym's **current** target for reference (no
edit, no history delete).

The detail MUST present its content in **tabs**: an **"Execução"** tab containing
the guided stepper and the Peso alvo editor described here, and an
**"Observações"** tab that shows and edits the **per-gym exercise note** for
`(session.gymId, entry.exerciseId)` (see the `exercise-notes` capability). The
note tab provides an editable text field with an explicit save; the note is
**durable and per `(gym, exercise)`**, so it is shared with the catalog exercise
detail and with future sessions of the same exercise in the same gym. When the
entry has no linked exercise (`exerciseId` absent because the source exercise was
deleted), the Observações tab MUST show an empty/disabled state (no note can be
attached to a missing exercise).

The detail MUST act as a **guided stepper** over the session's exercises:

- The **done control** MUST **visually reflect whether the current entry is
  already done**, so stepping between exercises makes each one's status obvious:
  - **Not done** → a prominent **call-to-action** (e.g., "Concluir") that
    **marks the entry done and advances** to the next exercise's detail (on the
    **last** exercise it returns to the session overview / runner).
  - **Already done** → a **distinct completed state** (e.g., "Concluído" with a
    check and a calmer/confirmed styling), clearly different from the pending
    call-to-action; activating it still advances.
  - The detail SHOULD also show a **"Concluído" indicator** (e.g., a chip near
    the title) when the entry is done, reinforcing the status at a glance.
- **Voltar** and **Avançar** controls MUST navigate to the **previous / next**
  exercise **without changing the done state**, and MUST be disabled at the
  first / last exercise respectively.

Un-marking an entry is done from the runner list (not the detail). When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, no history delete, no marking) and MUST show the static done state;
Voltar/Avançar MAY still be used to browse. The detail MUST render from the
entry's name snapshot where the source exercise was deleted (media falls back to
a placeholder and the live target/history are empty).

#### Scenario: Pending exercise shows a call-to-action
- GIVEN an in-progress session on the detail of an exercise that is **not** done
- WHEN the user views the done control
- THEN it shows a prominent "Concluir" call-to-action (not a "done" appearance)

#### Scenario: Done exercise shows a distinct completed state
- GIVEN an in-progress session on the detail of an exercise that **is** done
- WHEN the user views the detail
- THEN the done control shows a distinct "Concluído" completed state
- AND a "Concluído" indicator is shown near the title

#### Scenario: Concluir marks done and advances; returning shows it done
- GIVEN the detail of exercise 1 of 3, not done
- WHEN the user taps "Concluir"
- THEN exercise 1 is recorded as done AND the detail of exercise 2 is shown
- AND WHEN the user taps "Voltar" back to exercise 1
- THEN exercise 1 now shows the distinct "Concluído" completed state

#### Scenario: Concluir on the last exercise returns to the runner
- GIVEN the user is on the detail of the last exercise, not done
- WHEN the user taps "Concluir"
- THEN the last exercise is marked done
- AND the session overview (runner) is shown

#### Scenario: Avançar navigates without marking
- GIVEN the detail of exercise 1 of 3, not done
- WHEN the user taps "Avançar"
- THEN the detail of exercise 2 is shown
- AND exercise 1 remains not done

#### Scenario: Navigation is disabled at the ends
- GIVEN the detail of the first exercise
- THEN "Voltar" is disabled
- AND GIVEN the detail of the last exercise, "Avançar" is disabled

#### Scenario: Edit the weight from the session detail updates the target
- GIVEN an in-progress session in gym "A" on the detail of "Rosca Direta" (target 20 KG)
- WHEN the user edits the weight to 22.5 KG and saves
- THEN the exercise's **target weight** for gym "A" becomes 22.5 KG
- AND a weight-history entry is appended for `(A, Rosca Direta)`
- AND the catalog exercise detail for "Rosca Direta" in gym "A" shows 22.5 KG

#### Scenario: Setting a weight when none existed
- GIVEN an in-progress session in gym "A" on the detail of "Agachamento" with no target in "A"
- WHEN the user sets the weight to 60 KG and saves
- THEN the target `(A, Agachamento) = 60 KG` is created (with a first history entry)
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

#### Scenario: Read-only for a completed session
- GIVEN a completed session's recap
- WHEN the user opens an entry's detail
- THEN the media, the current target weight, done state, and history are shown
- AND the weight cannot be edited, history entries cannot be deleted, and the done state cannot be changed
- AND Voltar/Avançar may still be used to browse the exercises

#### Scenario: Detail survives source exercise deletion
- GIVEN a session entry whose source exercise "Rosca Direta" was later deleted
- WHEN the user opens that entry's detail
- THEN the entry's snapshot name still renders
- AND the media falls back to a placeholder and the target/history are empty

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
