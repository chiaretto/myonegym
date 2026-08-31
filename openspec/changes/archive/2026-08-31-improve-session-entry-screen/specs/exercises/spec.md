# Delta: exercises

**Change ID:** `improve-session-entry-screen`
**Affects:** o cabeçalho acima das abas, no detalhe do exercício em sessão

---

## MODIFIED Requirements

### Requirement: Single Exercise Title on Detail Views

Every **exercise detail view** MUST show the exercise's **name exactly once**, in
the screen's **top bar** — the same bar that carries the back control. This holds
for both the catalog exercise detail and the in-session one. The body of the screen
MUST NOT repeat the name as a heading: a duplicated title reads as a layout
defect and pushes the useful content (the tabs, the media, the target weight)
further down a screen that is used mid-workout.

These views MUST NOT show **training-day information** (neither the day the
detail was opened from, nor the count of days the exercise belongs to, nor the
session's day name). The user reaches the detail from a day they have just
chosen, so the day answers no question there and only costs vertical space. This
does **not** affect the **exercises list** (Settings → Exercícios), which MUST
keep showing each exercise's days — see *Show Training Days on the Exercises
List*.

Above the tabs, the header MAY carry only the **"Alternativa de X"** label — the
one thing up there that says the screen is showing something other than the
entry's own exercise. Everything else that once sat there belongs elsewhere: the
exercise's **categories** to a tab, because a category describes the exercise and
reads with the note (see *Exercise Note and Photos on the Catalog Detail*); and
the **"Concluído"** indicator to nothing at all, because the floating bar's
ticked control, that control's label and done tint, and the filled segment of the
progress strip already carry the fact three times over (see *Segmented Progress
on the Session Exercise Detail* and *One-Line Stepper With a Toggleable Done
Control*, in `workout-sessions`). A fourth badge for one boolean is a line the
user has to read past mid-workout. On the catalog detail there is no such label
at all, so the tabs meet the top bar directly.

Removing the day from the header MUST NOT change **navigation**: the catalog
detail still carries its day context in the address, still offers Voltar /
Avançar over that day's exercises, and going back still returns to Home with
that day expanded (see the `home-navigation` capability).

#### Scenario: Catalog detail shows the name once
- GIVEN the user opens "Rosca Direta" from "Dia 2"
- WHEN the detail renders
- THEN "Rosca Direta" appears exactly once on the screen, in the top bar
- AND no heading below the tabs repeats it

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
- THEN no "Concluído" indicator is shown above the tabs
- AND the done state is legible from the floating bar's control
- AND "Peito" and "Tríceps" are shown as labels inside the notes tab

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

## ADDED

(None)

---

## REMOVED

(None)
