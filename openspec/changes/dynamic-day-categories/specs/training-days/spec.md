# Delta: training-days

**Change ID:** `dynamic-day-categories`
**Affects:** a day no longer has a manual category; categories are derived from exercises
**Implements:** issue #1

---

## MODIFIED Requirements

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

### Requirement: Edit and Delete Training Days

The user MUST be able to rename a day, change its **exercise selection**, and
delete the day. (There is no manual day category to edit — categories follow the
exercises.)

#### Scenario: Delete a day
- GIVEN "Dia 1" exists with selected exercises
- WHEN the user deletes "Dia 1"
- THEN the day is removed from the Home accordion
- AND the referenced exercises and their weights are unaffected

---

## ADDED Requirements

### Requirement: Derived Day Categories

A training day's categories MUST be **derived dynamically** from the **distinct
categories of the exercises currently in the day**, in the order the exercises
first appear in the day. Exercises without a category MUST be ignored. The
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

---

## REMOVED Requirements

(None — the "Category is optional" behaviour is folded into the modified
"Register a Training Day"; the manual category no longer exists.)
