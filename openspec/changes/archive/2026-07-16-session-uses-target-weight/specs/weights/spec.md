# Delta: weights

**Change ID:** `session-uses-target-weight`
**Affects:** `weights` (where the target weight can be edited); references `workout-sessions`.

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Edit and Save Weight

The target weight MUST support an explicit **edit → save** interaction so a value
is only persisted on save. The **same editor** MUST be available in two places for
the active/session gym: the **catalog exercise detail** and the **in-session
exercise detail** (Execução tab) while the session is **in progress**. Both edit
the **same** per-gym target keyed by `(gymId, exerciseId)` and, on save, append a
weight-history entry — there is no separate per-session weight. On a **completed**
session the editor is shown **read-only** (current target for reference).

#### Scenario: Edit then save
- GIVEN "Rosca Direta" shows 20 KG in the active gym
- WHEN the user taps edit, changes the value to 22.5, and taps save
- THEN the weight persists as 22.5 KG for the active gym

#### Scenario: Change the unit
- GIVEN "Rosca Direta" is 20 KG in the active gym
- WHEN the user edits the unit to "LB" and saves
- THEN the record stores unit "LB" for the active gym

#### Scenario: Edit from the in-session detail updates the same target
- GIVEN an in-progress session in gym "A" and "Rosca Direta" at 20 KG in "A"
- WHEN the user edits the weight to 25 KG on the session exercise detail and saves
- THEN the target `(A, Rosca Direta)` becomes 25 KG and a history entry is appended
- AND the catalog exercise detail shows 25 KG (it is the same per-gym target)

#### Scenario: No active gym
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail
- THEN the weight field prompts the user to create/select a gym first
- AND no weight can be saved until a gym is active

---

## REMOVED Requirements

(None)
