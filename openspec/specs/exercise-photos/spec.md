# exercise-photos Specification

## Purpose
Attach durable **photos** to an exercise **within a gym** — many per
`(gymId, exerciseId)`, keyed like a target weight or a note. Photos capture what
prose cannot: the machine's own setup in *that* gym (seat height, pin position,
plate layout). They are distinct from `Exercise.mediaUrl`, the remote demo image
that is identical in every gym. Photos persist across workout sessions and are
shared between the in-session entry detail and the catalog exercise detail.
Each image is a **file** in the origin's private file system; the database record
holds the metadata and points at it. Photos are part of the full **backup**
(base64-encoded into the backup JSON) and are restored by an import (see the
`data-portability` spec).

## Requirements

### Requirement: Persist Per-Gym Exercise Photos

The app MUST let each exercise carry **photos scoped to a gym**. Photo records are
keyed by `(gymId, exerciseId)` — like a target weight or a note — but unlike those,
a pair MAY hold **many** photos. Each record stores **where its image lives**, the
image's **mime type**, its **dimensions**, its **stored size in bytes**, and a
**creation timestamp**.

Photos MUST be **durable**: independent of any workout session, persisting until
deleted. The **active gym** determines which photos are shown. Photos MUST be
**isolated per gym** — the same exercise may carry different photos (or none) in
different gyms, because the machine being photographed is a different machine.

The image MUST be stored **inside the app** (local storage, no upload, no server).
Concretely, the image bytes MUST be written as a **file in the origin's private
file system** (OPFS), and the record in the database MUST hold **only the
metadata plus a reference to that file** — not the bytes themselves. The file is
sandboxed to the app's origin: it is not visible in the device's photo gallery,
is not shared with other sites, and never leaves the device.

Listing an exercise's photos MUST NOT require loading their image bytes: the
records answer "which photos exist", and each image is read only when it is
actually displayed.

#### Scenario: Attach a photo for the active gym
- GIVEN gym "A" is active and "Rosca Direta" has no photos
- WHEN the user attaches a photo to "Rosca Direta"
- THEN the image is written as a file in the app's private file system
- AND a photo record for `(A, Rosca Direta)` is persisted with a reference to that
  file, its mime type, dimensions and size — and **without** the image bytes
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

#### Scenario: Listing photos does not load the images
- GIVEN `(A, Leg Press)` has four photos
- WHEN the app lists that pair's photos
- THEN the records come back without their image bytes
- AND each image is read from its file only when it is rendered

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
its long edge (**1280px**) and re-encoded at a quality sufficient to read a
machine's settings. Images already smaller than the bound MUST NOT be upscaled.
The stored image MUST preserve the photo's **aspect ratio** and its **upright
orientation** (a photo taken in portrait MUST NOT be stored sideways).

The re-encoding MUST stay in a format every target browser can produce —
**JPEG**. A newer codec was considered and rejected: a browser that cannot encode
the requested type does **not** fail, it silently returns another format
(typically PNG, *larger* than the JPEG it replaced), so the gain would cost a
verification-and-retry step on every capture for a format the app does not need.
The record MUST store the image's **real** mime type.

#### Scenario: A large photo is reduced
- GIVEN the user captures a 12 MP photo of roughly 6 MB
- WHEN it is attached
- THEN the stored image's long edge is at most 1280px and it is a few hundred KB
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

Deleting a photo MUST delete **both** its record and its image file. Since the two
live in different stores, the record MUST be deleted first and the file after: a
file left behind is recoverable garbage (see the orphan sweep), whereas a record
left pointing at a deleted file is a visibly broken photo.

#### Scenario: Deleting a gym removes its photos
- GIVEN gym "A" has photos on several exercises and gym "B" has its own
- WHEN the user deletes gym "A"
- THEN gym "A"'s photo records **and their image files** are removed
- AND gym "B"'s photos are untouched

#### Scenario: Deleting an exercise removes its photos everywhere
- GIVEN "Rosca Direta" has photos in gyms "A" and "B"
- WHEN the user deletes the exercise "Rosca Direta"
- THEN its photo records and image files in both gyms are removed

#### Scenario: Deleting one photo frees its disk space
- GIVEN `(A, Leg Press)` has two photos
- WHEN the user deletes one and confirms
- THEN that photo's image file no longer exists
- AND the other photo's file is untouched

---

### Requirement: Report Storage Failures

