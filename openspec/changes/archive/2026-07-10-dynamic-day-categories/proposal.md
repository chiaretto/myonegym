# Proposal: Dynamic Day Categories

**Change ID:** `dynamic-day-categories`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Implements:** GitHub issue #1 — "Alterar a listagem de dias de treino"

---

## Problem Statement

- **What problem are we solving?** A training day currently carries a **single,
  manually-chosen category** (`Day.categoryId`), shown on the Home accordion and
  the Settings day list. That is redundant and can be wrong: a day usually mixes
  several muscle groups (e.g. Peito + Tríceps), and the manual label has to be
  kept in sync by hand with the exercises actually in the day.
- **Who is affected?** Every user browsing their days — the label may not reflect
  what the day actually trains.
- **Current pain point?** The day's category is decoupled from its content. Issue
  #1 asks that the day listing's categories be **dynamic, coming directly from
  the categories of the exercises added to the day**.

## Proposed Solution

Derive a day's categories from its exercises, and drop the manual day category.

- **Derived categories.** A day's categories are the **distinct categories of the
  exercises currently in the day**, in first-appearance order (following the
  day's exercise order). Uncategorized exercises are ignored.
- **Listings show the derived set.** The Home accordion day sub-line and the
  Settings → Dias list render the derived categories (e.g. "Peito · Tríceps").
  When no exercise in the day has a category, listings fall back to a neutral
  summary (the exercise count, as today).
- **Always in sync.** Because it is computed from the current exercises, the
  label updates automatically when exercises are added/removed or an exercise's
  category changes — no manual upkeep.
- **Remove the manual field.** `Day.categoryId` and the "Categoria (opcional)"
  selector in the day form are removed; the category-reassign step for days in
  `deleteCategory` is no longer needed.

## Scope

### In Scope
- A derivation helper: `(day, exerciseMap, categoryMap) → ordered distinct
  category names`.
- Home accordion day sub-line + Settings day list show derived categories, with
  the exercise-count fallback.
- Remove `Day.categoryId`: the type, the `createDay`/`updateDay` inputs, the day
  form's category selector, and the day branch of `deleteCategory`.
- Keep full-backup import backward compatible (old day records may still carry a
  stray `categoryId`; it is simply ignored).

### Out of Scope
- Changing how **exercises** are categorized (unchanged — the source of truth).
- Filtering/sorting days by category, or a category chip UI beyond the sub-line.
- A migration to strip `categoryId` from stored day records (harmless if left;
  it is ignored). Deferred.
- Session snapshots (they store `dayName`, never a day category — unaffected).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No (schema) | Dexie `days` store has no category index; dropping the field needs no migration. Old records keep an ignored `categoryId`. |
| Data layer | Yes | `Day` type drops `categoryId`; `createDay`/`updateDay` inputs drop it; `deleteCategory` drops the day-reassign block; add a `dayCategoryNames` helper. |
| State | No | Derived via existing `useExerciseMap` / `useCategoryMap`; no new store. |
| UI | Yes | `HomePage` day sub-line and `DaysPage` (list sub-line + remove the form's category `<select>`). |
| Import/Export | Yes (small) | `BackupDoc.days` no longer types `categoryId`; old backups still import (extra field ignored). |
| i18n / copy | Yes (small) | Remove the "Categoria (opcional)" label; no new strings. |

## Architecture Considerations

- **Single source of truth.** Categories live on **exercises**; a day just
  references exercises. Deriving the day's categories removes duplicated state
  and the sync burden — a cleaner model.
- **Pure derivation.** The helper is a pure function of the day + the exercise
  and category maps (already loaded via live-query hooks), so listings stay
  reactive with no extra plumbing.
- **Backward-compatible data.** Removing a field from the TS model does not
  touch the Dexie schema; existing day rows are read fine and their stray
  `categoryId` is ignored. Full-backup import of older documents still works.
- **Touches two specs.** `training-days` (a day no longer has a manual category;
  categories are derived) and `home-navigation` (the accordion shows the derived
  set).

## Success Criteria

- [ ] A day's listing shows the **distinct categories of its exercises** (e.g.
      "Peito · Tríceps"), updating automatically as exercises change.
- [ ] Days with no categorized exercises fall back to the exercise count.
- [ ] The day form no longer has a manual category selector; days are created
      and edited by name + exercises only.
- [ ] `Day.categoryId` is removed from the model and code paths; `deleteCategory`
      no longer touches days.
- [ ] Older full-backup JSON (day records with `categoryId`) still imports.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with tests for the
      derivation (distinct, ordered, ignores uncategorized, fallback).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Removing `Day.categoryId` breaks a code path (repos, backup, tests) | Med | Med | Sweep all `day.categoryId` / `categoryId` references (Home, DaysPage, repos `deleteCategory`, `generateExample`, tests) and update in one pass; typecheck catches stragglers. |
| Many categories overflow the day sub-line | Low | Low | The sub-line already wraps/ellipsizes; join with " · " and let it wrap. |
| Loss of the manual label users had set | Low | Low | The derived label reflects real content; the manual one was redundant. Data isn't deleted, just ignored. |
| Older backup import regresses | Low | Med | Import tolerates extra fields (Dexie `bulkAdd`); covered by a round-trip test with a legacy day. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/db/types.ts` (drop `Day.categoryId`), `src/db/repos.ts` (`createDay`/`updateDay`, `deleteCategory`)
- `src/lib/days.ts` (new — `dayCategoryNames`/`daySubtitle`), `src/data/portability.ts` (`generateExample`)
- `src/features/home/HomePage.tsx`, `src/features/settings/DaysPage.tsx`, `README.md`
- Tests: `src/lib/days.test.ts`, `src/features/settings/days.integration.test.tsx`, `src/data/portability.test.ts`

### Specs Updated
- `openspec/specs/training-days/spec.md` — modified **Register a Training Day** and **Edit and Delete Training Days**; added **Derived Day Categories**
- `openspec/specs/home-navigation/spec.md` — modified **Home Accordion of Training Days** (header shows derived categories)

### Notes
- Implements GitHub issue #1. Code shipped to `main` in commit `462cb96`; this
  archive consolidates the specs. The day-edit polish (exercise category + details
  preview) and the shared Sheet close button rode in the same commit but are
  UI-only (not part of this change's requirements).

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (63/63) — all pass
