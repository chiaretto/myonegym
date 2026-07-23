# Proposal: Full Backup & Restore (everything, including photos)

**Change ID:** `full-backup-restore`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** The backup is **not a backup**. It exports
  gyms, categories, exercises, days, current weights and notes — but deliberately
  **omits** the weight-change history, every workout session, and all exercise
  photos. A user who reinstalls the PWA, clears their browser, or switches phones
  and imports their "backup" **loses their entire training history and every
  photo they took**, silently.
- **Who is affected?** Everyone who relies on the export as a safety net —
  precisely the people the feature is for.
- **What's the current pain point?** A PWA's IndexedDB is **fragile**: it can be
  evicted under storage pressure, wiped by "clear site data", or lost when the
  user moves devices. The whole reason to have an export is to survive that — and
  today it doesn't. The three most irreplaceable things a user creates (their
  logged sessions, their weight progression, their machine photos) are exactly
  what the current backup throws away.

This reverses two earlier decisions (`remove-exercises-share`,
`add-exercise-photos`) that made sessions/history/photos device-local. Those were
right **for their scope** — a share/portability convenience should stay light.
But a **backup meant to survive data loss must be complete**, or it is a false
promise. Completeness now outranks file size.

## Proposed Solution

Make the backup a **true full snapshot** of the database — **all ten tables** —
and make import a **full restore** that reproduces the device exactly.

- **Export** every table: gyms, categories, exercises, days, weights,
  **weightHistory**, **sessions**, **sessionEntries**, exerciseNotes, and
  **exercisePhotos**.
- **Photos** (binary `ArrayBuffer`) are **base64-encoded** into the JSON —
  confirmed with the user over a ZIP, for a single self-contained file with **no
  new dependency**, inspectable and restorable years later with no special tool.
- **Import** = **replace-all restore** (the established behaviour): clear every
  table, then insert the backup's rows **with their original ids**, so every
  foreign key (`weight.gymId`, `sessionEntry.sessionId`, `photo.exerciseId`, …)
  lines up and the restored device is byte-identical to the source.
- **Backward compatible**: an older backup (no `sessions`/`photos`/`weightHistory`
  arrays) still imports cleanly, restoring zero of those — same graceful defaulting
  the code already does for `exerciseNotes`.
- **`SCHEMA_VERSION` 3 → 4**, so the document self-describes.
- **Backup screen copy flips**: the export note that photos/sessions are excluded
  is **removed**; the export row now says it includes everything.

## Scope

### In Scope
- `exportBackup`: include all ten tables; photos base64-encoded.
- `parseBackup`: accept and validate the new arrays; default them to `[]` for old
  backups; keep rejecting non-backups.
- `importBackupReplaceAll`: restore all ten tables with original ids.
- A chunked **`ArrayBuffer ↔ base64`** codec (naïve `String.fromCharCode(...big)`
  overflows the stack on real photos — must chunk).
- `SCHEMA_VERSION` bump to 4.
- `DataPage`: export/import copy reflects a complete backup; compact (non-pretty)
  JSON for the backup to halve the string size.
- Tests: full round-trip fidelity (incl. photo bytes), old-backup forward compat,
  base64 codec correctness, reject-non-backup unchanged.

### Out of Scope
- **ZIP / gzip container** — decided against; plain JSON stays dependency-free and
  inspectable. (gzip via `CompressionStream` is a future option if size bites.)
- **Merge/additive import** — restore is replace-all, by design (confirmed).
- **Encryption** of the backup file.
- **Streaming** export/import — the whole document is built in memory (a spike for
  huge photo sets; acceptable now, noted as a risk).
- **Automatic/scheduled backups**, cloud sync — still a manual file.
- **Device-local UI preferences** (font-size, the onboarding "already asked" flag)
  — these correctly stay out of the backup; they are not user data.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema change; every table already exists. `allTables` already lists all ten. |
| Data layer | **Yes** | `portability.ts`: `BackupDoc` gains 4 arrays; `exportBackup`/`parseBackup`/`importBackupReplaceAll` cover them; new base64 codec; `SCHEMA_VERSION` → 4. |
| State | No | No store change. |
| UI | **Yes (copy)** | `DataPage`: export sub-text + remove the "photos excluded" note; compact JSON download. Import warning already says "inclusive as fotos". |
| Deps | **No** | base64 via built-in `btoa`/`atob`, chunked by hand. |
| Tests | **Yes** | Round-trip fidelity, codec, forward-compat, size sanity. |
| i18n / copy | Yes (small) | pt-BR export copy. |

## Architecture Considerations

- **`allTables` already drives clear/reset**, so `importBackupReplaceAll` and
  `resetAll` already wipe all ten tables. The only gap is that export/restore
  don't yet *carry* the new six-of-ten; this change closes it. The clear-then-add
  shape is unchanged.
- **Original ids are preserved on restore** (Dexie `bulkAdd` accepts explicit
  inbound keys, as the code already relies on for gyms/exercises). This is what
  keeps cross-table references valid — a restore is a faithful copy, not a remap.
