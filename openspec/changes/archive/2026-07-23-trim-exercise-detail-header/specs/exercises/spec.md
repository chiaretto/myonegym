# Delta: exercises

**Change ID:** `trim-exercise-detail-header`
**Affects:** the header of both exercise detail views (catalog `/exercise/:id`
and in-session `/session/:id/entry/:entryId`) — the name is shown **once**, and
the training day is no longer shown

---

## ADDED Requirements

### Requirement: Single Exercise Title on Detail Views

Every **exercise detail view** (the catalog exercise detail and the in-session
exercise detail) MUST show the exercise's **name exactly once**, in the screen's
**top bar** — the same bar that carries the back control. The body of the screen
MUST NOT repeat the name as a heading: a duplicated title reads as a layout
defect and pushes the useful content (media, tabs, target weight) further down a
screen that is used mid-workout.

These views MUST NOT show **training-day information** (neither the day the
detail was opened from, nor the count of days the exercise belongs to, nor the
session's day name). The user reaches the detail from a day they have just
chosen, so the day answers no question there and only costs vertical space. This
does **not** affect the **exercises list** (Settings → Exercícios), which MUST
keep showing each exercise's days — see *Show Training Days on the Exercises
List*.

The header MAY still carry **contextual labels that are not the name and not the
day** — the exercise's **categories**, and (in a session) the entry's
**"Concluído"** status indicator.

Removing the day from the header MUST NOT change **navigation**: the catalog
detail still carries its day context in the address, still offers Voltar /
Avançar over that day's exercises, and going back still returns to Home with
that day expanded (see the `home-navigation` capability).

#### Scenario: Catalog detail shows the name once
- GIVEN the user opens "Rosca Direta" from "Dia 2"
- WHEN the detail renders
- THEN "Rosca Direta" appears exactly once on the screen, in the top bar
- AND no heading below the media repeats it

#### Scenario: In-session detail shows the name once
- GIVEN the user opens an entry's detail during a session
- WHEN the detail renders
- THEN the entry's exercise name appears exactly once, in the top bar

#### Scenario: No training day on the catalog detail
- GIVEN "Rosca Direta" belongs to "Dia 2" and "Dia 5" and is opened from "Dia 2"
- WHEN the detail renders
- THEN neither "Dia 2" nor a "2 dias" indication is shown anywhere on the screen

#### Scenario: No training day on the in-session detail
- GIVEN an in-progress session of "Dia 2"
- WHEN the user opens an entry's detail
- THEN the session's day name is not shown on the screen

#### Scenario: Categories and done status remain
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps", and its
  session entry is already done
- WHEN the user opens the in-session detail
- THEN "Peito" and "Tríceps" are shown as labels
- AND the "Concluído" indicator is still shown

#### Scenario: Navigation is unaffected
- GIVEN the user opened "Supino" from "Dia 4" on the catalog detail
- WHEN the user taps "Avançar" and then goes back
- THEN stepping still follows "Dia 4"'s order
- AND going back returns to Home with "Dia 4" still expanded

#### Scenario: The exercises list still shows days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views Settings → Exercícios
- THEN the "Rosca Direta" item still shows both day labels

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
