# weights Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Track Target Weight Per Gym

Each exercise MUST have a **target weight scoped to a gym**. A weight record is
keyed by `(gymId, exerciseId)` and holds a numeric value and a **unit** of
measure (**KG**, **LB**, or **#**). The **unit is chosen per exercise per gym** —
the same exercise may use KG in one gym, LB in another, and a plain number (#) in
a third. The active gym determines which weight and unit are shown and edited.

#### Scenario: Set a weight for the active gym
- GIVEN gym "A" is active and exercise "Rosca Direta" exists with no weight yet
- WHEN the user opens the exercise detail and saves 20 with unit "KG"
- THEN a weight record `(A, Rosca Direta) = 20 KG` is persisted

#### Scenario: Weight is independent per gym
- GIVEN "Rosca Direta" is 20 KG in gym "A"
- WHEN the user switches to gym "B" and sets "Rosca Direta" to 15 LB
- THEN gym "A" still shows 20 KG and gym "B" shows 15 LB

#### Scenario: Same weight regardless of day
- GIVEN "Rosca Direta" is in "Dia 1" and "Dia 3" and gym "A" is active
- WHEN its weight is 20 KG
- THEN opening it from either day shows 20 KG (weight is per exercise+gym, not per day)

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

### Requirement: Weight Change History Per Gym

Every persisted change to an exercise's weight (value or unit) MUST be
appended to a local **history log** keyed by `(gymId, exerciseId)`. Each entry
holds the value, unit, and a timestamp. The exercise detail MUST display the
history as a chronological timeline (newest first) with the value, unit, delta
from the previous entry, and a relative date. History is scoped to the active
gym — switching gyms shows a different timeline for the same exercise.

#### Scenario: Saving a weight appends a history entry
- GIVEN gym "A" is active and "Rosca Direta" has no history yet
- WHEN the user saves weight 20 KG
- THEN a history entry `(A, Rosca Direta, 20, KG, <now>)` is appended
- AND the timeline shows the entry labeled as the first record (no delta)

#### Scenario: Timeline shows deltas from previous entry
- GIVEN gym "A" history for "Rosca Direta" is 20 KG then 22.5 KG then 25 KG
- WHEN the user opens the exercise detail
- THEN the timeline shows three rows with deltas "+2.5 KG", "+2.5 KG", and "1º registro"

#### Scenario: History is per-gym
- GIVEN "Rosca Direta" has 3 history entries in gym "A" and 1 entry in gym "B"
- WHEN the user switches the active gym to "B"
- THEN the exercise detail timeline shows only gym "B"'s history (1 entry)

#### Scenario: Unit change is recorded as an entry
- GIVEN gym "A" history for "Rosca Direta" is 20 KG (current)
- WHEN the user saves 45 with unit LB
- THEN a new history entry `(A, Rosca Direta, 45, LB, <now>)` is appended
- AND the timeline row is labeled as a unit change (no numeric delta shown for that row)

### Requirement: Delete a History Entry

Each row of the weight history timeline MUST expose a **delete** action.
Deleting a non-current entry removes only that entry. Deleting the current
(newest) entry MUST revert the active weight for `(gymId, exerciseId)` to the
previous entry; if no previous entry exists, the exercise has no active weight
in that gym. Deletion MUST be confirmed by the user before it takes effect.

#### Scenario: Delete a past entry
- GIVEN gym "A" history for "Rosca Direta" is [20 KG (t1), 22.5 KG (t2), 25 KG (t3)]
- WHEN the user deletes the t2 entry and confirms
- THEN the history becomes [20 KG (t1), 25 KG (t3)]
- AND the active weight remains 25 KG

#### Scenario: Delete the current entry reverts to the previous
- GIVEN gym "A" history for "Rosca Direta" is [20 KG (t1), 25 KG (t2 — current)]
- WHEN the user deletes the t2 entry and confirms
- THEN the history becomes [20 KG (t1)]
- AND the active weight for "Rosca Direta" in gym "A" reverts to 20 KG

#### Scenario: Delete the only entry clears the weight
- GIVEN gym "A" has a single history entry for "Rosca Direta" (20 KG)
- WHEN the user deletes it and confirms
- THEN no history remains for that (gym, exercise)
- AND the exercise has no active weight in gym "A" (empty state)

#### Scenario: Confirmation required
- GIVEN a history entry is queued for deletion
- WHEN the user taps the delete affordance
- THEN a confirmation is presented before the entry is removed
- AND declining the confirmation leaves the history unchanged

