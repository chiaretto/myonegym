# Implementation Tasks: Filter Exercises by Name and Category in the Training Day Form

**Change ID:** `day-form-exercise-filter`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Confirm `filterExercises` / `matchesSearch` in
      `src/lib/exerciseFilters.ts` cover this use case unchanged (search +
      `category`, `dayId: 'all'`) — no new helper unless a gap appears
      ✓ 2026-07-23 — covers it as-is; `dayId` defaults to `'all'`, so the day
      form omits it and passes `[]` for `days`
- [x] 1.2 If a gap appears (e.g. filtering a pre-narrowed list), extend the
      existing helper rather than adding a parallel one, and cover it in
      `src/lib/exerciseFilters.test.ts`
      ✓ 2026-07-23 — **no gap**: the helper already filters any array of
      exercises, so it accepts the pre-narrowed `available` list unchanged. No
      edit to `src/lib/exerciseFilters.ts`.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test src/lib/exerciseFilters.test.ts` passes (unchanged helper, still green in the full run)

---

## Phase 2: Business Logic (State)

- [x] 2.1 `DayForm` (`src/features/settings/DaysPage.tsx`): add local state for
      the search text and the selected category filter (default: unfiltered)
      ✓ 2026-07-23 — `search` / `categorySel`
- [x] 2.2 Derive the visible candidates by applying `filterExercises` to the
      already-computed `available` list (exercises minus selected), with
      `dayId: 'all'` ✓ 2026-07-23 — `candidates`
- [x] 2.3 Derive a `filtersActive` flag for the "Limpar filtros" action and add
      a `clearFilters` handler ✓ 2026-07-23

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Selection/reorder logic untouched (`toggle` / `move` unchanged)

---

## Phase 3: User Interface

- [x] 3.1 `DayForm`: render a filter bar above the "Adicionar exercício" list —
      name `<input>` + category `<select>` ("Todas as categorias" / each
      category / "Sem categoria") — reusing the `.filters` / `.filters-row`
      classes from `ExercisesPage`
      ✓ 2026-07-23 — reused `.filters`; **not** `.filters-row`, which is a
      two-column grid and would leave a dangling empty cell with only one select
      here. The two fields stack full-width instead.
- [x] 3.2 Show the filter bar whenever there is at least one available
      (unselected) exercise, so it stays reachable when filters match nothing
      ✓ 2026-07-23 — gated on `available.length > 0` (unfiltered), not `candidates`
- [x] 3.3 Add the "Nenhum exercício encontrado" empty state with "Limpar
      filtros", shown in place of the filtered list ✓ 2026-07-23
- [x] 3.4 Keep the "Exercícios do dia" section and the info/preview sheet
      unchanged ✓ 2026-07-23

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Existing `days.integration.test.tsx` still passes

---

## Phase 4: Integration & Polish

- [x] 4.1 Integration tests (new file or `days.integration.test.tsx`): search
      narrows candidates; category narrows candidates (including a
      multi-category exercise and "Sem categoria"); filters combine; adding a
      filtered exercise moves it to the selected list; the selected list stays
      unfiltered; "Limpar filtros" restores the full candidate list
      ✓ 2026-07-23 — `src/features/settings/day-form-filters.integration.test.tsx`
      (9 tests, incl. accent-insensitive search and save-while-filtered)
- [x] 4.2 Copy (PT) matches the exercises page: "Buscar por nome", "Todas as
      categorias", "Sem categoria", "Nenhum exercício encontrado", "Limpar
      filtros" ✓ 2026-07-23
- [x] 4.3 Visual pass at 390px: filter bar, both lists, and the floating action
      bar remain usable with no overflow
      ✓ 2026-07-23 — **verified by CSS review, not by screenshot** (no browser
      tooling in this environment). Both filter fields are plain full-width
      `.field`s stacked in the flex column — the same shape as the search field
      on `ExercisesPage` — so there is no new horizontal constraint. The bar
      lives inside `<main class="screen has-action-bar">` and scrolls with the
      content, leaving the floating `ActionBar` untouched.
- [x] 4.4 `README.md` note if it describes the day form ✓ 2026-07-23 — added to
      the Settings bullet, next to the exercises-list filter note

**Quality Gate:** PASSED
- [x] `npm test` passes (36 files, 246 tests)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`

---

## Notes

- **Deferred (out of scope, as proposed):** the filter bar markup is now similar
  to the one on `ExercisesPage`, but not identical (that page adds a day filter
  in a two-column row). Left as two call sites rather than extracting a shared
  component; revisit if a third list needs filters.
- **Not visually verified in a browser** — see 4.3.