The app MUST clearly report a photo it could not store — most likely because the
device's **storage quota** is exhausted. A photo that appears to attach but
was never persisted MUST NOT be possible, and a failure MUST NOT leave a
half-written file or a record pointing at nothing.

Because the file and its record are written in **two steps** that no single
transaction covers, the order MUST be: write the file first, then create the
record. If the record cannot be created, the file MUST be removed.

#### Scenario: Quota exceeded
- GIVEN the device's storage quota for the app is exhausted
- WHEN the user attaches a photo
- THEN a clear message explains it could not be saved
- AND no partial/broken record is left behind

#### Scenario: The record fails after the file was written
- GIVEN the image file was written successfully
- WHEN persisting its record fails
- THEN a clear message is shown
- AND the orphaned file is removed

#### Scenario: A photo whose file is missing
- GIVEN a photo record whose image file no longer exists (the user cleared the
  site's storage)
- WHEN the user opens that exercise's photos
- THEN the app shows that this image could not be read
- AND the record is NOT silently deleted, and the other photos still display

### Requirement: Existing Photos Migrate to File Storage

Photos attached **before** this change MUST keep working and MUST be moved to
file storage **without any action from the user** — asking someone to migrate
their own photos is not an option in an offline app with no account. Their bytes
live inside the database record.

The migration MUST run in the background, MUST be **idempotent** (safe to run on
every launch), and MUST proceed **one photo at a time** so that an interruption
leaves every other photo intact. A photo that fails to migrate MUST remain
readable in its original form; migration MUST NOT be a precondition for viewing.
Migration MUST NOT re-compress the image — it moves bytes, it does not change
them.

#### Scenario: A legacy photo is migrated on launch
- GIVEN a photo stored before this change, with its bytes in the database
- WHEN the app launches
- THEN its bytes are written to a file, its record starts referencing that file,
  and the in-record bytes are dropped
- AND the photo still displays, unchanged

#### Scenario: A legacy photo displays even before migrating
- GIVEN a legacy photo that has not been migrated yet
- WHEN the user opens its exercise
- THEN the photo displays normally, read from the record

#### Scenario: Migration is interrupted
- GIVEN three legacy photos and the app is closed after the first is migrated
- WHEN the app launches again
- THEN the already-migrated photo is left alone and the remaining two are migrated
- AND no photo is duplicated or lost

### Requirement: No Orphan Image Files

The app MUST **sweep orphaned image files** at launch: any file in its photo
storage that no photo record references MUST be deleted. An image file whose
record is gone is invisible to the user and unreachable by the app, yet it keeps
occupying the device's storage forever — and because a record and its file are
deleted in two steps, a crash between them produces exactly that. The sweep MUST
never delete a *record* — records are the source of truth, files are derived.
Erasing all app data (reset or a backup import) MUST also clear the photo files,
not only the records.

#### Scenario: An orphan file is swept
- GIVEN an image file that no photo record references
- WHEN the app launches
- THEN that file is deleted
- AND every file that a record does reference is kept

#### Scenario: Reset erases the image files too
- GIVEN the user has photos and confirms "Apagar tudo"
- WHEN the reset completes
- THEN both the photo records and their image files are gone

### Requirement: Devices Without File Storage Still Work

On a device whose browser offers no writable private file system, photos MUST
keep working **exactly as they do today**: the bytes are stored in the database
record, and every screen behaves the same. Not every browser has one — an older
browser may lack it entirely, and some versions expose it in a form that cannot
be written from the app's main thread.

The choice MUST be made **per write**, by attempting it — not by a global
capability flag decided at launch — and each record MUST describe where its own
image lives, so records of both kinds can coexist in the same database and be
read without special cases at the call site.

A storage-quota failure MUST NOT be treated as "file storage unavailable": a full
disk is full on both paths, and MUST be reported to the user (see *Report Storage
Failures*) rather than silently retried into the database.

#### Scenario: A browser without the private file system
- GIVEN a browser that does not offer a writable private file system
- WHEN the user attaches a photo
- THEN its bytes are stored in the record, as before
- AND the photo displays, is listed and is deleted normally

#### Scenario: Both kinds of record coexist
- GIVEN one photo stored as a file and another stored in its record
- WHEN the user opens the exercise
- THEN both photos display

#### Scenario: A full disk is reported, not worked around
- GIVEN the device's storage quota is exhausted
- WHEN the file write fails for that reason
- THEN the failure is reported to the user
- AND the app does NOT fall back to storing the bytes in the record

---
