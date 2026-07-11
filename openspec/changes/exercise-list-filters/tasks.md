# Implementation Tasks: Filter and Search the Exercises List

**Change ID:** `exercise-list-filters`

---

## Phase 1: Foundation (Data Layer)

- [ ] 1.1 Add `filterExercises(exercises, filters, days)` to `src/lib/` (e.g.
      `src/lib/exerciseFilters.ts`) — accepts `{ search?, categoryId?: number |
      'none' | 'all', dayId?: number | 'none' | 'all' }` and returns the
      matching exercises
- [ ] 1.2 Add a small accent-insensitive/case-insensitive name-match helper
      used by the search filter
- [ ] 1.3 Unit test the helper: search substring match (case/accent
      insensitive), category match (specific / "Sem categoria" / "Todas"), day
      match (specific / "Nenhum dia" / "Todos"), and combined (AND) filtering

**Quality Gate:**
- [ ] `npm run typecheck` passes
- [ ] `npm test` (helper) passes

---

## Phase 2: Business Logic (State)

- [ ] 2.1 `ExercisesPage`: add local state for search text, selected category
      filter, selected day filter (default: all/unfiltered)
- [ ] 2.2 Derive the visible list via `filterExercises` from `useExercises()` /
      `useDays()` results and the current filter state

**Quality Gate:**
- [ ] `npm run typecheck` passes

---

## Phase 3: User Interface

- [ ] 3.1 `ExercisesPage`: add a filter bar above the list — name search input,
      category `<select>` (with "Todas as categorias" / "Sem categoria"), day
      `<select>` (with "Todos os dias" / "Nenhum dia")
- [ ] 3.2 Add a "no matches" empty state (distinct from the "no exercises at
      all" state) with a "Limpar filtros" action
- [ ] 3.3 Component/integration test: typing a search term narrows the list;
      selecting a category/day narrows the list; combined filters narrow
      further; clearing filters restores the full list

**Quality Gate:**
- [ ] `npm run typecheck` passes
- [ ] Component tests pass

---

## Phase 4: Integration & Polish

- [ ] 4.1 Copy (PT): "Buscar por nome", "Todas as categorias", "Sem
      categoria", "Todos os dias", "Nenhum dia", "Nenhum exercício
      encontrado", "Limpar filtros"
- [ ] 4.2 `README.md` note if it describes the exercises list (likely minor)
- [ ] 4.3 Visual pass at 390px: filter bar + list remain usable, no overflow
- [ ] 4.4 Confirm filters don't affect create/edit/delete flows or the
      underlying data

**Quality Gate:**
- [ ] `npm run build` (typecheck + production build) passes
- [ ] `npm test` fully passes
- [ ] Docs synced

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
