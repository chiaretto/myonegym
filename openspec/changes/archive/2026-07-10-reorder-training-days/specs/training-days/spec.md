# Delta: training-days

**Change ID:** `reorder-training-days`
**Affects:** the day list gains user-controlled ordering (like exercises within a day)

---

## ADDED Requirements

### Requirement: Reorder Training Days

The user MUST be able to **reorder the training days** (in the days settings),
the same way exercises can be reordered within a day. The chosen order MUST
**persist** across sessions and MUST be the order in which days are listed
everywhere they appear (the days settings list and the **Home accordion**). Until
a user reorders them, days keep their **insertion order**; a newly created day is
appended to the end.

#### Scenario: Move a day up
- GIVEN the days are ordered "Dia 1", "Dia 2", "Dia 3"
- WHEN the user moves "Dia 2" up
- THEN the order becomes "Dia 2", "Dia 1", "Dia 3"
- AND the same order is shown on the Home accordion

#### Scenario: Order persists
- GIVEN the user reordered the days
- WHEN the user reloads the app
- THEN the days are shown in the reordered order (not insertion order)

#### Scenario: Ends are bounded
- GIVEN the first day in the list
- THEN its "move up" control is disabled
- AND the last day's "move down" control is disabled

#### Scenario: New day appends
- GIVEN the user reordered the existing days
- WHEN the user creates a new day
- THEN the new day appears at the end of the list

#### Scenario: Reorder does not affect exercises or categories
- GIVEN days with exercises and derived categories
- WHEN the user reorders the days
- THEN each day's exercises, weights, and derived categories are unchanged

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
