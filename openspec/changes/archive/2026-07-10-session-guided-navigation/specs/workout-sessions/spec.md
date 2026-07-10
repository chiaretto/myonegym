# Delta: workout-sessions

**Change ID:** `session-guided-navigation`
**Affects:** the exercise detail becomes a guided stepper; completion requires ≥1 done
**Implements:** issue #3

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

- A primary **"Concluído"** button MUST **mark the current entry done** and then
  **advance to the next exercise's detail**; on the **last** exercise it MUST
  return to the session overview (runner).
- **Voltar** and **Avançar** controls MUST navigate to the **previous / next**
  exercise **without changing the done state**, and MUST be disabled at the
  first / last exercise respectively.

Un-marking an entry is done from the runner list (not the detail). When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, no marking); Voltar/Avançar MAY still be used to browse. The detail MUST
render from the entry's snapshot where live data is missing, so it still works if
the source exercise was deleted.

#### Scenario: Concluído marks done and advances to the next exercise
- GIVEN an in-progress session on the detail of exercise 1 of 3, not done
- WHEN the user taps "Concluído"
- THEN exercise 1 is recorded as done
- AND the detail of exercise 2 is shown

#### Scenario: Concluído on the last exercise returns to the runner
- GIVEN the user is on the detail of the last exercise
- WHEN the user taps "Concluído"
- THEN the last exercise is marked done
- AND the session overview (runner) is shown

#### Scenario: Avançar navigates without marking
- GIVEN the detail of exercise 1 of 3, not done
- WHEN the user taps "Avançar"
- THEN the detail of exercise 2 is shown
- AND exercise 1 remains not done

#### Scenario: Voltar navigates to the previous exercise
- GIVEN the detail of exercise 2 of 3
- WHEN the user taps "Voltar"
- THEN the detail of exercise 1 is shown

#### Scenario: Navigation is disabled at the ends
- GIVEN the detail of the first exercise
- THEN "Voltar" is disabled
- AND GIVEN the detail of the last exercise, "Avançar" is disabled

#### Scenario: Edit the used weight from the detail
- GIVEN the entry detail shows used 20 KG
- WHEN the user edits the used weight to 22.5 KG and saves
- THEN the entry stores used 22.5 KG for this session only
- AND the exercise's target weight for the gym is unchanged

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

---

## ADDED Requirements

(None)

---

## REMOVED Requirements

(None — the previous "Mark done from the detail" scenario is superseded by the
"Concluído marks done and advances" behaviour above.)
