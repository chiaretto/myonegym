# exercises Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Register an Exercise

The user MUST be able to create an exercise with a name (e.g. "Rosca Direta"), a
**media URL**, and a **category**. The media MAY be a **static image**
(PNG/JPG/JPEG/WebP) or an **animated GIF** — a single URL field accepts either.
Exercises are global (not tied to a gym) and MAY be reused across multiple
training days and categories.

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
it. Deleting an exercise removes it from days and removes its weight records.

#### Scenario: Delete an exercise in use
- GIVEN exercise "Rosca Direta" is used by "Dia 1" and has weights in gym "A"
- WHEN the user deletes it
- THEN it is removed from "Dia 1"
- AND its weight records across all gyms are removed

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
