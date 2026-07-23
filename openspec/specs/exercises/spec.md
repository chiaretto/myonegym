# exercises Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
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

### Requirement: Reuse Exercises Across Days and Categories

The same exercise MUST be selectable in multiple training days without
duplication of the underlying exercise record.

#### Scenario: Same exercise on two days
- GIVEN exercise "Rosca Direta" exists
- WHEN the user adds it to both "Dia 1" and "Dia 3"
- THEN both days reference the same exercise record
- AND its per-gym weight is shared across both days

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

### Requirement: Exercise Media Display on Detail Views

On every **exercise detail view** (the exercise detail page, the in-session
exercise detail, and the day-form exercise preview), the exercise's media
(static image or animated GIF) MUST be shown **whole and at its natural
proportions** — the full image at at least its proportional height, never
cropped by a fixed-height container. Very tall media MUST be capped to a
screen-friendly height while remaining fully visible (contained, not cropped).
When the media is missing or fails to load, a placeholder MUST render as a tidy
box. This applies uniformly across all detail views (they share one media
presentation).

#### Scenario: Portrait image shows at full height
- GIVEN an exercise whose image is taller than it is wide
- WHEN the user opens the exercise detail
- THEN the whole image is shown at its natural proportion (no crop, not forced into a short landscape box)

#### Scenario: Landscape/square image shows fully
- GIVEN an exercise whose image is landscape or square
- WHEN the user opens the exercise detail
- THEN the whole image is shown proportionally, filling the available width

#### Scenario: Very tall media is capped, not cropped
- GIVEN an exercise whose media is extremely tall
- WHEN the user opens the exercise detail
- THEN the media is capped to a screen-friendly height
- AND the entire media is still visible (contained), not cropped

#### Scenario: Missing or broken media
- GIVEN an exercise with no media URL, or one that fails to load
- WHEN the user opens the exercise detail
- THEN a placeholder is shown as a tidy box (not a collapsed or distorted area)

#### Scenario: Consistent across detail views
- GIVEN the same exercise
- WHEN it is viewed on the exercise detail page, the in-session detail, and the day-form preview
- THEN its media is presented the same way (full, proportional) in all three


### Requirement: Show Training Days on the Exercises List

The exercises list (Settings → Exercícios) MUST show, for **each exercise**, the
**training days it is registered in** — the names of the days whose exercise
selection includes it, in the days' **display order**, each presented as an
**outlined label** (chip). When an exercise is in **no** day, the list MUST show
a neutral hint (e.g., "Nenhum dia"). The information MUST update automatically as
exercises are added to or removed from days.

#### Scenario: Exercise used in multiple days
- GIVEN "Rosca Direta" is in "Dia 2" and "Dia 5"
- WHEN the user views the Exercícios list
- THEN the "Rosca Direta" item shows both day names as outlined labels, in the days' display order

#### Scenario: Exercise used in no day
- GIVEN "Alongamento" is not in any training day
- WHEN the user views the Exercícios list
- THEN the "Alongamento" item shows a neutral hint (e.g., "Nenhum dia")

#### Scenario: Updates when membership changes
- GIVEN "Rosca Direta" shows "Dia 2" on the Exercícios list
- WHEN the user removes "Rosca Direta" from "Dia 2"
- THEN the list no longer shows "Dia 2" for it (updates live)

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
