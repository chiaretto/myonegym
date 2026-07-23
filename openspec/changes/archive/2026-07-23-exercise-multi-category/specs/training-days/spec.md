# Delta: training-days

**Change ID:** `exercise-multi-category`
**Affects:** derived day categories become the **union** of each exercise's
(possibly multiple) categories

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

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

---

## REMOVED Requirements

(None)
