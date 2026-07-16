# Proposal: Exercise Notes

**Change ID:** `add-exercise-notes`
**Created:** 2026-07-15
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** MyOneGym records, per exercise and gym, only a
  **target weight** (`Weight`) and, per session, the **used weight** on a
  `SessionEntry`. There is nowhere to jot a **textual note** about an exercise —
  a cue or reminder such as "manter cotovelo fixo", "usar pegada aberta", or
  "banco no furo 3".
- **Who is affected?** The single end user running their routine. During a
  workout they often discover a detail worth remembering for next time, and today
  that knowledge is lost.
- **Current pain point?** The used-weight field is a number and is per-session
  (a snapshot), so it cannot hold a durable reminder. Nothing on the exercise or
  its per-gym record carries free text, so a cue noted during one workout does
  not resurface in the next.

## Proposed Solution

Introduce a **per-gym exercise note** — one free-text observation scoped to
`(gymId, exerciseId)`, modeled exactly like the existing target `Weight`.

- **Durable and per-gym.** One note per `(gymId, exerciseId)`. A note written for
  an exercise in the active gym reappears every future time that exercise is
  opened in that gym, across sessions. Notes are isolated per gym (gym B does not
  see gym A's note for the same exercise).
- **Edited from the opened exercise, via an "Observações" tab.** Both exercise
  screens gain a two-tab layout:
  - **Execution** (`SessionEntryPage`): the existing content (used weight,
    history, guided stepper) becomes the first tab; a new **"Observações"** tab
    edits the note for `(session.gymId, entry.exerciseId)`.
  - **Catalog** (`ExerciseDetailPage`): the existing target-weight content becomes
    the first tab; an **"Observações"** tab edits the note for the **active gym**.
- **Editable text field.** A `<textarea>` with an explicit save. Saving blank text
  removes the note (no empty records).
- **Backup-worthy.** Like the current per-gym weights (and unlike the device-local
  weight-change log and sessions), notes are durable per-gym data and ARE included
  in the full-backup JSON export/import.

## Scope

### In Scope
- A new `exercise-notes` capability: one durable note per `(gymId, exerciseId)`,
  read/upsert, with blank-save clearing the note.
- New Dexie `version(3)` table `exerciseNotes`; extend `allTables()`.
- Repo functions `getNote` / `saveNote`; cascade note deletion when an exercise
  or a gym is deleted.
- A small reusable **tabs** UI, used to add an "Observações" tab to both
  `SessionEntryPage` and `ExerciseDetailPage`.
- Include `exerciseNotes` in the full-backup export and (replace-all) import.

### Out of Scope
- Per-session notes (a note on a `SessionEntry`). The note is per `(gym, exercise)`.
- Note history / versioning, a timestamped change log, or per-day notes.
- Rich text / markdown / attachments — plain text only.
- Copying notes on copy-on-create of a new gym (a new gym starts with no notes).
- Surfacing notes on Home rows or the session runner list (v1 edits them on the
  exercise detail tabs only).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database  | Yes | New Dexie `version(3)`: `exerciseNotes` table with a unique `[gymId+exerciseId]` index. Additive migration; existing tables untouched. |
| Data layer (repos) | Yes | New `getNote`, `saveNote` (upsert; blank text deletes). Cascade: `deleteExercise` and `deleteGym` remove the affected notes. |
| API | No | No backend — offline, local-only. |
| State | Yes | Reuse `useActiveGym`; a new `useNote(gymId, exerciseId)` live-query hook. No new persisted store. |
| UI | Yes | New reusable tabs component; "Observações" tab (textarea + save) on `SessionEntryPage` and `ExerciseDetailPage`. |
| Import/Export | Yes | Full-backup JSON gains `exerciseNotes`; `SCHEMA_VERSION` 2 → 3; import restores it; older backups treated as `[]`. |
| i18n / copy | Yes | New Portuguese strings ("Observações", "Execução"/"Detalhe", "Salvar", placeholder). |

## Architecture Considerations

- **Fits the existing per-gym model.** A note belongs to a gym exactly as a weight
  does (`(gymId, exerciseId)` with a unique index), so it follows the same repo
  upsert + `useLiveQuery` pattern as `Weight`. `getWeight`/`saveWeight` in
  `src/db/repos.ts` are the direct template.
- **Additive Dexie migration.** Bump to `this.version(3).stores({ exerciseNotes:
  '++id, &[gymId+exerciseId], gymId, exerciseId' })`; existing stores/data are
  untouched. `allTables()` extends to include the new table for import/reset.
- **Blank-save clears.** Saving empty/whitespace text deletes the record so there
  is never an "empty note", keeping backups and queries clean.
- **New UI pattern: tabs.** Both exercise screens are currently a single vertical
  scroll. A small shared tabs control (segmented, in the style of the existing
  `.unit-seg`) is introduced and reused by both, rather than duplicating markup.
- **Backup parity with weights.** Notes are durable per-gym data, so they ride in
  the full backup alongside `weights` (unlike the device-local weight-change log
  and sessions).

## Success Criteria

- [ ] A user can open an exercise during a session, switch to the "Observações"
      tab, type a note, save it, and see it persist.
- [ ] The same note appears when the exercise is reopened in a later session of
      the same gym, and on the catalog exercise detail for the active gym.
- [ ] Notes are isolated per gym; switching the active gym shows a different note
      (or none) for the same exercise.
- [ ] Saving blank text removes the note.
- [ ] Deleting an exercise or a gym removes the affected notes.
- [ ] Full-backup export/import round-trips `exerciseNotes`; an older backup
      without the field imports cleanly (zero notes).
- [ ] `npm run build`, `npm run typecheck`, and `npm test` pass; new data-layer
      and portability tests cover the flows above.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep into per-session/rich/per-day notes | Med | Med | Explicitly out of scope; v1 is one plain-text note per `(gym, exercise)`. |
| Dexie migration breaks existing local data | Low | High | Additive `version(3)` only adds a store; covered by a migration/round-trip test. |
| Orphaned notes when an exercise/gym is deleted | Med | Low | Cascade note deletion in `deleteExercise`/`deleteGym`, mirroring the weight cascade; covered by a test. |
| Backup schema change breaks old imports | Low | Med | Bump the backup version and treat a missing `exerciseNotes` field as `[]` on import. |
| Adding tabs regresses the existing single-scroll layout | Low | Med | Introduce one shared tabs component; the existing content becomes the first tab unchanged. |

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 1 day (created 2026-07-15, completed 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/db/types.ts` (new `ExerciseNote`), `src/db/db.ts` (Dexie v3 `exerciseNotes` + `allTables`), `src/db/repos.ts` (`getNote`/`saveNote`, cascade in `deleteExercise`/`deleteGym`)
- `src/lib/hooks.ts` (`useNote`)
- `src/ui/Tabs.tsx` (new), `src/features/exercise/NoteEditor.tsx` (new), `src/styles/global.css` (`.tabs`/`.note-card`/`.note-input`)
- `src/features/session/SessionEntryPage.tsx`, `src/features/exercise/ExerciseDetailPage.tsx` (Observações tab)
- `src/data/portability.ts` (`exerciseNotes` in backup, `SCHEMA_VERSION` 3)
- `README.md`
- Tests: `src/db/repos.test.ts`, `src/data/portability.test.ts`, `src/features/exercise/notes.integration.test.tsx` (new)

### Specs Updated
- `openspec/specs/exercise-notes/spec.md` — **new capability** (Persist a Per-Gym Exercise Note; Edit and Clear the Note)
- `openspec/specs/workout-sessions/spec.md` — modified **Session Exercise Detail** (Execução/Observações tabs + 2 scenarios)
- `openspec/specs/exercises/spec.md` — added **Exercise Note on the Catalog Detail**; modified **Edit and Delete Exercises** (note cascade)
- `openspec/specs/gyms/spec.md` — modified **Edit and Delete Gyms** (note cascade)
- `openspec/specs/data-portability/spec.md` — modified **Export Full Backup JSON**, **Import JSON (Replace All)**, **Reset App** to include exercise notes

### Verification
- `npm run build` (typecheck + production build) — pass
- `npm test` — 116/116 (serial; the only parallel-run failures are a pre-existing onboarding `waitFor` timing flake, unrelated to this change)
- `openspec validate add-exercise-notes --strict` — valid
