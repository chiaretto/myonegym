# Proposal: Show Training Days on the Exercises List

**Change ID:** `exercise-list-show-days`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10

---

## Problem Statement

- **What problem are we solving?** On **Configurações → Exercícios**, each item
  shows its name, thumbnail, and category — but **not which training days it
  belongs to**. To find out where an exercise is used, the user has to open each
  day and scan its exercise list. The exercise *detail* already shows this (a
  "day" chip), but the management **list** does not.
- **Who is affected?** Anyone maintaining their exercise catalog who wants to
  know, at a glance, where each exercise is used (e.g., before editing/deleting).
- **Current pain point?** No visibility of day usage in the exercises list.

## Proposed Solution

Add, to each exercise row, the **training days it is registered in**.

- **Derive from days.** For each exercise, the days it belongs to are the days
  whose `exerciseIds` include it (a helper `dayNamesForExercise(exerciseId,
  days)`), listed in the days' **display order** (the user-defined order).
- **Show on the row.** Under the category line, add a compact **days line**
  (e.g., a small calendar glyph + `Dia 1 · Dia 4`). When the exercise is in **no
  day**, show a neutral hint (e.g., "Nenhum dia").
- **Reactive.** Uses the existing `useDays` / `useExercises` live queries, so the
  line updates automatically when days/exercise membership change.

## Scope

### In Scope
- `dayNamesForExercise(exerciseId, days)` helper (in `src/lib/days.ts`) + test.
- `ExercisesPage` list rows show the day names for each exercise (with an
  empty-state hint when it's in none).

### Out of Scope
- The exercise **detail** page (already shows a day chip) — unchanged.
- Making the day names tappable/links (just display for now).
- Any change to how exercises are added to days (that stays in the day form).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | Yes (small) | Add `dayNamesForExercise` helper in `src/lib/days.ts`. |
| State | No | `ExercisesPage` adds `useDays()` (existing hook). |
| UI | Yes | `ExercisesPage` rows render the days line. |
| i18n / copy | Yes (small) | "Nenhum dia" hint. |

## Architecture Considerations

- **Pure derivation, mirrors `dayCategoryNames`.** The days-for-exercise helper
  is a pure function of the exercise id + the (already ordered) days list,
  consistent with the derived-day-categories helper.
- **Respects day order.** Because it filters the ordered `useDays` result, the
  day names appear in the user's day order (from `reorder-training-days`).
- **No data changes.** Membership already lives on `Day.exerciseIds`; this only
  reads it.

## Success Criteria

- [ ] Each exercise row on the Exercises list shows the **day names** it belongs
      to (e.g., "Dia 1 · Dia 4"), in the days' display order.
- [ ] An exercise in **no day** shows a neutral hint (e.g., "Nenhum dia").
- [ ] The line updates live when an exercise is added to / removed from a day.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with a helper test
      and a UI test for the days line.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| An exercise in many days makes a long line | Med | Low | Let it wrap; the line is secondary/muted. (Could truncate to "N dias" later if needed.) |
| Row grows taller with an extra line | Low | Low | Acceptable; the days line is compact. |
| Perf: filtering days per exercise | Low | Low | Lists are small; O(exercises × days) is trivial. |

---

## Archive Information

**Archived:** 2026-07-10
**Outcome:** Successfully implemented

### Files Modified
- `src/lib/days.ts` — `dayNamesForExercise(exerciseId, days)` helper
- `src/lib/days.test.ts` — helper unit tests
- `src/features/settings/ExercisesPage.tsx` — per-row day labels (outlined chips)
- `src/features/settings/exercises.integration.test.tsx` — days-per-item test
- `src/styles/global.css` — `.chip.sm` / `.chip-row` for the day labels
- `README.md` — Settings note

### Specs Updated
- `openspec/specs/exercises/spec.md` — ADDED "Show Training Days on the Exercises List"
