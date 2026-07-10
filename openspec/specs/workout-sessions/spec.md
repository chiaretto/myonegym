# workout-sessions Specification

## Purpose
Record and review **workout sessions** — a single training visit, scoped to a
gym like weights. A session snapshots a training day's exercises with their
current target weights, lets the user run through them (mark done, set the weight
actually used), complete the session, and review or delete past sessions per gym.

## Requirements
### Requirement: Start a Workout Session

The user MUST be able to **start a workout session** from a training day. The
session is created in the **active gym** and captures a snapshot of that day's
active exercises as **session entries**, one per exercise, each pre-filled with
the exercise's **current target weight and unit** for the active gym (or empty
when no target is set). A session starts in an **in-progress** state and records
its **start time**. Starting a session MUST require an active gym.

#### Scenario: Start a session from a day
- GIVEN gym "A" is active and "Dia 1" contains "Rosca Direta" (20 KG) and "Supino" (40 KG)
- WHEN the user starts a workout for "Dia 1"
- THEN an in-progress session is created in gym "A" with a start time
- AND it has two entries: "Rosca Direta" (used 20 KG) and "Supino" (used 40 KG)

#### Scenario: Entry starts empty when no target weight exists
- GIVEN gym "A" is active and "Dia 1" contains "Agachamento" with no weight recorded in "A"
- WHEN the user starts a workout for "Dia 1"
- THEN the "Agachamento" entry is created with no used weight (empty, to be filled during the session)

#### Scenario: Snapshot is independent of later target changes
- GIVEN a session was started with "Rosca Direta" used 20 KG
- WHEN the user later changes the target weight of "Rosca Direta" to 25 KG in gym "A"
- THEN the session entry still shows 20 KG (the snapshot is not rewritten)

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
checkbox**, and a compact **read-only used-weight badge** (or a "definir" hint
when unset). Tapping the row (outside the checkbox) MUST open that entry's
**detail** (see Session Exercise Detail). Marking an entry done MUST be possible
from the list checkbox **or** from the detail, and the session's progress MUST
reflect either. **Setting the weight actually used** for an entry (value + unit)
happens on the detail screen and updates only that session entry; the exercise's
target weight for the gym is never changed. Changes to entries persist
immediately and are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, used 20 KG)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge

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
new session. Completing MUST be allowed even if not every entry is marked done.

#### Scenario: Complete a session
- GIVEN gym "A" has an in-progress session with some entries done
- WHEN the user completes the session
- THEN the session is stamped with a completion time and marked completed
- AND gym "A" has no in-progress session afterward

#### Scenario: Complete with unfinished entries
- GIVEN an in-progress session where only one of three entries is done
- WHEN the user completes it
- THEN the session is completed and retains the done/not-done state of each entry

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

Opening a session from history MUST show its entries: each exercise's name and
the **used weight/unit** captured for that session, plus its done state. The
detail MUST render from the session's own snapshot, independent of the current
state of the source day/exercise/target.

#### Scenario: Open a completed session
- GIVEN a completed session for "Dia 1" with "Rosca Direta" (22.5 KG, done) and "Supino" (40 KG, not done)
- WHEN the user opens it from history
- THEN the detail lists both entries with their used weights and done states

#### Scenario: Detail survives source deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted from the app
- THEN the session detail still shows "Rosca Direta" with its captured weight (from the snapshot)

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap). The detail MUST render the exercise's
**media** (static image or animated GIF, played animated), the exercise name and
its category/day context, the entry's **used weight** for this session, and the
exercise's per-gym **weight-history timeline** (scoped to the **session's gym**,
read-only) with the same presentation as the exercise detail elsewhere in the
app. While the session is in progress, the detail MUST let the user **edit and
save the used weight** (value + unit KG/LB/#) — affecting **only this entry**,
never the target weight — and **mark the entry done or not done**. When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, done toggle disabled). The detail MUST render from the entry's snapshot
where live data is missing, so it still works if the source exercise was deleted.

#### Scenario: Open the detail and see media + weight + history
- GIVEN an in-progress session in gym "A" listing "Rosca Direta" with a media URL and per-gym weight history
- WHEN the user opens the "Rosca Direta" entry detail
- THEN the exercise media is rendered
- AND the entry's used weight is shown
- AND the per-gym weight-history timeline for gym "A" is shown

#### Scenario: Mark done from the detail
- GIVEN the "Rosca Direta" entry detail is open and the entry is not done
- WHEN the user taps "Marcar como concluído"
- THEN the entry is recorded as done
- AND returning to the runner shows it done with the updated progress count

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

#### Scenario: Detail survives source exercise deletion
- GIVEN a session entry whose source exercise "Rosca Direta" was later deleted
- WHEN the user opens that entry's detail
- THEN the entry's snapshot name and used weight still render
- AND the media falls back to a placeholder and the live history is empty

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
