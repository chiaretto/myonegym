# training-days Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Register a Training Day

The user MUST be able to create a training day with a **name** (e.g. "Dia 1") and
a selection of exercises. A day has **no manually-assigned category** — its
categories are **derived from the categories of the exercises in the day** (see
Derived Day Categories). The day form MUST NOT offer a category selector.

#### Scenario: Create a training day
- GIVEN the training-days screen is open
- WHEN the user creates a day named "Dia 1" and selects some exercises
- THEN the day is persisted and appears on the Home accordion
- AND its categories are derived from those exercises (no manual category is asked for)

#### Scenario: A day with no categorized exercises
- GIVEN the user creates "Dia 2" whose exercises have no category
- THEN the day is created successfully
- AND its listing falls back to the exercise count (no category label)

### Requirement: Select Exercises for a Day

The user MUST be able to choose which exercises belong to a day. Exercises MAY
repeat across days, and their order within a day SHOULD be preserved.

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

### Requirement: Edit and Delete Training Days

The user MUST be able to rename a day, change its **exercise selection**, and
delete the day. (There is no manual day category to edit — categories follow the
exercises.)

#### Scenario: Delete a day
- GIVEN "Dia 1" exists with selected exercises
- WHEN the user deletes "Dia 1"
- THEN the day is removed from the Home accordion
- AND the referenced exercises and their weights are unaffected

### Requirement: Derived Day Categories

A training day's categories MUST be **derived dynamically** from the **union of the
categories of the exercises currently in the day** — each exercise MAY contribute
**several** categories — kept **distinct** and ordered by first appearance
(following the day's exercise order, then the order of categories within an
exercise). Exercises with no categories MUST be ignored. The
derived set MUST update automatically when exercises are added or removed from
the day, or when an exercise's own category changes. When a day has no
categorized exercises, listings MUST fall back to a neutral summary (the count
of exercises).

#### Scenario: Categories come from the day's exercises
- GIVEN "Dia 1" contains "Supino" (Peito) and "Tríceps Corda" (Tríceps)
- WHEN the day is listed
- THEN its categories show "Peito · Tríceps" (distinct, in exercise order)

#### Scenario: Distinct categories are not repeated
- GIVEN "Dia 1" contains "Supino" (Peito) and "Crucifixo" (Peito)
- WHEN the day is listed
- THEN its categories show "Peito" once

#### Scenario: Updates when the day's exercises change
- GIVEN "Dia 1" shows "Peito" (only Peito exercises)
- WHEN the user adds a "Costas" exercise to the day
- THEN the day's listing now shows "Peito · Costas"

#### Scenario: Fallback when nothing is categorized
- GIVEN "Dia 3" contains only exercises with no category
- WHEN the day is listed
- THEN no category label is shown and the exercise count is shown instead

#### Scenario: A compound exercise contributes all its categories
- GIVEN "Dia 1" contains "Supino" (Peito, Tríceps)
- WHEN the day is listed
- THEN its categories show "Peito · Tríceps" (both, from the one exercise)

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
