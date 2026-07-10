# Delta: home-navigation

**Change ID:** `dynamic-day-categories`
**Affects:** the Home accordion day header shows derived categories
**Implements:** issue #1

---

## MODIFIED Requirements

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

---

## ADDED Requirements

(None)

---

## REMOVED Requirements

(None)
