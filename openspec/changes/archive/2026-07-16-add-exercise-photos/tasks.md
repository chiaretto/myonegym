# Implementation Tasks: Per-Gym Exercise Photos

**Change ID:** `add-exercise-photos`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 `src/db/types.ts`: `ExercisePhoto { id?, gymId, exerciseId, bytes:
      ArrayBuffer, type, width, height, createdAt }`. **Changed from the plan:**
      stores `bytes + type`, **not a `Blob`**. A probe showed fake-indexeddb's
      structured clone silently drops a Blob's contents (round-trips to `{}`),
      which would leave this layer untestable — and Blob-in-IndexedDB has a long
      history of Safari bugs, a poor bet for an installable PWA. ArrayBuffer
      round-trips intact and is verifiable. Base64 still rejected (+33%). ✓
- [x] 1.2 `src/db/db.ts`: Dexie **v5**, additive:
      `exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt'`
      — index **non-unique**, a pair holds many photos. ✓
- [x] 1.3 `src/db/db.ts`: added to `allTables()` → import/reset clear photos. ✓
- [x] 1.4 `src/db/repos.ts`: `listPhotos` (newest first), `addPhoto`,
      `deletePhoto`. ✓
- [x] 1.5 `src/db/repos.ts`: cascade in `deleteGym` + `deleteExercise`.
      `deleteExercise` needed Dexie's **array** transaction form — its typed
      overloads stop at 5 tables, and the 6th only failed at `tsc`, not runtime. ✓
- [x] 1.6 Tests in `src/db/repos.test.ts` (9 new): byte round-trip, many-per-pair
      ordering (+ id tie-break), explicit-timestamp ordering, per-gym isolation,
      single delete, delete leaves weight/note alone, both cascades. ✓
- [x] 1.7 (added) `listPhotos` breaks `createdAt` ties by **id** — two photos
      attached in the same millisecond would otherwise return in unstable order.
      Found while writing the ordering test. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Data-layer tests pass — 38/38 in `repos.test.ts`

**Note:** `vi.useFakeTimers()` **deadlocks Dexie** (its promise scheduler runs on
timers) — the first ordering test hung the runner for 120s. Don't reach for fake
timers in this suite; use explicit `createdAt` values instead.

---

## Phase 2: Business Logic (Downscale Pipeline)

- [x] 2.1 `src/features/exercise/photo/fitDimensions.ts`: **pure**
      `fitDimensions(w, h, max)` → `{ width, height }` capping the long edge,
      never upscaling, preserving aspect ratio (round to integers). This is the
      only unit-testable part of the pipeline — jsdom has no 2D context.
- [x] 2.2 `src/features/exercise/photo/downscale.ts`:
      `downscalePhoto(file): Promise<{ blob, width, height }>` — decode via
      `createImageBitmap(file, { imageOrientation: 'from-image' })` (honours EXIF
      rotation; a plain canvas re-encode would **drop** it and store sideways
      photos) with an `<img>` fallback where unsupported; draw at
      `fitDimensions(..., 1600)`; `toBlob('image/jpeg', 0.8)`.
- [x] 2.3 Reject non-images and surface a clear error if decode/encode fails —
      never persist a broken record, never fail silently.
- [x] 2.4 Tests for `fitDimensions` (9): landscape, portrait, square,
      already-small (no upscale), exact-max, aspect preservation on a real 12 MP
      frame, extreme panorama (short edge clamped to >= 1px), custom bound,
      invalid input. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `fitDimensions` tests pass — 9/9

---

## Phase 3: User Interface

- [x] 3.1 `src/lib/hooks.ts`: `usePhotos(gymId, exerciseId)` via `useLiveQuery`,
      mirroring `useNote`.
- [x] 3.2 `src/features/exercise/photo/PhotoTab.tsx`: thumbnail grid (newest
      first), **Tirar foto** (`<input type="file" accept="image/*"
      capture="environment">`) and **Escolher da galeria** (same input, no
      `capture`), tap a thumb to view it full-size in a `Sheet`, delete with
      `useConfirm`. Empty/disabled states mirroring `NoteEditor`: no active gym →
      prompt to pick one; `exerciseId == null` (deleted source exercise) → cannot
      attach.
- [x] 3.3 **Blob URLs**: create in an effect keyed on the photo id and **revoke on
      cleanup**. Creating them inline during render leaks one URL per render — a
      long session would pin every photo in memory.
