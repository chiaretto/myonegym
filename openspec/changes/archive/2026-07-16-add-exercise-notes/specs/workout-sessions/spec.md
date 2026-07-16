# Delta: workout-sessions

**Change ID:** `add-exercise-notes`
**Affects:** `workout-sessions` (the in-session exercise detail); references `exercise-notes`.

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap). The detail MUST render the exercise's
**media** (static image or animated GIF, played animated), the exercise name and
its category/day context, the entry's **used weight** for this session, and the
exercise's per-gym **weight-history timeline** (scoped to the **session's gym**,
read-only). While the session is in progress, the detail MUST let the user
**edit and save the used weight** (value + unit KG/LB/#) — affecting **only this
entry**, never the target weight.

The detail MUST present its content in **tabs**: an **"Execução"** tab containing
the guided stepper, used-weight editor, and history timeline described here, and
an **"Observações"** tab that shows and edits the **per-gym exercise note** for
`(session.gymId, entry.exerciseId)` (see the `exercise-notes` capability). The
note tab provides an editable text field with an explicit save; the note is
**durable and per `(gym, exercise)`**, so it is shared with the catalog exercise
detail and with future sessions of the same exercise in the same gym — it is
**not** a per-session field like the used weight. When the entry has no linked
exercise (`exerciseId` absent because the source exercise was deleted), the
Observações tab MUST show an empty/disabled state (no note can be attached to a
missing exercise).

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
editing, no marking) and MUST show the static done state; Voltar/Avançar MAY
still be used to browse. The detail MUST render from the entry's snapshot where
live data is missing, so it still works if the source exercise was deleted.

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

#### Scenario: Edit the used weight from the detail
- GIVEN the "Rosca Direta" entry detail shows used 20 KG
- WHEN the user edits the used weight to 22.5 KG and saves
- THEN the entry stores used 22.5 KG for this session only
- AND the exercise's target weight for gym "A" is unchanged

#### Scenario: History is the exercise's target history, read-only
- GIVEN "Rosca Direta" has target-weight history 20 KG → 22.5 KG in gym "A"
- WHEN the user opens the entry detail during a session in gym "A"
- THEN the timeline shows that history as read-only reference (no delete affordance)

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
- THEN the media, used weight, done state, and history are shown
- AND the used weight cannot be edited and the done state cannot be changed
- AND Voltar/Avançar may still be used to browse the exercises

#### Scenario: Detail survives source exercise deletion
- GIVEN a session entry whose source exercise "Rosca Direta" was later deleted
- WHEN the user opens that entry's detail
- THEN the entry's snapshot name and used weight still render
- AND the media falls back to a placeholder and the live history is empty

---

## REMOVED Requirements

(None)
