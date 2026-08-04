# Delta: exercises

**Change ID:** `session-entry-tabs-first`
**Affects:** o detalhe do exercício no catálogo — abas no topo, mídia dentro da
aba "Detalhe", categorias dentro de "Observações"

---

## MODIFIED Requirements

### Requirement: Exercise Note and Photos on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**, and those tabs MUST be the **first control below the top bar** —
before the media and before the target weight. The screen is opened to look
something up, and which of the three things the user wants is the first decision
they make on it.

Each tab MUST carry what belongs to it:

- **"Detalhe"** — the exercise's **media**, the per-gym **target weight** editor
  and its **history**, and the **Alternativas** section (see *Alternatives
  Section on the Exercise Detail*), in that order.
- **"Observações"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(active gym, exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit save.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): listing them, attaching one (camera or gallery)
  and deleting one.

The media MUST NOT be rendered outside the "Detalhe" tab, and the categories
MUST NOT be rendered above the tabs — that is the vertical space this
arrangement exists to free.

This MUST match the in-session exercise detail's arrangement (see the
`workout-sessions` capability, *Session Exercise Detail*), down to which tab
holds the media and the categories. The two screens are the same view in two
contexts and the user moves between them constantly; only their first tab's
**label** differs ("Detalhe" here, "Execução" in a session), because only one of
them is about executing something right now.

Both the note and the photos reflect the **same** data edited from the
in-session exercise detail (notes and photos are per `(gym, exercise)`, not per
session). When **no gym is active**, the Observações **and Foto** tabs MUST
prompt the user to create/select a gym first — the same treatment as the
target-weight editor — and nothing can be saved.

#### Scenario: The tabs come before everything else
- GIVEN the user opens an exercise from the catalog
- WHEN the detail renders
- THEN the "Detalhe", "Observações" and "Foto" tabs appear directly below the top
  bar, above the media and the target weight
- AND reaching them requires no scrolling

#### Scenario: The media belongs to the first tab
- GIVEN an exercise with a media URL
- WHEN the user opens its detail and switches to "Observações"
- THEN no media is shown
- AND switching back to "Detalhe" shows it again, above the target weight

#### Scenario: Categories live in "Observações"
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps"
- WHEN the user opens its catalog detail
- THEN no category label is shown above the tabs
- AND switching to "Observações" shows "Peito" and "Tríceps" above the note field

#### Scenario: Edit a note from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no note in "A"
- WHEN the user opens the exercise detail, switches to "Observações", types "banco no furo 3", and saves
- THEN the note `(A, Rosca Direta) = "banco no furo 3"` is persisted
- AND opening "Rosca Direta" during a session in gym "A" shows the same note

#### Scenario: Note follows the active gym
- GIVEN "Rosca Direta" has a note in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Observações" tab
- THEN no note text is shown (the note is scoped to the active gym)

#### Scenario: No active gym prompts for one
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Observações"
- THEN the tab prompts the user to create/select a gym first
- AND no note can be saved until a gym is active

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

Above the tabs, the header MAY carry only the entry's **status** labels — in a
session, the **"Concluído"** indicator and the **"Alternativa de X"** label.
Everything else that once sat there, the exercise's **categories** included,
belongs to a tab: status is about the screen as a whole and stays visible on all
of them, whereas a category is a description of the exercise and reads with the
note (see *Exercise Note and Photos on the Catalog Detail*). On the catalog
detail there is no status at all, so the tabs meet the top bar directly.

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
- THEN the "Concluído" indicator is shown above the tabs
- AND "Peito" and "Tríceps" are shown as labels inside the "Observações" tab

#### Scenario: Navigation is unaffected
- GIVEN the user opened "Supino" from "Dia 4" on the catalog detail
- WHEN the user taps "Avançar" and then goes back
- THEN stepping still follows "Dia 4"'s order
- AND going back returns to Home with "Dia 4" still expanded

---

## ADDED

(None)

## REMOVED

(None)
