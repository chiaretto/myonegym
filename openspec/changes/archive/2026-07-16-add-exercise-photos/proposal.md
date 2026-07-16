# Proposal: Per-Gym Exercise Photos

**Change ID:** `add-exercise-photos`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** An exercise carries a **target weight** and a
  **note** per gym, but nothing visual the user captured themselves. The only
  image an exercise has is `mediaUrl` — a **remote** demo GIF that is the same in
  every gym and is not about *your* setup.
- **Who is affected?** Anyone mid-workout who needs to remember a machine's
  configuration: seat height 4, pin on the 3rd hole, which of the two cable
  towers, the plate layout. That knowledge is **specific to one machine in one
  gym** and is painful to write in prose — a photo says it instantly.
- **What's the current pain point?** The user photographs the machine with the
  phone's camera app, and the photo is then lost in a camera roll of thousands,
  disconnected from the exercise. There is no way to attach it where it is needed.

## Proposed Solution

Add **photos as a third durable per-gym attribute**, alongside the target weight
and the note — keyed the same way, `(gymId, exerciseId)` — surfaced as a **"Foto"**
tab beside "Observações" on **both** places the note already appears: the
in-session entry detail and the catalog exercise detail.

**Storage: the photo bytes live in IndexedDB** — no server, consistent with the
app's local-only model. (Planned as a `Blob`; shipped as `bytes: ArrayBuffer` +
`type` — see Implementation Notes.) Capture uses a plain
`<input type="file" accept="image/*">`, twice: with `capture="environment"` for
**Tirar foto** and without it for **Escolher da galeria**.

**Every photo is downscaled before it is stored.** A modern phone photo is 3–12 MB;
storing that raw would blow through the origin's storage quota within a couple of
dozen exercises. Each image is drawn to a canvas capped at **1600px on the long
edge** and re-encoded as **JPEG q0.8** (~200–400 KB), which is far more than
enough to read a seat number.

### Decisions taken (from review)
1. **Many photos per `(gym, exercise)`**, not one — a gallery, so several angles
   (or the same machine over time) can coexist. Ordered newest first.
2. **Photos are device-local and NOT exported** in the backup JSON. See Risks —
   this is the one decision with a real user-facing cost.
3. **The Foto tab appears in both places** (session entry detail + catalog
   exercise detail), mirroring Observações exactly. Hiding it in the catalog
   would be a strange asymmetry when the note is right there.

## Scope

### In Scope
- New `exercisePhotos` table (Dexie **v5**), many per `(gymId, exerciseId)`.
- Downscale-and-re-encode pipeline before persisting.
- **Foto** tab on `SessionEntryPage` **and** `ExerciseDetailPage`.
- **Tirar foto** (camera) and **Escolher da galeria** (picker).
- Thumbnail grid, tap to view full-size, delete (with confirmation).
- **Cascade deletes**: removing a gym or an exercise removes its photos.
- Photos excluded from `exportBackup`; cleared by import/reset like sessions.
- A visible note on the Backup screen that photos are **not** in the backup.

### Out of Scope
- **Using a photo as the exercise's thumbnail / `mediaUrl` replacement.** The
  demo GIF and the user's machine photo are different things. (Tempting follow-up:
  a local photo would sidestep the CORS problem that puts placeholders on the
  share card — see `share-session-image`. Not now.)
- **Photos on the shared session image** — the card keeps using `mediaUrl`.
- Editing/cropping/annotating, captions, reordering, zoom/pan in the viewer.
- Syncing or uploading photos anywhere.
- Migrating photos into the backup later (would need a non-JSON container).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | **Yes** | Dexie **v5**: `exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt'`. Additive; no upgrade function needed. |
| Data layer | **Yes** | `repos.ts`: `listPhotos`, `addPhoto`, `deletePhoto`; **cascade** in `deleteGym` + `deleteExercise`; `allTables` gains the store (so import/reset clear it). |
| Portability | **Yes** | `exportBackup` must **not** emit photos; `BackupDoc` unchanged; the Backup screen states the exclusion. |
| State | No | `useLiveQuery` hook (`usePhotos`), like `useNote`. No store. |
| UI | **Yes** | New `PhotoTab` component; a tab added on `SessionEntryPage` and `ExerciseDetailPage`; new CSS for the grid + viewer (reuses `Sheet`). |
| Deps | **No** | Canvas downscaling + file input are built in. |
| Tests | **Yes** | Repo/cascade tests, a pure `fitDimensions` test, integration for the tab. |
| i18n / copy | Yes (small) | pt-BR labels, toasts, empty states. |

## Architecture Considerations

- **Third sibling of an established pattern.** `weights`, `exerciseNotes` and now
  `exercisePhotos` are all keyed by `(gymId, exerciseId)`; the only difference is
  cardinality — photos are **many** per pair, so the index is
  `[gymId+exerciseId]` (non-unique) rather than `&[gymId+exerciseId]`.
