# Implementation Tasks: Show Training Days on the Exercises List

**Change ID:** `exercise-list-show-days`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Add `dayNamesForExercise(exerciseId, days)` to `src/lib/days.ts` —
      returns the names of days whose `exerciseIds` include the exercise, in the
      given (ordered) days' order
- [x] 1.2 Unit test the helper (in/out of days; respects order; empty)

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] `npm test` (helper) passes

---

## Phase 2: Business Logic (State)

- [x] 2.1 N/A — `ExercisesPage` uses existing `useDays()` / `useExercises()`

**Quality Gate:**
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 `ExercisesPage`: add `useDays()`; render a compact **days line** under
      the category (small calendar glyph + `Dia 1 · Dia 4`), or a "Nenhum dia"
      hint when the exercise is in no day
- [x] 3.2 Component/integration test: an exercise used in two days shows both
      names; live-updates when removed from a day

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 "Nenhum dia" copy (PT)
- [x] 4.2 `README.md` note if it describes the exercises list (likely minor)
- [x] 4.3 Visual pass at 390px: exercises list shows the day names per item
- [x] 4.4 Confirm the line wraps gracefully for an exercise in many days

**Quality Gate:**
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
