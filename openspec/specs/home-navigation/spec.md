# home-navigation Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Home Accordion of Training Days

The Home screen MUST present training days as an **accordion**. Each day's header
MUST show the day **name** and, as a secondary line, the day's **derived
categories** — the distinct categories of the exercises in that day (see the
training-days spec) — falling back to the **exercise count** when the day has no
categorized exercises. Expanding a day lists that day's active exercises, each
showing its **name** and **media thumbnail** (a static image or an animated GIF).

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

### Requirement: Open Exercise Detail

Tapping an exercise on Home MUST open its detail view showing the **rendered
media** (a static image or an animated GIF, played back animated) and the
**editable per-gym weight** (see weights spec).

#### Scenario: View exercise detail
- GIVEN gym "A" is active and "Rosca Direta" has a media URL and weight 20 KG in "A"
- WHEN the user taps "Rosca Direta" from "Dia 1"
- THEN the detail view renders the media (image or animated GIF) and shows 20 KG with an edit control

#### Scenario: Broken media fallback
- GIVEN an exercise's media URL (image or GIF) fails to load
- WHEN its detail view (or list item) renders
- THEN a placeholder is shown instead of a broken image/GIF

### Requirement: Preview Current Weight on Home Rows

Each exercise row on Home MUST also display, as a compact read-only badge, the
**current target weight** (value + unit) for the exercise in the **active
gym**. When no weight is recorded for the exercise in the active gym, the badge
MUST invite the action (e.g., render "definir" or an equivalent hint) instead
of a numeric value or empty space. The badge is not independently editable —
tapping the row still opens the exercise detail (see Open Exercise Detail
requirement).

#### Scenario: Row shows the active-gym weight
- GIVEN gym "A" is active and "Rosca Direta" has weight 20 KG in gym "A"
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge "20 KG"

#### Scenario: Row invites action when no weight is set
- GIVEN "Rosca Direta" has no weight recorded in the active gym
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge with a hint (e.g., "definir")

#### Scenario: Badge follows the active gym
- GIVEN "Rosca Direta" is 20 KG in gym "A" and 15 LB in gym "B"
- WHEN the user switches the active gym from "A" to "B"
- THEN Home rows update to reflect gym "B" weights ("15 LB")

### Requirement: Start or Resume a Workout From a Day

Each training day on the Home accordion MUST expose a **start workout**
affordance that begins a session for that day in the **active gym** (see the
workout-sessions spec). When the active gym already has an in-progress session,
the affordance MUST instead offer to **resume** that session rather than start a
new one.

#### Scenario: Start a workout from Home
- GIVEN gym "A" is active and "Dia 1" is shown on Home with no active session
- WHEN the user taps the start-workout affordance on "Dia 1"
- THEN an in-progress session for "Dia 1" is created in gym "A"
- AND the user is taken to the active-session runner

#### Scenario: Resume instead of starting a second session
- GIVEN gym "A" already has an in-progress session for "Dia 1"
- WHEN the user views Home
- THEN the affordance invites the user to resume the active session
- AND tapping it opens the existing session rather than creating a new one

#### Scenario: Start requires an active gym
- GIVEN no gym is active
- WHEN the user taps the start-workout affordance
- THEN starting is blocked and the user is prompted to create/select a gym first

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

