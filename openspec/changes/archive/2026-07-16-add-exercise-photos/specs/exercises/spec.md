# Delta: exercises

**Change ID:** `add-exercise-photos`
**Affects:** the catalog exercise detail gains a **Foto** tab beside Observações

> **Note for the archive merge:** this requirement is **renamed**. Replace the
> existing **"Exercise Note on the Catalog Detail"** in
> `openspec/specs/exercises/spec.md` with the retitled **"Exercise Note and
> Photos on the Catalog Detail"** below — do not append it as a second
> requirement, or the spec will carry both.

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Exercise Note and Photos on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**: a **"Detalhe"** tab with the existing content (the per-gym target
weight editor and its history), an **"Observações"** tab that shows and edits the
**per-gym exercise note** for `(active gym, exerciseId)` (see the
`exercise-notes` capability), and a **"Foto"** tab that shows and manages the
**per-gym exercise photos** for the same pair (see the `exercise-photos`
capability). The Observações tab provides an editable text field with an explicit
save; the Foto tab lists the pair's photos and lets the user attach one (camera or
gallery) or delete one. Both reflect the **same** data edited from the in-session
exercise detail (notes and photos are per `(gym, exercise)`, not per session).
When **no gym is active**, the Observações **and Foto** tabs MUST prompt the user
to create/select a gym first — the same treatment as the target-weight editor —
and nothing can be saved.

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

#### Scenario: Attach a photo from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no photos in "A"
- WHEN the user opens the exercise detail, switches to "Foto", and attaches a photo
- THEN the photo is persisted for `(A, Rosca Direta)`
- AND opening "Rosca Direta" during a session in gym "A" shows the same photo

#### Scenario: Photos follow the active gym
- GIVEN "Rosca Direta" has photos in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Foto" tab
- THEN no photos are shown (photos are scoped to the active gym)

#### Scenario: No active gym prompts for one before a photo
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Foto"
- THEN the tab prompts the user to create/select a gym first
- AND no photo can be attached until a gym is active

---

## REMOVED Requirements

(None)
