# Implementation Tasks: Exercise Notes

**Change ID:** `add-exercise-notes`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Add `ExerciseNote { id?, gymId, exerciseId, text, updatedAt }` to
      `src/db/types.ts` (mirror the `Weight` interface / doc-comment style). ✓
- [x] 1.2 Bump Dexie: `this.version(3).stores({ exerciseNotes: '++id,
      &[gymId+exerciseId], gymId, exerciseId' })` in `src/db/db.ts`; add
      `exerciseNotes` to `allTables()` and to the `MyOneGymDB` table fields. ✓
- [x] 1.3 Add repos in `src/db/repos.ts` (template: `getWeight`/`saveWeight`):
      `getNote(gymId, exerciseId)` and `saveNote(gymId, exerciseId, text)` —
      upsert on `[gymId+exerciseId]`, set `updatedAt = Date.now()`; blank/
      whitespace text **deletes** the record. ✓
- [x] 1.4 Cascade note deletion: extend `deleteExercise` (remove notes for that
      exercise across gyms, alongside the existing weight/history cascade) and
      `deleteGym` (remove that gym's notes, alongside its weights). ✓
- [x] 1.5 Data-layer tests in `src/db/repos.test.ts` (new `exercise notes`
      suite): upsert round-trip, edit-replaces, trim + blank-save deletes,
      per-gym isolation, cascade on `deleteExercise` and `deleteGym`. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes — 30/30 in `repos.test.ts`

---

## Phase 2: Business Logic (State / Selectors)

- [x] 2.1 Add a live-query hook `useNote(gymId, exerciseId)` in `src/lib/hooks.ts`
      (pattern: `useHistory`/`useSession` — keyed on the two ids; `null` when
      unset/ids missing, `undefined` while loading). ✓
- [x] 2.2 Catalog path derives the gym from `useActiveGym` (`activeGymId`); the
      execution path uses `session.gymId` (wired in Phase 3). ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Per-gym note selection covered by repo tests (isolation) + hook keying

---

## Phase 3: User Interface

- [x] 3.1 Added reusable tabs component `src/ui/Tabs.tsx` (segmented control,
      `role="tablist"`/`role="tab"`); styles (`.tabs`, `.note-card`,
      `.note-input`) in `src/styles/global.css`. Shared `NoteEditor`
      (`src/features/exercise/NoteEditor.tsx`) holds the textarea + Salvar (dirty
      state) and the no-gym / deleted-exercise hints. ✓
- [x] 3.2 `SessionEntryPage.tsx`: existing content wrapped in an **"Execução"**
      tab; **"Observações"** tab renders `NoteEditor` bound to
      `(session.gymId, entry.exerciseId ?? null)`. ✓
- [x] 3.3 `ExerciseDetailPage.tsx`: **"Detalhe"** + **"Observações"** tabs; note
      bound to `(activeGymId ?? null, exerciseId)`; no-active-gym hint reused. ✓
- [x] 3.4 `src/features/exercise/notes.integration.test.tsx`: save a note on the
      session entry detail → persists → reopen shows it; blank-save clears it. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (2/2 notes; full suite 114/114 serially — note the
      pre-existing onboarding `waitFor` timing flake only under parallel load)

---

## Phase 4: Integration & Polish

- [x] 4.1 `src/data/portability.ts`: added `exerciseNotes: ExerciseNote[]` to
      `BackupDoc`; included in `exportBackup`; bumped `SCHEMA_VERSION` 2 → 3. ✓
- [x] 4.2 `parseBackup` defaults a missing `exerciseNotes` to `[]` (and rejects a
      non-array); `importBackupReplaceAll` restores it; reset clears it via
      `allTables()`. ✓
- [x] 4.3 Portability tests (new `backup includes per-gym exercise notes` suite):
      export includes notes, wipe→import round-trip, older backup without the
      field imports as zero notes. ✓
- [x] 4.4 Portuguese copy: "Observações", "Execução"/"Detalhe", "Salvar",
      placeholder "Ex.: manter cotovelo fixo, usar pegada aberta…", toast
      "Observação salva." / "Observação removida.". ✓
- [x] 4.5 `README.md` updated: exercise-detail tabs, session entry Observações
      tab, a dedicated **Exercise notes** bullet, and Data note that backups carry
      exercise notes. ✓
- [x] 4.6 End-to-end flow verified through the integration harness (real DOM):
      start session → open entry → Observações tab → type/save → persist →
      reopen shows it → blank-save clears. Production build OK. (A manual pixel
      pass at 390px still recommended before release.) ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes — 116/116 (serial; the only parallel-run failures
      are a pre-existing onboarding `waitFor` timing flake, not this change)
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
