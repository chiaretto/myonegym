# Delta: workout-sessions

**Change ID:** `floating-stepper-nav`
**Affects:** the session exercise detail's stepper becomes a floating bottom bar,
visible on every tab — position only; its behaviour is unchanged

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

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
the guided stepper and the Peso alvo editor described here, an **"Observações"**
tab that shows and edits the **per-gym exercise note** for `(session.gymId,
entry.exerciseId)` (see the `exercise-notes` capability), and a **"Foto"** tab
that shows and manages the **per-gym exercise photos** for the same pair (see the
`exercise-photos` capability). The note tab provides an editable text field with
an explicit save; the photo tab lists the pair's photos and lets the user attach
one (camera or gallery) or delete one. Both the note and the photos are **durable
and per `(gym, exercise)`**, so they are shared with the catalog exercise detail
and with future sessions of the same exercise in the same gym. When the entry has
no linked exercise (`exerciseId` absent because the source exercise was deleted),
the Observações **and Foto** tabs MUST show an empty/disabled state (nothing can
be attached to a missing exercise).

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
  - The detail SHOULD also show a **"Concluído" indicator** (e.g., a chip near
    the title) when the entry is done, reinforcing the status at a glance.
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
editing, no history delete, no marking) and MUST show the static done state;
Voltar/Avançar MAY still be used to browse. The detail MUST render from the
entry's name snapshot where the source exercise was deleted (media falls back to
a placeholder and the live target/history are empty).

#### Scenario: The stepper is fixed to the bottom on every tab
- GIVEN an in-progress session on an exercise's detail
- WHEN the user switches between the "Execução", "Observações" and "Foto" tabs
- THEN the Concluir / Voltar / Avançar bar stays fixed at the bottom of the screen on all three

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
- AND a "Concluído" indicator is shown near the title

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

---

## REMOVED Requirements

(None)
