# Delta: Exercise Management

**Change ID:** `bootstrap-myonegym`
**Affects:** Data layer (exercises), Settings UI, Category reference

## ADDED Requirements

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
