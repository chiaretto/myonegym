# Delta: exercises

**Change ID:** `exercise-multi-category`
**Affects:** an exercise carries **zero or more** categories instead of one;
uncategorized = empty list (no reserved category)

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Register an Exercise

The user MUST be able to create an exercise with a name (e.g. "Rosca Direta"), a
**media URL**, and **zero or more categories**. A compound exercise (e.g. a bench
press training Peito **and** Tríceps) MAY carry several categories; an exercise
MAY also carry **none** — an exercise with no categories is **uncategorized** and
is shown with the label "Sem categoria". There is **no reserved "Sem categoria"
category**: uncategorized simply means an empty category list. The media MAY be a
**static image** (PNG/JPG/JPEG/WebP) or an **animated GIF** — a single URL field
accepts either. Exercises are global (not tied to a gym) and MAY be reused across
multiple training days and categories.

The category picker MUST let the user select **multiple** categories (e.g.
tap-to-toggle), and selecting none MUST be valid.

#### Scenario: Create an exercise with a static image
- GIVEN category "Bíceps" exists
- WHEN the user creates exercise "Rosca Direta" with media URL "https://…/rosca.png" and category "Bíceps"
- THEN the exercise is persisted with its media URL and category
- AND it becomes available for selection when building training days

#### Scenario: Create an exercise with an animated GIF
- GIVEN category "Bíceps" exists
- WHEN the user creates exercise "Rosca Direta" with media URL "https://…/rosca.gif" and category "Bíceps"
- THEN the exercise is persisted with the GIF URL
- AND the app treats it as valid media (GIF is an accepted format)

#### Scenario: Require a name
- GIVEN the exercise form is open
- WHEN the user submits without a name
- THEN creation is blocked with a validation message

#### Scenario: Media URL is optional but validated when present
- GIVEN the user is creating an exercise
- WHEN a media URL is provided that is not a valid URL, or points to an unsupported type (not an image or GIF)
- THEN the app shows a validation message
- AND WHEN no media URL is provided, the exercise is still created (placeholder used at render time)

#### Scenario: Animated GIF renders animated
- GIVEN an exercise whose media URL is an animated GIF
- WHEN its detail view (or list thumbnail) renders the media
- THEN the GIF is shown and plays its animation (not a frozen frame)

#### Scenario: Create an exercise with multiple categories
- GIVEN categories "Peito" and "Tríceps" exist
- WHEN the user creates "Supino Reto" and selects both "Peito" and "Tríceps"
- THEN the exercise is persisted carrying both categories

#### Scenario: Create an exercise with no category
- GIVEN the exercise form is open
- WHEN the user creates "Alongamento" without selecting any category
- THEN the exercise is persisted with no categories and is shown as "Sem categoria"

#### Scenario: All of an exercise's categories are shown
- GIVEN "Supino Reto" is categorized as "Peito" and "Tríceps"
- WHEN it is shown in a listing or on its detail
- THEN both "Peito" and "Tríceps" are shown

### Requirement: Filter and Search the Exercises List

The exercises list (Settings → Exercícios) MUST provide a **name search field**
and **filters by category and by training day**, combinable, that narrow the
displayed exercises without changing any underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category (matching exercises that **include** that category among their
  categories), and "no category" (matching exercises with **no** categories).
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

#### Scenario: Filter by a specific category (including compound exercises)
- GIVEN "Rosca Direta" is categorized "Bíceps" and "Remada" is categorized "Costas" and "Bíceps"
- WHEN the user selects category "Bíceps" in the category filter
- THEN both "Rosca Direta" and "Remada" are shown (any exercise that includes "Bíceps")

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

## REMOVED Requirements

(None)
