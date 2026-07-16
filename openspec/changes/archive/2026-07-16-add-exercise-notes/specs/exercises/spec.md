# Delta: exercises

**Change ID:** `add-exercise-notes`
**Affects:** `exercises` (catalog exercise detail + delete cascade); references `exercise-notes`.

---

## ADDED Requirements

### Requirement: Exercise Note on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**: a **"Detalhe"** tab with the existing content (the per-gym target
weight editor and its history), and an **"Observações"** tab that shows and edits
the **per-gym exercise note** for `(active gym, exerciseId)` (see the
`exercise-notes` capability). The Observações tab provides an editable text field
with an explicit save, and reflects the **same** note edited from the in-session
exercise detail (notes are per `(gym, exercise)`, not per session). When **no gym
is active**, the Observações tab MUST prompt the user to create/select a gym
first — the same treatment as the target-weight editor — and no note can be saved.

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

---

## MODIFIED Requirements

### Requirement: Edit and Delete Exercises

The user MUST be able to edit an exercise (name, media URL, category) and delete
it. Deleting an exercise removes it from days, removes its weight records, and
removes its **per-gym notes**.

#### Scenario: Delete an exercise in use
- GIVEN exercise "Rosca Direta" is used by "Dia 1" and has weights in gym "A"
- WHEN the user deletes it
- THEN it is removed from "Dia 1"
- AND its weight records across all gyms are removed

#### Scenario: Deleting an exercise removes its notes
- GIVEN exercise "Rosca Direta" has notes in gyms "A" and "B"
- WHEN the user deletes it
- THEN its note records across all gyms are removed

---

## REMOVED Requirements

(None)
