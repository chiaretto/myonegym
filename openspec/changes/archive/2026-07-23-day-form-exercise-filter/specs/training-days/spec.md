# Delta: Training Days

**Change ID:** `day-form-exercise-filter`
**Affects:** the training day form (Configurações → Dias de treino → novo/editar dia)

---

## ADDED Requirements

### Requirement: Filter the Day Form's Exercise Picker

The training day form (new and edit) MUST provide a **name search field** and a
**category filter** over the **"Adicionar exercício"** list — the exercises not
yet in the day — that narrow which candidates are displayed without changing any
underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category (matching exercises that **include** that category among
  their categories), and "no category" (matching exercises with **no**
  categories).
- Both filters MUST combine with AND logic and update the list live as the user
  types/selects and as the underlying exercises and categories change.
- The filters MUST apply **only** to the "Adicionar exercício" list. The
  **"Exercícios do dia"** (selected) list MUST always show every exercise
  currently in the day, in order, regardless of the active filters.
- The filters MUST NOT affect selection, ordering, or persistence: adding,
  removing, and reordering exercises behave exactly as when unfiltered, and an
  added exercise leaves the candidate list regardless of the filters.
- When the filters match none of the not-yet-added exercises, the form MUST show
  a distinct "no matches" message with a way to clear the filters — distinct
  from the case where **all** exercises are already in the day (where the
  "Adicionar exercício" section is not shown at all).
- Filter selections are **view-only local state**: they MUST NOT be persisted
  across navigation or app restarts.

#### Scenario: Search by name narrows the candidates
- GIVEN the day form is open and "Rosca Direta", "Rosca Scott" and "Supino Reto" are not in the day
- WHEN the user types "rosca" in the search field
- THEN only "Rosca Direta" and "Rosca Scott" are offered under "Adicionar exercício"

#### Scenario: Search is accent-insensitive
- GIVEN "Elevação Lateral" is not in the day
- WHEN the user types "elevacao" (no accent) in the search field
- THEN "Elevação Lateral" is offered

#### Scenario: Filter by a specific category (including compound exercises)
- GIVEN "Rosca Direta" is categorized "Bíceps" and "Remada" is categorized "Costas" and "Bíceps"
- WHEN the user selects category "Bíceps" in the day form's category filter
- THEN both "Rosca Direta" and "Remada" are offered

#### Scenario: Filter by "no category"
- GIVEN "Alongamento" has no category and "Rosca Direta" is categorized "Bíceps"
- WHEN the user selects "Sem categoria"
- THEN only "Alongamento" is offered

#### Scenario: Filters combine
- GIVEN "Rosca Direta" ("Bíceps") and "Rosca Scott" ("Bíceps") and "Remada" ("Costas") are not in the day
- WHEN the user types "rosca" and selects category "Bíceps"
- THEN only "Rosca Direta" and "Rosca Scott" are offered

#### Scenario: The day's own exercise list is never filtered
- GIVEN the day already contains "Supino Reto" and "Rosca Direta"
- WHEN the user types "rosca" in the search field
- THEN the "Exercícios do dia" list still shows both, in the same order
- AND only the "Adicionar exercício" list is narrowed

#### Scenario: Adding while filtered still works
- GIVEN the candidate list is narrowed to "Rosca Direta"
- WHEN the user adds "Rosca Direta" to the day
- THEN it moves to the "Exercícios do dia" list at the end
- AND it no longer appears among the candidates
- AND the active filters remain applied

#### Scenario: No matches shows a distinct empty state
- GIVEN there is at least one exercise not yet in the day
- WHEN the active filters match none of them
- THEN a "no matches" message is shown in place of the candidate list
- AND the user can clear the filters to see all candidates again

#### Scenario: Filters do not affect saved data
- GIVEN the candidate list is filtered
- WHEN the user saves the day
- THEN the day is saved with exactly the exercises in the "Exercícios do dia" list, in that order
- AND the filter selection is not persisted

---

## MODIFIED Requirements

### Requirement: Select Exercises for a Day

The user MUST be able to choose which exercises belong to a day. Exercises MAY
repeat across days, and their order within a day SHOULD be preserved. The picker
that lists the not-yet-added exercises MUST be filterable by name and category
(see "Filter the Day Form's Exercise Picker"); filtering is a view concern only
and MUST NOT change which exercises can be added or the order in which added
exercises are kept.

#### Scenario: Add exercises to a day
- GIVEN exercises "Rosca Direta" and "Supino" exist
- WHEN the user adds both to "Dia 1"
- THEN "Dia 1" lists both exercises in the chosen order

#### Scenario: Same exercise across multiple days
- GIVEN exercise "Rosca Direta" is already in "Dia 1"
- WHEN the user also adds it to "Dia 3"
- THEN both days include "Rosca Direta" referencing the same exercise record

#### Scenario: Remove an exercise from a day
- GIVEN "Dia 1" includes "Supino"
- WHEN the user removes "Supino" from "Dia 1"
- THEN "Dia 1" no longer lists it
- AND the "Supino" exercise record and its weights are unaffected

#### Scenario: Every exercise is reachable through the picker
- GIVEN no filter is active in the day form
- WHEN the user opens the "Adicionar exercício" list
- THEN every exercise not already in the day is offered

---

## REMOVED

(None)