- [x] 3.4 `SessionEntryPage.tsx`: add `{ id: 'photo', label: 'Foto' }` to the
      `Tabs` and render `PhotoTab`. Photos stay **editable on a completed
      session** — unlike the weight editor, which goes read-only; a photo is a
      durable per-gym fact, not a record of that session (mirrors the note).
- [x] 3.5 `ExerciseDetailPage.tsx`: same tab + panel.
- [x] 3.6 `src/features/exercise/exercise.css`: grid, thumb, viewer, actions —
      following the Momentum tokens already in the file.
- [x] 3.7 A `busy` state while a photo is being processed (a 12 MP decode is not
      instant); disable the buttons so a double-tap can't double-insert.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Portability & Storage

- [x] 4.1 Verify `exportBackup` emits **no** photos (it builds `BackupDoc`
      field-by-field, so this should hold by construction — assert it in a test
      rather than assume).
- [x] 4.2 Confirm import/reset clear photos via `allTables` (test it).
- [x] 4.3 `DataPage.tsx`: state plainly that photos are **not** included in the
      backup. They are the only user-created content that a restore cannot bring
      back — a silent loss would be a betrayal.
- [x] 4.4 Surface a clear error when a write fails (quota exceeded) instead of a
      silently dropped photo.

**Quality Gate:** PASSED
- [x] Portability tests pass — 18/18, incl. a test that 180 KB of photos moves
      the exported JSON by < 1 KB

---

## Phase 5: Integration & Polish

- [x] 5.1 Integration test: attach a photo (stubbed `downscalePhoto`) from the
      session entry detail → it appears in the grid → delete it. Per-gym
      isolation through the UI.
- [x] 5.2 **Real-browser pass** (headless Chromium against the dev server — jsdom
      can neither decode nor encode an image, so this is the only place the
      pipeline actually runs):
      - **12 MP frame** (4032×3024, 6.3 MB) → stored **209 KB, 1600×1200**, 30×
        smaller, 119 ms, aspect preserved. A small 800×600 image stayed 800×600
        (not upscaled).
      - **EXIF honoured**: forged an APP1 segment with `Orientation=6` onto a
        600×200 landscape JPEG (canvas can't emit EXIF) → stored **200×600
        portrait**, with the red band moved from left to top. Without
        `imageOrientation: 'from-image'` this photo would be stored sideways.
      - **Non-image rejected** with the pt-BR message; nothing persisted.
      - **No blob-URL leak**: instrumented `createObjectURL`/`revokeObjectURL` in
        the real app — after 8 tab round-trips, 36 created / 34 revoked, with
        **outstanding pinned at 2** (one per visible thumbnail).
      - **Tab bar** measured at font-scale 1.0 / 1.5 / 2.0: a third tab neither
        clips nor wraps (equal button heights at every scale); tight but readable
        at the 2.0 maximum.
      - **Size caveat, honestly:** the ≤400 KB target holds for realistic photos
        (a structured 6.3 MB frame → 209 KB; a flat synthetic one → 24 KB), but
        **pure random noise** — maximum JPEG entropy, which no camera produces —
        lands near 600 KB. The hard guarantee is the 1600px dimension cap, not a
        byte ceiling.
- [x] 5.3 Verify cascade in the real app: delete an exercise → its photos are gone
      from IndexedDB (check via `db.exercisePhotos.count()`).
- [x] 5.4 `navigator.storage.estimate()` in the real app: 3 attached photos grew
      the origin by ~1.8 MB (worst-case noise sources), i.e. the footprint tracks
      the stored bytes with no surprise overhead. **`navigator.storage.persisted()`
      returned `false`** in headless Chromium — expected without user engagement,
      but it means the persistent-storage grant that protects photos from eviction
      is **unverified here**; it needs a real installed PWA (see 5.6).
- [x] 5.5 `README.md`: document the Foto tab, per-gym scoping, and the
      **not-in-backup** caveat.
- [ ] 5.6 **Open — needs a real phone (cannot be done from here).** Desktop
      Chromium was driven at 390px, but three things only a device can answer:
      (a) whether `capture="environment"` actually opens the camera on iOS
      Safari rather than falling back to the picker; (b) EXIF from a real camera
      sensor (the test used a forged tag); (c) whether
      `requestPersistentStorage()` is granted for an installed PWA — see 5.4.

**Quality Gate:** PASSED (except 5.6, which needs hardware)
- [x] All tests pass — 178/178
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
