# Implementation Tasks: Session Exercise Detail

**Change ID:** `session-exercise-detail`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Added `getSessionEntry(entryId)` to `src/db/repos.ts` ✓
- [x] 1.2 Reused `setEntryDone`, `setEntryWeight`, `getWeight`, `listHistory` —
      no new mutators ✓
- [x] 1.3 Repo test: `getSessionEntry` returns the entry; used-weight edit via
      `setEntryWeight` leaves the target weight (value + unit) untouched ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes (21 repo tests)

---

## Phase 2: Business Logic (State / Selectors)

- [x] 2.1 Added `useSessionEntry(entryId)` live-query hook in `src/lib/hooks.ts` ✓
- [x] 2.2 Detail reuses `useHistory`, `useGyms`, `useExerciseMap`,
      `useCategoryMap`; entry → exercise via `entry.exerciseId` ✓
- [x] 2.3 History keyed on `session.gymId` (the session's gym, not necessarily the
      globally active gym) ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Selector wiring covered by the integration test

---

## Phase 3: User Interface

- [x] 3.1 Runner entry rows restyled to the Home pattern: done checkbox (sibling)
      + `Media` thumbnail + name/category + read-only used-weight badge; the
      thumbnail/name/badge area is a `Link` to `/session/:id/entry/:entryId` ✓
- [x] 3.2 Removed the inline used-weight edit sheet from the list; the badge is
      now read-only (shows the used weight or "definir") ✓
- [x] 3.3 New `SessionEntryPage`: `Media` hero, chips, used-weight edit→save
      (KG/LB/#), per-gym history timeline (+ `Sparkline`, read-only — no delete),
      and a "Marcar como concluído"/"Concluído" toggle ✓
- [x] 3.4 Read-only when the parent session is completed (no weight edit; done
      state shown, toggle replaced by a static label) ✓
- [x] 3.5 Route `/session/:id/entry/:entryId` in `src/App.tsx`; back → the session ✓
- [x] 3.6 Integration test: open detail from runner, mark done from the detail,
      edit used weight (target unchanged), progress reflects it ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (3 session integration tests)

---

## Phase 4: Integration & Polish

- [x] 4.1 Portuguese copy ("Marcar como concluído", "Concluído", "Peso usado",
      "definir", …) consistent with existing strings ✓
- [x] 4.2 Reused `exercise.css` (hero, weight card, timeline) + `Media`/`Sparkline`;
      added only the row/thumbnail tweaks to `session.css` ✓
- [x] 4.3 Updated `README.md` "How it works" (entry detail) ✓
- [x] 4.4 Visual pass at 390px: runner rows (thumbnail + badge) → entry detail
      (media, used weight edit, read-only history) → mark done (toggle → filled
      "Concluído") — no clipping/overlap at 2× type ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (48/48)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
