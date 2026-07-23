# exercise-photos Specification

## Purpose
Attach durable **photos** to an exercise **within a gym** — many per
`(gymId, exerciseId)`, keyed like a target weight or a note. Photos capture what
prose cannot: the machine's own setup in *that* gym (seat height, pin position,
plate layout). They are distinct from `Exercise.mediaUrl`, the remote demo image
that is identical in every gym. Photos persist across workout sessions and are
shared between the in-session entry detail and the catalog exercise detail.
Photos are part of the full **backup** (base64-encoded into the backup JSON) and
are restored by an import (see the `data-portability` spec).

## Requirements
### Requirement: Persist Per-Gym Exercise Photos

The app MUST let each exercise carry **photos scoped to a gym**. Photo records are
keyed by `(gymId, exerciseId)` — like a target weight or a note — but unlike those,
a pair MAY hold **many** photos. Each record stores the **image bytes**, its
**dimensions**, and a **creation timestamp**.

Photos MUST be **durable**: independent of any workout session, persisting until
deleted. The **active gym** determines which photos are shown. Photos MUST be
**isolated per gym** — the same exercise may carry different photos (or none) in
different gyms, because the machine being photographed is a different machine.

The image MUST be stored **inside the app** (local storage, no upload, no server).

#### Scenario: Attach a photo for the active gym
- GIVEN gym "A" is active and "Rosca Direta" has no photos
- WHEN the user attaches a photo to "Rosca Direta"
- THEN a photo record for `(A, Rosca Direta)` is persisted with its bytes and dimensions
- AND reopening "Rosca Direta" in gym "A" shows that photo

#### Scenario: Photos survive across sessions
- GIVEN `(A, Rosca Direta)` has a photo
- WHEN the user runs a new workout session in gym "A" and opens "Rosca Direta"
- THEN the same photo is shown (photos are not per-session)

#### Scenario: Photos are isolated per gym
- GIVEN `(A, Rosca Direta)` has two photos
- WHEN the user switches the active gym to "B" and opens "Rosca Direta"
- THEN gym "B" shows no photos for "Rosca Direta"

#### Scenario: Several photos on one exercise
- GIVEN `(A, Leg Press)` already has a photo of the seat setting
- WHEN the user attaches a second photo of the plate layout
- THEN both photos are kept for `(A, Leg Press)`, newest first

### Requirement: Capture or Choose a Photo

The user MUST be able to add a photo either by **taking one with the device
camera** or by **choosing an existing image** from the device. Both paths MUST be
offered explicitly, because a user setting up a machine wants the camera, while a
user reviewing at home wants a picture they already have.

Only image files MAY be accepted. A file that cannot be read as an image MUST be
rejected with a clear message and MUST NOT create a record.

#### Scenario: Take a photo
- GIVEN the user is viewing an exercise's photos in gym "A"
- WHEN the user chooses "Tirar foto" and captures an image
- THEN the image is attached to `(A, exercise)` and appears immediately

#### Scenario: Choose from the gallery
- GIVEN the user is viewing an exercise's photos
- WHEN the user chooses "Escolher da galeria" and picks an image
- THEN the image is attached and appears immediately

#### Scenario: A non-image is rejected
- GIVEN the user picks a file that is not a readable image
- WHEN the app tries to attach it
- THEN a clear message is shown and no photo record is created

### Requirement: Downscale Before Storing

Photos MUST be **downscaled and re-encoded before being stored** — a modern phone
photo is several megabytes, and storing originals would exhaust the browser's
storage quota within a few dozen exercises. Each stored image MUST be bounded on
its long edge and re-encoded at a quality sufficient to read a machine's settings.
Images already smaller than the bound MUST NOT be upscaled. The stored image MUST
preserve the photo's **aspect ratio** and its **upright orientation** (a photo
taken in portrait MUST NOT be stored sideways).

#### Scenario: A large photo is reduced
- GIVEN the user captures a 12 MP photo of roughly 6 MB
- WHEN it is attached
- THEN the stored image's long edge is at most the bound (1600px) and it is a few hundred KB
- AND the machine's settings are still legible in it

#### Scenario: A small photo is not upscaled
- GIVEN the user picks an 800×600 image
- WHEN it is attached
- THEN it is stored at 800×600 (never enlarged)

#### Scenario: A rotated photo is stored upright
- GIVEN the user picks a portrait photo whose orientation is recorded in its metadata
- WHEN it is attached
- THEN the stored image renders upright, not sideways

### Requirement: View and Delete Photos

Photos MUST be presented as **thumbnails**, newest first, each openable
**full-size**. The user MUST be able to **delete** any photo, and deletion MUST be
**confirmed** before it takes effect. Deleting a photo MUST NOT affect the
exercise, its target weight, its note, or any session.

#### Scenario: View a photo full-size
- GIVEN `(A, Rosca Direta)` has photos
- WHEN the user taps a thumbnail
- THEN the photo is shown full-size

#### Scenario: Delete a photo
- GIVEN `(A, Rosca Direta)` has two photos
- WHEN the user deletes one and confirms
- THEN only the other remains
- AND the exercise, its target weight and its note are unaffected

#### Scenario: Deletion requires confirmation
- GIVEN the user taps delete on a photo
- WHEN the confirmation is shown and the user declines
- THEN the photo is kept

### Requirement: Photos Are Removed With Their Owner

Deleting a **gym** MUST delete that gym's photos. Deleting an **exercise** MUST
delete that exercise's photos in every gym. Photos are the largest data this app
stores, so orphaned records would waste the user's storage with no way to reach
them.

#### Scenario: Deleting a gym removes its photos
- GIVEN gym "A" has photos on several exercises and gym "B" has its own
- WHEN the user deletes gym "A"
- THEN gym "A"'s photos are removed
- AND gym "B"'s photos are untouched

#### Scenario: Deleting an exercise removes its photos everywhere
- GIVEN "Rosca Direta" has photos in gyms "A" and "B"
- WHEN the user deletes the exercise "Rosca Direta"
- THEN its photos in both gyms are removed

### Requirement: Report Storage Failures

If a photo cannot be stored — most likely because the browser's **storage quota**
is exhausted — the app MUST report it clearly. A photo that appears to attach but
was never persisted MUST NOT be possible.

#### Scenario: Quota exceeded
- GIVEN the browser's storage quota for the app is exhausted
- WHEN the user attaches a photo
- THEN a clear message explains it could not be saved
- AND no partial/broken record is left behind
