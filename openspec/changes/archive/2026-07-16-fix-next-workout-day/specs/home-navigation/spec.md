# Delta: home-navigation

**Change ID:** `fix-next-workout-day`
**Affects:** `home-navigation` (the "Próximo treino" marking); references workout-sessions, training-days.

---

## ADDED Requirements

### Requirement: Feature the Next Training Day

Home MUST mark exactly one training day as the **"Próximo treino"** (next
workout), chosen from the **active gym's** workout history rather than always the
first day. The featured day MUST be the one **immediately after** the day of the
**most recent completed session** (for the active gym) in the accordion's display
order. The next day MUST **wrap to the first** day when there are **no completed
sessions**, when the most recent session's day was the **last** in the list, or
when that day is **no longer in the list** (e.g. it was deleted). The marking MAY
be suppressed while the active gym has an **in-progress** session being resumed.

#### Scenario: No history features the first day
- GIVEN the active gym has no completed sessions and days are "Dia 1", "Dia 2", "Dia 3"
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

#### Scenario: Advances to the day after the last session
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino"

#### Scenario: Wraps to the first day after the last day
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 3" (the last day)
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino" (the rotation restarts)

#### Scenario: Uses the most recent session, not the highest day
- GIVEN the user completed "Dia 3" and then later completed "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino" (based on the most recent session, "Dia 1")

#### Scenario: Follows the active gym
- GIVEN gym "A"'s most recent session was "Dia 2" and gym "B" has no sessions
- WHEN the user switches the active gym from "A" to "B"
- THEN the featured day recomputes from "B"'s history and marks "Dia 1"

#### Scenario: Deleted last-session day falls back to the first
- GIVEN the most recent completed session was for a day that has since been deleted
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
