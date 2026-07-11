# Proposal: Filter and Search the Exercises List

**Change ID:** `exercise-list-filters`
**Created:** 2026-07-11
**Status:** Draft

---

## Problem Statement

- **What problem are we solving?** On **Configurações → Exercícios**, the list
  shows every exercise with no way to narrow it down. As the catalog grows
  (recently enriched with a per-exercise **training days** line — see
  `exercise-list-show-days`), finding one specific exercise means scrolling and
  scanning by eye.
- **Who is affected?** Anyone maintaining a non-trivial exercise catalog: users
  who want to find exercises of a given muscle **category**, exercises that
  belong to a specific **training day**, or a specific exercise **by name**.
- **Current pain point?** No filter by category, no filter by training day, and
  no search-by-name field on the Exercícios list (GitHub issue #6).

## Proposed Solution

Add a compact filter/search bar above the exercise list on the Exercícios page,
purely as a **client-side view filter** (no data model changes):

- **Search by name.** A text input that filters exercises whose name contains
  the typed text (case-insensitive, accent-insensitive substring match).
- **Filter by category.** A category select (reusing the existing categories,
  same source as the exercise form), including a "Todas as categorias" option
  and a way to select exercises with **no category** ("Sem categoria").
- **Filter by training day.** A day select (reusing `useDays`), including a
  "Todos os dias" option and a way to select exercises in **no day** ("Nenhum
  dia") — mirroring the existing "Nenhum dia" hint already shown per row.
- **Combinable.** All three filters (search + category + day) apply together
  (AND). Filtering never mutates data — it only changes what's rendered.
- **Empty state.** When filters produce zero matches, show a distinct
  "Nenhum exercício encontrado" message (different from the "no exercises at
  all" empty state), with an easy way to clear filters.

## Scope

### In Scope
- A filter/search bar on `ExercisesPage` (name search input, category select,
  day select).
- A pure helper (e.g. `filterExercises(exercises, { search, categoryId, dayId },
  days)`) in `src/lib/` to keep the filtering logic testable outside the
  component.
- A "no results from filtering" empty state, distinct from the "no exercises at
  all" empty state.
- Unit tests for the filter helper; a component/integration test that filters
  narrow the visible rows.

### Out of Scope
- Filtering/search on any other list (training days, categories, gyms).
- Persisting filter selections across navigation or app restarts.
- Multi-select category/day filters (single selection per filter, matching the
  existing single-select patterns in this app, e.g. the exercise form's
  category select).
- Any change to how exercises are created, edited, or associated with
  categories/days.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | Yes (small) | New pure helper `filterExercises(...)` (client-side filtering only, no schema/query change). |
| State | Yes (small) | `ExercisesPage` adds local `useState` for search text, selected category, selected day. |
| UI | Yes | `ExercisesPage` gains a filter bar (search input + two selects) above the list; empty-state copy for "no matches". |
| i18n / copy | Yes (small) | "Todas as categorias", "Todos os dias", "Sem categoria", "Nenhum dia", "Nenhum exercício encontrado". |

## Architecture Considerations

- **Pure client-side filtering, mirrors existing derived helpers.** Like
  `dayNamesForExercise` and `dayCategoryNames` in `src/lib/days.ts`, the new
  filter helper is a pure function of already-loaded data (exercises, the
  selected filters, and the days list) — no new Dexie queries.
- **Reuses existing live-query hooks.** `useExercises`, `useCategories`/
  `useCategoryMap`, and `useDays` are already used by `ExercisesPage`; filtering
  happens on their already-reactive results, so the list stays live (filtered
  view updates as data changes, same as today).
- **"No category" / "no day" as explicit filter options**, consistent with how
  the list already renders "Sem categoria" and "Nenhum dia" per row — the
  filters should let users find exactly those exercises, not just ignore them.
- **No new dependencies.** Plain `<input>`/`<select>` elements matching the
  existing form styling (`ExerciseForm` already uses a plain `<select>` for
  category).

## Success Criteria

- [ ] The Exercícios list has a search input that filters by exercise name
      (case-insensitive, accent-insensitive).
- [ ] The Exercícios list has a category filter (including "Todas as
      categorias" and "Sem categoria") that narrows the list.
- [ ] The Exercícios list has a training-day filter (including "Todos os dias"
      and "Nenhum dia") that narrows the list.
- [ ] The three filters combine (AND) and update the list live as the user
      types/selects.
- [ ] Filtering to zero results shows a clear "no matches" message with a way
      to reset filters; it is distinct from the "no exercises at all" state.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with a helper test
      and a UI test for the filter bar.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Filter bar crowds the mobile viewport (390px) | Med | Low | Stack search input above the two selects; keep controls compact, matching existing form field sizing. |
| Accent-insensitive search adds complexity | Low | Low | Use a small, well-tested normalization (e.g. `normalize('NFD')` + strip diacritics) shared by the helper's unit tests. |
| Confusion between "no exercises at all" and "no filter matches" empty states | Low | Med | Distinct copy/icon for each, and a visible "limpar filtros" action in the no-matches state. |
