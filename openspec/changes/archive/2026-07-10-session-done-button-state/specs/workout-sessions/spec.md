# Delta: workout-sessions

**Change ID:** `session-done-button-state`
**Affects:** the exercise detail's done control shows the current entry's done state
**Builds on:** `session-guided-navigation`

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

## ADDED Requirements

(None)

---

## REMOVED Requirements

(None — the "Concluído marks done and advances" scenario is superseded by the
"Concluir marks done and advances; returning shows it done" scenario above.)
