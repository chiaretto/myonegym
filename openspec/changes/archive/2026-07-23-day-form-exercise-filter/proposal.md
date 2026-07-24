# Proposal: Filter Exercises by Name and Category in the Training Day Form

**Change ID:** `day-form-exercise-filter`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** In **Configurações → Dias de treino → novo/editar
  dia**, the "Adicionar exercício" section renders **every** exercise that is not
  yet in the day, as one flat list in catalog order. Picking the exercises for a
  day means scrolling the whole catalog looking for each one by eye.
- **Who is affected?** Anyone assembling or adjusting a training day once the
  exercise catalog has grown beyond a screenful — exactly the users the
  **Exercícios** list already serves with filters (`exercise-list-filters`).
- **Current pain point?** The day form is the one place where the user picks
  from the full catalog, and it is the one list with **no search and no category
  filter** — an inconsistency with Configurações → Exercícios, which has both.

## Proposed Solution

Add a compact filter bar above the **"Adicionar exercício"** list in the day
form, reusing the filtering machinery already built for the exercises list:

- **Search by name.** A text input filtering the available exercises by name
  (case-insensitive, accent-insensitive substring), reusing
  `matchesSearch`/`filterExercises` from `src/lib/exerciseFilters.ts`.
- **Filter by category.** A category `<select>` with "Todas as categorias", each
  existing category, and "Sem categoria" — matching any exercise that
  **includes** the selected category (exercises are multi-category since
  `exercise-multi-category`).
- **Combinable (AND)**, applied **only to the "Adicionar exercício" list**. The
  "Exercícios do dia" (selected) list is never filtered — the user must always
  see the full day being built, and reordering/removing must keep working.
- **Purely a view filter.** It changes nothing about selection, order, or
  persistence; a selected exercise leaves the available list exactly as today.
- **Empty state.** When the filters match none of the available exercises, show
  a distinct "Nenhum exercício encontrado" message with "Limpar filtros",
  distinct from the existing "all exercises already added" case (where the
  section is hidden).

No day filter is offered here: the form is itself scoped to one day, so
filtering the candidate pool by day would be confusing rather than useful.

## Scope

### In Scope
- Filter bar (name search + category select) on the **DayForm** page, above the
  "Adicionar exercício" list, for both **new** and **edit** flows.
- Reuse of the existing `filterExercises` helper (`search` + `category`, with
  `dayId: 'all'`) — no new filtering logic, no data-layer change.
- A "no matches" empty state with a "Limpar filtros" action, shown in place of
  the available list.
- Integration tests covering search narrowing, category narrowing, combined
  filters, selection still working while filtered, and the selected list
  remaining unfiltered.

### Out of Scope
- Filtering the **"Exercícios do dia"** (selected) list.
- Persisting filter state across navigation, save, or app restart.
- Multi-select filters, or a day filter inside the day form.
- Creating an exercise from within the day form.
- Any change to the exercises list page, the data model, or day persistence.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | No | Reuses `filterExercises` / `matchesSearch` from `src/lib/exerciseFilters.ts` as-is. |
| State | Yes (small) | `DayForm` adds local `useState` for search text and selected category. |
| UI | Yes | `DayForm` gains a filter bar above "Adicionar exercício" plus a "no matches" empty state. |
| i18n / copy | Yes (small) | "Buscar por nome", "Todas as categorias", "Sem categoria", "Nenhum exercício encontrado", "Limpar filtros" — all already used on the exercises page. |

## Architecture Considerations

- **Reuse over reinvention.** `filterExercises(exercises, { search, category },
  days)` is already a pure, unit-tested helper; the day form passes the
  *available* (unselected) exercises through it and leaves `dayId` at `'all'`.
- **Same controls, same copy as `ExercisesPage`.** The `.filters` /
  `.filters-row` classes and the select option labels already exist in
  `src/styles/global.css`; this change should look like the same bar, so the two
  screens stay visually consistent on a 390px viewport.
- **Filter after exclusion, not before.** The available list is
  `exercises − selected`; the filter is applied to that result, so adding an
  exercise removes it from view regardless of the active filter.
- **Existing floating action bar is untouched.** The form already uses
  `ActionBar` with `has-action-bar`; the filter bar lives inside `<main>` and
  scrolls with the content, so keyboard-aware behavior from
  `keyboard-aware-action-bar` still applies unchanged.
- **No new dependencies.**

## Success Criteria

- [x] The day form (new and edit) has a name search that narrows the "Adicionar
      exercício" list case- and accent-insensitively.
- [x] The day form has a category filter with "Todas as categorias", each
      category, and "Sem categoria", matching multi-category exercises that
      include the selection.
- [x] Search and category combine with AND and update the list live.
- [x] The "Exercícios do dia" list is never affected by the filters; adding,
      removing, and reordering behave exactly as before.
- [x] Filtering to zero available exercises shows a distinct "no matches"
      message with a working "Limpar filtros" action.
- [x] `npm run typecheck`, `npm run build`, and `npm test` pass, with new
      integration tests for the day-form filters.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users think the filter hides exercises already added to the day | Med | Low | Keep the filter bar inside the "Adicionar exercício" section (labelled), never above the selected list. |
| Filter bar plus two lists crowds the 390px viewport | Med | Low | Reuse the compact `.filters` layout from `ExercisesPage` (search stacked above the select). |
| Duplicated filter UI drifts between the two screens | Med | Low | Reuse the same helper, classes, and copy; extract a shared component only if the markup turns out identical. |
| Filter state surviving into a stale view after saving | Low | Low | Filter state is local component state; navigating away on save discards it. |

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** same day (created and completed 2026-07-23)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/settings/DaysPage.tsx` — `search`/`categorySel` state, `candidates`
  derived via `filterExercises`, filter bar and "no matches" state in the picker
- `src/features/settings/day-form-filters.integration.test.tsx` — 9 integration tests
- `README.md` — Settings bullet notes the picker's filters
- `src/features/exercise/day-nav.integration.test.tsx` — unrelated latent test
  race fixed (see below)

### Specs Updated
- `openspec/specs/training-days/spec.md` — ADDED "Filter the Day Form's Exercise
  Picker"; MODIFIED "Select Exercises for a Day" to cross-reference it

### Notes
- **`src/lib/exerciseFilters.ts` was not touched.** `filterExercises` already
  accepted any exercise array and defaults `dayId` to `'all'`, so the day form
  reuses it verbatim on its pre-narrowed candidate list.
- **Not `.filters-row`:** that class is a two-column grid built for the exercises
  page's two selects; with a single select here it would leave an empty cell, so
  the two fields stack full-width inside `.filters` instead.
- **Out-of-scope fix carried on this branch:** `day-nav.integration.test.tsx`
  grabbed the stepper buttons with `getByRole` right after awaiting only the
  heading, losing a race under parallel load. Latent since it was written, it
  surfaced here because this change adds a test file and shifts worker
  scheduling. Fixed to `await findByRole`, matching its sibling tests
  (commit `ae06ef3`).
- **Not visually verified in a browser** at the time of implementation; the
  390px check was a CSS review. The dev server was run afterwards for a manual
  look.
