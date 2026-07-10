# Implementation Tasks: Dynamic Day Categories

**Change ID:** `dynamic-day-categories`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Removed `categoryId` from the `Day` interface (`src/db/types.ts`) ✓
- [x] 1.2 Dropped `categoryId` from `createDay`/`updateDay`; removed the
      day-reassign block (and `d.days` from the tx scope) in `deleteCategory` ✓
- [x] 1.3 Added `dayCategoryNames` + `daySubtitle` helpers in `src/lib/days.ts`
      (distinct, first-appearance order, ignores uncategorized; count fallback) ✓
- [x] 1.4 `generateExample` no longer sets day `categoryId`; `BackupDoc.days`
      compiles ✓
- [x] 1.5 Tests: `days.test.ts` (7), legacy-day-`categoryId` import still works ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes

---

## Phase 2: Business Logic (Selectors)

- [x] 2.1 Derivation exposed via the pure helpers + existing `useExerciseMap` /
      `useCategoryMap` (no new store) ✓
- [x] 2.2 Fallback: `daySubtitle` returns `"{n} exercícios"` when no categorized
      exercises ✓
- [x] 2.3 Fallback + "updates when exercises change" covered by tests ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Derivation covered by tests

---

## Phase 3: User Interface

- [x] 3.1 `HomePage` day sub-line → `daySubtitle(day, exMap, catMap)` ✓
- [x] 3.2 `DaysPage` list sub-line → `daySubtitle`; **removed** the
      "Categoria (opcional)" `<select>` and its state from the day form ✓
- [x] 3.3 `days.integration.test.tsx`: a mixed-category day shows the distinct
      categories and updates live when an exercise is removed ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 Removed the "Categoria (opcional)" copy; no new strings ✓
- [x] 4.2 `README.md` updated (day categories derived from exercises) ✓
- [x] 4.3 Visual pass at 390px: Home shows "Peito · Tríceps" / "Costas · Peito" /
      count fallback; day form has no category selector ✓
- [x] 4.4 Swept `src/**` — no remaining `day.categoryId` / `createDay`/`updateDay`
      category references ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (63/63)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
