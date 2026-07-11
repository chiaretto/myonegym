# Implementation Tasks: Filter and Search the Exercises List

**Change ID:** `exercise-list-filters`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Add `filterExercises(exercises, filters, days)` to `src/lib/` (e.g.
      `src/lib/exerciseFilters.ts`) — accepts `{ search?, categoryId?: number |
      'none' | 'all', dayId?: number | 'none' | 'all' }` and returns the
      matching exercises
- [x] 1.2 Add a small accent-insensitive/case-insensitive name-match helper
      used by the search filter
- [x] 1.3 Unit test the helper: search substring match (case/accent
      insensitive), category match (specific / "Sem categoria" / "Todas"), day
      match (specific / "Nenhum dia" / "Todos"), and combined (AND) filtering

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] `npm test` (helper) passes

---

## Phase 2: Business Logic (State)

- [x] 2.1 `ExercisesPage`: add local state for search text, selected category
      filter, selected day filter (default: all/unfiltered)
- [x] 2.2 Derive the visible list via `filterExercises` from `useExercises()` /
      `useDays()` results and the current filter state

**Quality Gate:**
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 `ExercisesPage`: add a filter bar above the list — name search input,
      category `<select>` (with "Todas as categorias" / "Sem categoria"), day
      `<select>` (with "Todos os dias" / "Nenhum dia")
- [x] 3.2 Add a "no matches" empty state (distinct from the "no exercises at
      all" state) with a "Limpar filtros" action
- [x] 3.3 Component/integration test: typing a search term narrows the list;
      selecting a category/day narrows the list; combined filters narrow
      further; clearing filters restores the full list

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 Copy (PT): "Buscar por nome", "Todas as categorias", "Sem
      categoria", "Todos os dias", "Nenhum dia", "Nenhum exercício
      encontrado", "Limpar filtros"
- [x] 4.2 `README.md` note if it describes the exercises list (likely minor)
- [x] 4.3 Visual pass at 390px: filter bar + list remain usable, no overflow —
      found and fixed a real overflow (grid items need `min-width: 0` for the
      day `<select>` to shrink instead of pushing past the viewport), verified
      with a headless-browser screenshot pass
- [x] 4.4 Confirm filters don't affect create/edit/delete flows or the
      underlying data — `onDelete`/edit act on the same `Exercise` object
      references `filterExercises` returns (a view filter, not a copy), and
      `Novo exercício` is unaffected by filter state; also verified live in
      the browser

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
