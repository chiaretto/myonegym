# Delta: exercises

**Change ID:** `exercise-list-filters`
**Affects:** the exercises management list gains search and filter controls

---

## ADDED Requirements

### Requirement: Filter and Search the Exercises List

The exercises list (Settings → Exercícios) MUST provide a **name search field**
and **filters by category and by training day**, combinable, that narrow the
displayed exercises without changing any underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category, and "no category" (matching exercises with no category
  assigned).
- The **day filter** MUST support "all days" (no filtering), a specific
  training day (matching exercises registered in that day), and "no day"
  (matching exercises registered in no training day).
- All active filters MUST combine with AND logic.
- When the combination of filters matches **no exercise**, the list MUST show a
  distinct "no matches" message (different from the message shown when there
  are no exercises at all) with a way to clear the filters.
- The filtered list MUST update live as filters change and as the underlying
  exercises/categories/days change.

#### Scenario: Search by name narrows the list
- GIVEN exercises "Rosca Direta" and "Rosca Scott" and "Supino Reto" exist
- WHEN the user types "rosca" in the search field
- THEN only "Rosca Direta" and "Rosca Scott" are shown

#### Scenario: Search is accent-insensitive
- GIVEN an exercise named "Elevação Lateral" exists
- WHEN the user types "elevacao" (no accent) in the search field
- THEN "Elevação Lateral" is shown

#### Scenario: Filter by a specific category
- GIVEN exercises exist in categories "Bíceps" and "Costas"
- WHEN the user selects category "Bíceps" in the category filter
- THEN only exercises categorized as "Bíceps" are shown

#### Scenario: Filter by "no category"
- GIVEN "Alongamento" has no category and "Rosca Direta" is categorized as "Bíceps"
- WHEN the user selects "Sem categoria" in the category filter
- THEN only "Alongamento" is shown

#### Scenario: Filter by a specific training day
- GIVEN "Rosca Direta" is in "Dia 2" and "Supino Reto" is in "Dia 1"
- WHEN the user selects "Dia 2" in the day filter
- THEN only "Rosca Direta" is shown

#### Scenario: Filter by "no day"
- GIVEN "Alongamento" is registered in no training day
- WHEN the user selects "Nenhum dia" in the day filter
- THEN only exercises registered in no day (including "Alongamento") are shown

#### Scenario: Combined filters apply together
- GIVEN "Rosca Direta" (category "Bíceps", in "Dia 2") and "Rosca Scott" (category "Bíceps", in "Dia 1") both exist
- WHEN the user selects category "Bíceps" and day "Dia 2"
- THEN only "Rosca Direta" is shown

#### Scenario: No matches shows a distinct empty state
- GIVEN the exercises list has items
- WHEN the active filters match no exercise
- THEN a "no matches" message is shown (distinct from the "no exercises at all" message)
- AND the user can clear the filters to see the full list again

#### Scenario: Filters do not affect underlying data
- GIVEN exercises are filtered down to a subset
- WHEN the user creates, edits, or deletes an exercise
- THEN the operation behaves the same as when unfiltered
- AND the underlying exercise records are unaffected by the current filter selection

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
