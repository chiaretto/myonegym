# Delta: workout-sessions

**Change ID:** `add-workout-session-log`
**Affects:** new `workout-sessions` capability; references gyms, training-days, exercises, weights

---

## ADDED Requirements

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
done** (and toggle it back) and **set the weight actually used** for an entry
(value + unit), defaulted from the snapshot. Changes to entries persist
immediately and are local.

#### Scenario: Mark an exercise done
- GIVEN an in-progress session with entry "Rosca Direta" not done
- WHEN the user marks "Rosca Direta" as done
- THEN the entry is recorded as done
- AND the session shows a progress count reflecting it

#### Scenario: Adjust the used weight during the session
- GIVEN entry "Rosca Direta" shows used 20 KG (from the snapshot)
- WHEN the user changes the used weight to 22.5 KG
- THEN the entry stores used 22.5 KG for this session only
- AND the exercise's target weight for the gym is unchanged

#### Scenario: Un-mark a done exercise
- GIVEN entry "Supino" is marked done
- WHEN the user toggles it off
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
