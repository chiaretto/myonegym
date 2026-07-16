# Delta: home-navigation

**Change ID:** `floating-stepper-nav`
**Affects:** the expanded day becomes addressable; the exercise detail remembers
the day it was opened from — fixing Back, and enabling Voltar/Avançar

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Home Accordion of Training Days

The Home screen MUST present training days as an **accordion**. Each day's header
MUST show the day **name** and, as a secondary line, the day's **derived
categories** — the distinct categories of the exercises in that day (see the
training-days spec) — falling back to the **exercise count** when the day has no
categorized exercises. Expanding a day lists that day's active exercises, each
showing its **name** and **media thumbnail** (a static image or an animated GIF).

The **expanded day MUST be part of the address**, not transient screen state, so
it survives leaving Home and coming back (see Open Exercise Detail). Opening Home
with a day addressed MUST expand that day; collapsing MUST clear it. Addressing a
day that no longer exists MUST expand nothing rather than fail. Expanding or
collapsing MUST NOT add browser history entries — otherwise Back would step
through the accordion instead of leaving Home.

#### Scenario: Day header shows derived categories
- GIVEN "Dia 1" contains "Supino" (Peito) and "Tríceps Corda" (Tríceps)
- WHEN the user views Home
- THEN the "Dia 1" header shows "Peito · Tríceps" as its secondary line

#### Scenario: Header falls back to the count
- GIVEN "Dia 2" contains 3 exercises, none with a category
- WHEN the user views Home
- THEN the "Dia 2" header shows "3 exercícios" as its secondary line

#### Scenario: Expand a day
- GIVEN "Dia 1" contains "Rosca Direta" and "Supino"
- WHEN the user taps "Dia 1" on Home
- THEN the day expands and lists "Rosca Direta" and "Supino" with their media thumbnails (image or GIF)

#### Scenario: Collapse a day
- GIVEN "Dia 1" is expanded
- WHEN the user taps "Dia 1" again
- THEN the day collapses and hides its exercise list

#### Scenario: Empty state
- GIVEN no training days exist
- WHEN the user opens Home
- THEN an empty state guides the user to create data in Settings

#### Scenario: The expanded day survives leaving and returning
- GIVEN "Dia 3" is expanded on Home
- WHEN the user opens one of its exercises and then goes back
- THEN Home is shown with "Dia 3" still expanded

#### Scenario: Opening Home with a day addressed
- GIVEN the user opens Home addressed to "Dia 3" (e.g. reloads that address)
- WHEN Home renders
- THEN "Dia 3" is expanded

#### Scenario: A day that no longer exists
- GIVEN Home is opened addressed to a day that has since been deleted
- WHEN Home renders
- THEN no day is expanded and the screen behaves normally

#### Scenario: Toggling days does not pile up history
- GIVEN the user expands and collapses several days on Home
- WHEN the user then goes back
- THEN they leave Home, rather than stepping back through the accordion

### Requirement: Open Exercise Detail

Tapping an exercise on Home MUST open its detail view showing the **rendered
media** (a static image or an animated GIF, played back animated) and the
**editable per-gym weight** (see weights spec).

The detail MUST **remember the training day it was opened from** — an exercise
may belong to several days, so the day cannot be inferred from the exercise. That
context MUST be carried in the **address**, so it survives a reload and the
browser's Back button. It has two consequences:

- **Going back MUST return to Home with that day still expanded** — not to a
  collapsed Home, which would make the user hunt for their place again.
- The detail MUST offer **Voltar / Avançar** controls that step to the
  **previous / next exercise of that day**, in the day's order, disabled at the
  first / last exercise. Stepping MUST preserve the day context. These controls
  MUST be presented as a **floating bar fixed to the bottom of the screen**, and
  MUST NOT cover any content (see the `workout-sessions` spec, which specifies the
  same bar for the in-session detail). There is **no "Concluir"** here — that
  belongs to a workout session.

When the detail is opened **without** a day (a direct link, a stale bookmark, or
a day that no longer exists), it MUST degrade gracefully: **no navigation bar**,
and going back returns to Home.

#### Scenario: View exercise detail
- GIVEN gym "A" is active and "Rosca Direta" has a media URL and weight 20 KG in "A"
- WHEN the user taps "Rosca Direta" from "Dia 1"
- THEN the detail view renders the media (image or animated GIF) and shows 20 KG with an edit control

#### Scenario: Broken media fallback
- GIVEN an exercise's media URL (image or GIF) fails to load
- WHEN its detail view (or list item) renders
- THEN a placeholder is shown instead of a broken image/GIF

#### Scenario: Going back returns to the day you came from
- GIVEN "Dia 3" is expanded on Home and the user taps "Supino" inside it
- WHEN the user goes back from the exercise detail
- THEN Home is shown with "Dia 3" still expanded

#### Scenario: Step through a day's exercises
- GIVEN "Dia 1" contains "Rosca Direta", "Supino" and "Tríceps Corda" in that order
- AND the user opened "Supino" from "Dia 1"
- WHEN the user taps "Avançar"
- THEN the detail for "Tríceps Corda" is shown, still in the context of "Dia 1"
- AND tapping "Voltar" twice from there returns to "Rosca Direta"

#### Scenario: Navigation is disabled at the ends
- GIVEN the user opened the **first** exercise of "Dia 1"
- THEN "Voltar" is disabled
- AND GIVEN the user opened the **last** exercise of "Dia 1", "Avançar" is disabled

#### Scenario: An exercise in two days follows the day it was opened from
- GIVEN "Supino" belongs to both "Dia 1" and "Dia 4"
- WHEN the user opens "Supino" from "Dia 4" and taps "Avançar"
- THEN the next exercise of **"Dia 4"** is shown (not of "Dia 1")

#### Scenario: Opened without a day
- GIVEN the user opens an exercise detail directly, with no day context
- WHEN the detail renders
- THEN no Voltar/Avançar bar is shown
- AND going back returns to Home

#### Scenario: The bar covers no content
- GIVEN an exercise detail opened from a day, at any font-size setting
- WHEN the user scrolls to the bottom of the screen
- THEN the last content is fully readable above the floating bar

---

## REMOVED Requirements

(None)