- **Photos are already `bytes: ArrayBuffer`** (chosen in `add-exercise-photos`
  precisely because bytes are portable and testable). base64 is the JSON-safe
  wire form; `fake-indexeddb` round-trips `ArrayBuffer`, and `btoa`/`atob` exist
  in jsdom, so the **entire round-trip is unit-testable** — unlike the photo
  *downscale* pipeline, this needs no canvas and no real browser for correctness.
- **The base64 codec must chunk.** `btoa(String.fromCharCode(...new Uint8Array(buf)))`
  throws `RangeError: Maximum call stack size exceeded` for a multi-hundred-KB
  photo. Encode/decode in fixed-size chunks (e.g. 32 KB).
- **Compact JSON for the backup.** `DataPage.download` pretty-prints
  (`JSON.stringify(data, null, 2)`); on a 12 MB backup that is a lot of pure
  whitespace. The backup should serialize compact.
- **The single-active-session invariant survives.** An in-progress session is
  exported as-is and restored as-is; replace-all can't produce a second active
  session for a gym.

## Success Criteria

- [x] Export produces one JSON file containing **all ten tables**, photos included as base64.
- [x] Export → clear storage → import restores the device **identically**: same sessions (with done states), same weight history, same notes, and **byte-identical photos**.
- [x] A photo displays correctly after a round-trip (bytes and mime type intact).
- [x] An **older backup** (no sessions/photos/history) still imports, restoring zero of those and everything else.
- [x] A non-backup / malformed file is still rejected with a clear message, existing data untouched.
- [x] The Backup screen no longer claims photos are excluded; it states the backup is complete.
- [x] A realistic backup (~30 photos, several sessions) exports and re-imports on a phone-class viewport without error.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **base64 stack overflow** on real photos (`String.fromCharCode(...big)`) | **High** | **High** | Chunked codec; unit-test with a buffer large enough to overflow the naïve path. |
| **Memory/perf** — building + stringifying a 12 MB doc, then parsing it, on a low-end phone | Med | Med | Compact JSON; verify a realistic-size export/import in a real browser. Streaming is a documented future option. |
| **Photo bytes corrupted** in the round-trip (encoding edge cases, non-ASCII) | Med | **High** | base64 is ASCII-safe by construction; assert **byte-for-byte** equality in tests, not just "a photo exists". |
| **Foreign keys break** if ids aren't preserved | Low | **High** | Restore uses explicit ids via `bulkAdd` (as today for gyms/exercises); test a session+entry+photo round-trip and open them. |
| Old backups stop importing | Low | Med | Default every new array to `[]` in `parseBackup`; keep the existing `exerciseNotes` test and add old-doc tests. |
| A user expects import to **merge**, loses current data | Med | Med | Keep the existing **danger confirmation**; copy says "substitui TUDO, inclusive as fotos". |
| Huge backup silently slow (no feedback) | Med | Low | `busy` state on export/import; the buttons already disable. Consider a spinner/toast (in scope as polish). |

---

## Implementation Notes (what the build confirmed)

The reversal was mechanical and clean — `allTables` already drove clear/reset, so
export/restore just had to *carry* the six tables they weren't carrying. Net new
surface: a base64 codec and four arrays on `BackupDoc`.

**The two risks the proposal flagged both proved real and both are handled:**

1. **base64 stack overflow.** Confirmed by mutation test — the naïve
   `btoa(String.fromCharCode(...bytes))` throws `RangeError` on the 1 MB buffer;
   the chunked codec round-trips it byte-for-byte. This is the kind of bug that
   ships green (small test photos never trip it) and explodes on a real user's
   first camera photo, so the test deliberately uses an overflow-sized buffer.

2. **Size/memory.** Measured in a real browser: a **realistic** backup (30 photos
   at the pipeline's ~49 KB) is **2.0 MB** and round-trips instantly. A pathological
   worst case (30 pure-noise 1 MB JPEGs) is **43.5 MB** and still round-trips
   byte-perfect in under a second on desktop. The whole size story is photo-driven;
   the ~400 KB/photo cap from `add-exercise-photos` is what keeps this sane.

**Unexpected: jsdom has no `Blob.text()`/`arrayBuffer()`.** The import path does
`await file.text()`, so the entire import UI was untestable until a FileReader-based
polyfill went into `vitest.setup.ts` (beside the `ResizeObserver` one from the last
change). All target browsers have had these since ~2020 — an environment gap, not a
product concern.

**Fidelity is byte-exact and reference-safe.** The headline test seeds one row in
every one of the ten tables, exports, JSON-round-trips, wipes, restores, and asserts
`counts()` are identical table-by-table plus a photo compared byte-for-byte — and a
separate test proves a restored photo's `exerciseId` still resolves (ids preserved,
so references survive). Old pre-v4 backups import cleanly with the new tables empty.

**Verification, honestly.** The base64 codec and the whole export/parse/import
round-trip are **fully unit-tested** — no browser needed for correctness, because
photos are `ArrayBuffer` bytes (not `Blob`) and `btoa`/`atob` exist in jsdom. The
real browser was used only for what jsdom can't show: actual file size and
export/restore timing on a realistic dataset.