- **Raw bytes, not base64.** IndexedDB's structured clone stores bytes directly;
  base64 would inflate the same data ~33% and cost a conversion on every read.
  (Shipped as `ArrayBuffer` rather than `Blob` — see Implementation Notes.) The
  UI wraps them in a Blob for `URL.createObjectURL` and **must revoke** on
  unmount, or a long session leaks blob URLs.
- **Device-local, like the history log and sessions.** `allTables` already drives
  both `resetAll` and the clear step of `importBackupReplaceAll`, so adding the
  store there gets the right behaviour for free: an import wipes photos exactly as
  it wipes sessions.
- **Storage pressure is new.** `requestPersistentStorage()` is already called on
  boot (`main.tsx`), which matters far more now: without the persistent grant, a
  browser under pressure may evict the origin — and photos are the only data the
  user cannot get back from a backup. Worth surfacing `navigator.storage.estimate()`
  on the Backup screen (**noted, not in scope**).
- **Downscaling reuses the canvas skill** from `share-session-image`: draw to a
  sized canvas, `toBlob('image/jpeg', 0.8)`. Same jsdom limitation — no 2D
  context — so the **arithmetic** (`fitDimensions`) is a pure, unit-tested
  function and the pixel work is verified in a real browser.

## Success Criteria

- [x] A "Foto" tab sits beside "Observações" on both the session entry detail and the catalog exercise detail.
- [~] **Tirar foto** opens the camera on a phone; **Escolher da galeria** opens the picker. — wiring verified; the iOS `capture` behaviour needs a real device (task 5.6).
- [x] A captured photo appears in the grid immediately and is still there after a reload.
- [x] Photos are per `(gym, exercise)`: the same exercise shows different photos in gym "A" and gym "B".
- [x] Several photos can coexist for one pair, newest first; each can be deleted with a confirmation.
- [x] A 12 MP camera photo is stored at ≤ ~400 KB with the long edge ≤ 1600px, still legible. — 6.3 MB → **209 KB** at 1600×1200 (see the size caveat in the notes).
- [x] Deleting a gym or an exercise removes its photos (no orphans).
- [x] `exportBackup` output contains no photo bytes and stays ~the same size; the Backup screen says photos aren't included.
- [x] Blob URLs are revoked — no leak across tab switches.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Photos are lost on restore** — they're outside the backup, so a new device starts with none, and unlike sessions these are irreplaceable user content | **High** | **High** | An explicit, visible note on the Backup screen (a silent loss would be a betrayal). Revisit with a real container format (zip) if users ask. |
| **Storage quota exhausted / origin evicted** | Med | **High** | Downscale hard (1600px/q0.8); `requestPersistentStorage()` already runs at boot; surface a clear error if a write fails rather than a silent drop. |
| Blob URL leak (created per render, never revoked) | **High** | Med | Create in an effect keyed on the photo id; revoke on cleanup. Called out in the tasks. |
| iOS Safari `capture="environment"` ignored / opens the picker | Med | Low | Both buttons remain functional; the worst case is that "Tirar foto" also shows the picker. Verify on a real device. |
| Huge photo (48 MP) OOMs the decode on a low-end phone | Low | Med | `createImageBitmap` where available (decodes off the main thread) with an `<img>` fallback; cap and fail with a message, never a blank tab. |
| EXIF rotation lost → sideways photos | **Med** | Med | Canvas re-encode drops EXIF orientation. `createImageBitmap(blob, { imageOrientation: 'from-image' })` honours it; verify with a real phone photo. |
| jsdom can't test the canvas encode | High | Low | Keep the maths pure (`fitDimensions`) and unit-test it; verify pixels in a real browser, as in `share-session-image`. |

---

## Implementation Notes (what the build changed)

Three corrections, all forced by evidence rather than by review:

1. **Bytes, not `Blob`.** The plan said store a `Blob`. A probe showed
   fake-indexeddb's structured clone silently drops a Blob's contents (it
   round-trips to `{}`), which would have left the whole data layer untestable —
   and Blob-in-IndexedDB has a long history of Safari bugs, a poor bet for an
   installable PWA. The record now holds `bytes: ArrayBuffer` + `type`; the UI
   rebuilds a Blob to display. Verified: bytes survive intact.
2. **`listPhotos` breaks `createdAt` ties by id.** Two photos attached in the
   same millisecond would otherwise return in unstable order. Found while writing
   the ordering test.
3. **`deleteExercise` needed Dexie's array transaction form** — the typed
   overloads stop at 5 tables, and the 6th failed only at `tsc`, not at runtime.

**The EXIF risk was real.** A forged `Orientation=6` JPEG (600x200 landscape on
disk) stored as **200x600 portrait** — proving `imageOrientation: 'from-image'`
does the work. Without it every portrait photo would be stored sideways, and no
test in this suite would have caught it.

