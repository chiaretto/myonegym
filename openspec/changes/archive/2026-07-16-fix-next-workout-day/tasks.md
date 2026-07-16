# Implementation Tasks: Fix "Próximo treino" Day Selection on Home

**Change ID:** `fix-next-workout-day`

---

## Phase 1: Business Logic (Pure Helper)

- [x] 1.1 Added `nextWorkoutDayId(days, lastCompletedDayId)` to `src/lib/days.ts`
      — `null` when no days; otherwise `days[(idx + 1) % days.length].id` with
      `idx = findIndex(d => d.id === lastCompletedDayId)` (`-1` when unset/deleted
      → first day). ✓
- [x] 1.2 Added `nextWorkoutDayId` unit tests to `src/lib/days.test.ts`: no session
      → first; middle → next; last → wrap; deleted day → first; empty → null;
      single-day list. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (helper) passes — 15/15 in `days.test.ts`

---

## Phase 2: User Interface

- [x] 2.1 `src/features/home/HomePage.tsx`: computed `nextDayId =
      nextWorkoutDayId(days ?? [], summaries[0]?.session.dayId ?? null)` and set
      `isFeatured = day.id === nextDayId && activeSession == null` (dropped the
      unused `idx`). Drives the eyebrow + `featured` classes as before. ✓
- [x] 2.2 `src/features/home/next-workout.integration.test.tsx`: no history →
      Dia 1; complete Dia 1 → Dia 2; complete last (Dia 3) → wrap to Dia 1; most
      recent (not highest) session wins. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component/integration tests pass — 4/4

---

## Phase 3: Integration & Polish

- [x] 3.1 Confirmed: `nextDayId` derives from `useSessionSummaries(activeGymId)`
      so it recomputes per active gym, and `isFeatured` still requires
      `activeSession == null` (suppressed while resuming). Integration test covers
      none/middle/last/wrap + most-recent-wins. ✓
- [x] 3.2 Behavior verified through the integration harness (real DOM) across all
      four states; production build OK. (Manual 390px pixel pass still recommended
      before release.) ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes — 126/126 (serial)
- [x] Documentation synced — no README/project mention of the featured-day
      behavior, so no doc change needed

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
