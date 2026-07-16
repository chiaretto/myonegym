# Delta: exercise-notes

**Change ID:** `add-exercise-notes`
**Affects:** new `exercise-notes` capability; references gyms, exercises, weights, workout-sessions.

---

## ADDED Requirements

### Requirement: Persist a Per-Gym Exercise Note

The app MUST let each exercise carry a single **free-text note scoped to a gym**.
A note record is keyed by `(gymId, exerciseId)` — **at most one note per pair** —
and holds the note **text** and a last-updated timestamp. The note MUST be **durable**:
it is independent of any workout session and persists until edited or cleared. The
**active gym** determines which note is shown and edited. Notes MUST be **isolated
per gym** — the same exercise may carry different notes (or none) in different
gyms.

#### Scenario: Write a note for the active gym
- GIVEN gym "A" is active and exercise "Rosca Direta" has no note yet
- WHEN the user opens the exercise and saves the note "manter cotovelo fixo"
- THEN a note record `(A, Rosca Direta) = "manter cotovelo fixo"` is persisted
- AND reopening the exercise in gym "A" shows that note

#### Scenario: Same note across sessions of the same exercise/gym
- GIVEN `(A, Rosca Direta)` has the note "manter cotovelo fixo"
- WHEN the user runs a new workout session in gym "A" and opens "Rosca Direta"
- THEN the same note is shown (the note is not per-session)

#### Scenario: Note is isolated per gym
- GIVEN `(A, Rosca Direta)` has the note "manter cotovelo fixo"
- WHEN the user switches the active gym to "B" and opens "Rosca Direta"
- THEN gym "B" shows no note for "Rosca Direta" (its note is independent of "A")

### Requirement: Edit and Clear the Note

The note field MUST support an explicit **edit → save** interaction so text is
only persisted on save. Saving **empty or whitespace-only** text MUST **remove**
the note record for `(gymId, exerciseId)` — there is no "empty note".

#### Scenario: Edit replaces the text
- GIVEN `(A, Rosca Direta)` has the note "manter cotovelo fixo"
- WHEN the user changes the text to "usar pegada aberta" and saves
- THEN the note record stores "usar pegada aberta" for gym "A"

#### Scenario: Clearing the text removes the note
- GIVEN `(A, Rosca Direta)` has a note
- WHEN the user deletes all the text and saves
- THEN no note record remains for `(A, Rosca Direta)`

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