**Verification, and its limits.** `downscalePhoto` has **no unit coverage** —
jsdom can neither decode nor encode an image — so it was run in headless Chromium
against the dev server: a 6.3 MB 12 MP frame -> 209 KB at 1600x1200 in 119 ms;
blob URLs proven not to leak (outstanding pinned at 2 across 8 tab round-trips);
the cascade proven in the real app (1 photo -> 0 after deleting the exercise).
Re-run it that way after touching the pipeline; `npm test` will not catch a
regression there.

Two things remain **unverified and need hardware** (task 5.6): whether
`capture="environment"` opens the camera on iOS Safari, and whether
`requestPersistentStorage()` is granted for an installed PWA. The second matters
more than it looks — photos are the only data a backup cannot restore, so without
that grant a browser under storage pressure could evict them for good.

**A note on the size target.** The <=400 KB success criterion holds for realistic
photos (209 KB from a structured 6.3 MB frame), but pure random noise — maximum
JPEG entropy, which no camera produces — reaches ~600 KB. The hard guarantee is
the 1600px dimension cap, not a byte ceiling.

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created, implemented and archived 2026-07-16)
**Outcome:** Successfully implemented — with one verification deferred to hardware (see below)

### Files Modified
- `src/db/types.ts` — **new** `ExercisePhoto` (`bytes: ArrayBuffer` + `type`, not a Blob)
- `src/db/db.ts` — Dexie **v5** `exercisePhotos` store (non-unique
  `[gymId+exerciseId]`); added to `allTables()` so import/reset clear it
- `src/db/repos.ts` — `listPhotos` / `addPhoto` / `deletePhoto`; photo cascade in
  `deleteGym` and `deleteExercise` (the latter moved to Dexie's array
  transaction form — the typed overloads stop at 5 tables)
- `src/features/exercise/photo/fitDimensions.ts` — **new**, pure long-edge cap
- `src/features/exercise/photo/downscale.ts` — **new**, EXIF-aware decode →
  1600px → JPEG q0.8
- `src/features/exercise/photo/PhotoTab.tsx` — **new**, grid + camera/gallery +
  viewer + delete; blob URLs revoked on unmount
- `src/features/exercise/ExerciseDetailPage.tsx`, `src/features/session/SessionEntryPage.tsx` — the **Foto** tab
- `src/lib/hooks.ts` — `usePhotos`
- `src/data/portability.ts` — comment: photos join the device-local exclusions
- `src/features/settings/DataPage.tsx` — states that photos aren't in the backup
- `src/styles/global.css` — photo grid / thumb / viewer, `.group-note`
- `README.md` — the Foto tab and the not-in-backup caveat
- Tests (**+26**): `src/db/repos.test.ts` (9), `fitDimensions.test.ts` (9),
  `src/data/portability.test.ts` (3), `photo.integration.test.tsx` (6)

**No new dependencies** — `package.json` untouched.

### Specs Updated
- `openspec/specs/exercise-photos/spec.md` — **new capability** (6 requirements,
  16 scenarios)
- `openspec/specs/workout-sessions/spec.md` — *Session Exercise Detail* modified:
  the **Foto** tab, and photos stay editable on a completed session
- `openspec/specs/exercises/spec.md` — *Exercise Note on the Catalog Detail*
  **renamed** to *Exercise Note and Photos on the Catalog Detail* and modified
  (replaced in place — appending would have duplicated it)
- `openspec/specs/data-portability/spec.md` — *Export Full Backup JSON* and
  *Import JSON (Replace All)* modified: photos are device-local, never exported,
  and erased by an import

### Verification
- `npm test` (178/178), `npm run typecheck`, `npm run build` — all pass
- Real-browser pass (headless Chromium against the dev server), because
  `downscalePhoto` has no unit coverage — jsdom can neither decode nor encode an
  image: 6.3 MB 12 MP frame → **209 KB at 1600x1200 in 119 ms**; a forged
  `Orientation=6` JPEG stored **upright** (200x600, not 600x200); non-image
  rejected; **no blob-URL leak** (outstanding pinned at 2 across 8 tab
  round-trips); cascade proven in the app (1 photo → 0 after deleting the
  exercise); tab bar neither clips nor wraps at font-scale 1.0/1.5/2.0

### Open follow-up (task 5.6 — needs a real device)
Archived with this deliberately unchecked; it cannot be done from a dev machine:
1. whether `capture="environment"` opens the camera on **iOS Safari** rather than
   falling back to the picker;
2. **EXIF from a real camera sensor** (the test forged the tag);
3. whether **`requestPersistentStorage()` is granted** for an installed PWA — it
   returned `false` in headless Chromium. This one carries weight: photos are the
   only data a backup cannot restore, so without the grant a browser under storage
   pressure could evict them permanently.
