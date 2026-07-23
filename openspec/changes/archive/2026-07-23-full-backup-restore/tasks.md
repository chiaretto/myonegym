# Implementation Tasks: Full Backup & Restore

**Change ID:** `full-backup-restore`

---

## Phase 1: base64 codec (pure, the risky bit)

- [x] 1.1 `src/data/base64.ts`: `bytesToBase64(buf: ArrayBuffer): string` and
      `base64ToBytes(s: string): ArrayBuffer`. **Chunked** —
      `btoa(String.fromCharCode(...new Uint8Array(buf)))` throws
      `RangeError: Maximum call stack size exceeded` on a real photo. Process in
      fixed chunks (e.g. 0x8000 bytes) via `btoa`/`atob`.
- [x] 1.2 Tests in `src/data/base64.test.ts`: empty buffer; a few known bytes with
      a known base64 string; **a buffer large enough to overflow the naïve
      path** (e.g. 1 MB of pseudo-random bytes) round-trips **byte-for-byte**;
      non-multiple-of-3 lengths (padding) survive.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] base64 codec tests pass — 5/5. **Mutation-checked**: flipping to the naïve
      `btoa(String.fromCharCode(...bytes))` makes the 1 MB test fail with
      `RangeError: Maximum call stack size exceeded`, so the test really guards
      the overflow.

---

## Phase 2: Data Layer (export / parse / import)

- [x] 2.1 `src/data/portability.ts`: `SCHEMA_VERSION` 3 → 4.
- [x] 2.2 `BackupDoc` gains `weightHistory`, `sessions`, `sessionEntries`,
      `exercisePhotos` (photos as `{ ...meta, bytes: string /* base64 */ }`).
      Introduce a serialized photo type so the on-disk shape (base64 string) is
      distinct from the in-DB shape (`ArrayBuffer`).
- [x] 2.3 `exportBackup`: read all ten tables; map each `ExercisePhoto.bytes`
      (`ArrayBuffer`) → base64 string. Keep every other field verbatim (ids,
      timestamps, done states).
- [x] 2.4 `parseBackup`: require the core arrays as today; **default**
      `weightHistory`/`sessions`/`sessionEntries`/`exerciseNotes`/`exercisePhotos`
      to `[]` when absent (old backups); reject non-arrays with a clear message;
      keep rejecting non-`kind:'backup'` files.
- [x] 2.5 `importBackupReplaceAll`: after the existing clear, `bulkAdd` all ten
      tables **with original ids**; decode each photo's base64 → `ArrayBuffer`
      before insert. Order stays dependency-safe (`allTables` order).
- [x] 2.6 Update the file's header comments — they currently say sessions/history/
      photos are device-local and NOT exported; that is now false.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Data-layer tests pass

---

## Phase 3: Round-trip & compatibility tests

- [x] 3.1 `src/data/portability.test.ts`: **full-fidelity round-trip** — seed
      gyms/categories/exercises/days/weights/**history**/**a completed session +
      entries**/notes/**a photo**; export; wipe every table; import; assert every
      table restored, done states intact, history intact, and the photo's
      `bytes`/`type`/dims **byte-for-byte** equal (compare via a Uint8Array).
- [x] 3.2 Preserve-ids test: a `sessionEntry.sessionId` still points at the right
      restored `session`; a `photo.exerciseId` at the right exercise.
- [x] 3.3 Forward-compat: a v3 backup (object with **no** `sessions`/`photos`/
      `weightHistory` keys) imports cleanly → those tables empty, the rest restored.
- [x] 3.4 Update/replace the now-obsolete tests that assert sessions/photos are
      **excluded** (`backup excludes workout sessions`, `exercise photos are
      device-local`) — invert them to assert **inclusion** and round-trip.
- [x] 3.5 Reject-non-backup and malformed-JSON tests stay green (unchanged
      behaviour).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] All portability tests pass — 21/21, incl. the full-snapshot round-trip that
      compares every table's count before/after and a photo byte-for-byte, plus
      the pre-v4 forward-compat import

---

## Phase 4: UI copy + serialization

- [x] 4.1 `src/features/settings/DataPage.tsx`: export row sub-text → the backup
      now includes **everything** (weights, notes, sessions, history, photos);
      **remove** the `group-note` saying photos are excluded.
- [x] 4.2 `download()` for the backup: serialize **compact** (`JSON.stringify(doc)`
      — no `, null, 2`) to avoid megabytes of whitespace. (A pretty export is not
      a goal; the file can be large.)
- [x] 4.3 Keep the import **danger confirmation**; its copy already says
      "substitui TODOS os dados … inclusive as fotos" — verify it still fits.
- [x] 4.4 `busy`/disabled state around export as well as import, so a large
      backup can't be double-triggered; toast on completion (already present).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component/data integration test for the Data screen passes

---

## Phase 5: Integration & Polish

- [x] 5.1 Integration test (`data.integration.test.tsx` or similar): drive the
      Data screen — export, then import the produced file, confirm the dialog,
      and assert the restore (mock the download to capture the blob text).
- [x] 5.2 **Real-browser pass** (headless Chromium against the dev server — jsdom
      can't show memory/perf):
      - **Realistic** dataset (30 structured ~49 KB JPEGs, the example routine, a
        session): backup **2.0 MB**; full export→JSON→parse→wipe→restore with all
        30 photos back, **no errors**.
      - **Worst case** (30 pure-noise 1 MB JPEGs — max JPEG entropy, which no
        camera produces): backup **43.5 MB**; still round-trips byte-perfect. Build
        783 ms · stringify 50 ms · parse 25 ms · restore 244 ms on desktop —
        several× slower on a low-end phone but workable. The size is entirely
        photo-driven; a photo-less backup stays tiny.
      - This confirms the ~400 KB/photo cap from `add-exercise-photos` is what
        keeps backups sane, and that the honest typical size is a couple of MB.
- [x] 5.3 `README.md`: the backup is now a **complete** snapshot (all data incl.
      sessions, history, photos) and import is a full **restore**; note the file
      can be large because photos are embedded.
- [x] 5.5 (added) **`Blob.prototype.text`/`arrayBuffer` polyfill in
      `vitest.setup.ts`.** jsdom's Blob/File have neither, and the import path
      does `await file.text()` — so the whole import UI was untestable. All target
      browsers have them (Safari 14+); the polyfill reads through jsdom's own
      FileReader. Environment gap, beside the `ResizeObserver` one.
- [x] 5.4 Sanity: `resetAll` still clears everything (unchanged), and
      `generateExample` is unaffected.

**Quality Gate:** PASSED
- [x] All tests pass — 205/205 (195 before + 10 new)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
