# Proposal: Multiple Categories per Exercise

**Change ID:** `exercise-multi-category`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** An exercise has **exactly one** category
  (`categoryId`). But real exercises are **compound**: a bench press is Peito
  *and* Tríceps; a barbell row is Costas *and* Bíceps. Forcing one category
  either misfiles the exercise or loses the secondary muscle — and a training
  day's derived category summary ("Peito · Tríceps") is poorer for it.
- **Who is affected?** Anyone cataloguing compound lifts, and anyone reading a
  day's muscle summary on Home or in Settings.
- **What's the current pain point?** You pick the "main" muscle and drop the
  rest, or you create awkward combo categories. The data can't say what the
  exercise actually trains.

## Proposed Solution

Let an exercise carry **zero or more categories** — `categoryIds: number[]` — and
**retire the reserved "Sem categoria" bucket**: an exercise with an **empty**
category list *is* uncategorized (shown as the label "Sem categoria"), no special
record required (confirmed in review).

- **Model**: `Exercise.categoryId?: number` → `categoryIds: number[]`. A Dexie
  **v6** migration converts each exercise (`categoryId` → `[categoryId]`, or `[]`
  when it was the reserved bucket / unset) and **deletes the reserved "Sem
  categoria" category**. The index becomes **multiEntry** (`*categoryIds`) so
  "exercises in category X" stays an indexed query.
- **Category deletion** simply **removes that category from every exercise's
  list**; an exercise left with an empty list is uncategorized. No reassignment,
  no reserved bucket, nothing to protect from deletion.
- **Day categories** = the **union** of the day's exercises' categories, in
  first-appearance order (each exercise now contributes several).
- **Filters**: "category X" matches exercises whose list **includes** X; "no
  category" matches an **empty** list.
- **Form UI**: the single `<select>` becomes **toggle chips** — tap to add/remove;
  none selected = uncategorized (confirmed).
- **Display**: the list row, the exercise detail, the Home row, and the day
  preview show **all** of an exercise's categories (joined `·`), or "Sem
  categoria" when empty.
- **Backup**: exports `categoryIds`; **old backups** (singular `categoryId`, and
  possibly a reserved category) still import — the singular is mapped to a list
  and any reserved category is dropped.

## Scope

### In Scope
- `Exercise.categoryIds: number[]`; Dexie **v6** migration (+ retire reserved).
- `repos`: `createExercise`/`updateExercise` take `categoryIds`; `deleteCategory`
  removes the category from exercises (no reserved reassignment); remove
  `ensureUncategorized` and the reserved-category concept.
- `exerciseFilters`: category filter by **includes** / empty.
- `days` derivation: union of each exercise's categories.
- `portability`: export `categoryIds`; import maps old singular `categoryId` and
  drops reserved categories; `generateExample` maps the bundled data.
- UI: toggle-chip multi-select on the exercise form; multi-category display on the
  list, detail, Home row, and day preview; `CategoriesPage` no longer shows or
  guards a reserved category.

### Out of Scope
- **Renaming/merging categories**, category colors/icons, ordering categories.
- **Per-gym or per-day category overrides** — categories stay a global property of
  the exercise.
- Changing how **weights/notes/photos** key off `(gym, exercise)` — untouched.
- A migration UI — the schema upgrade is silent and automatic.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | **Yes** | `Exercise.categoryIds: number[]`; Dexie **v6** upgrade (convert + drop reserved); `*categoryIds` multiEntry index. |
| Data layer | **Yes** | `repos`: exercise create/update signature; `deleteCategory` rewrite; remove `ensureUncategorized`/reserved. |
| Portability | **Yes** | Export `categoryIds`; import back-compat (singular → list; drop reserved); example mapping. |
| State | No | Live queries already reactive. |
| UI | **Yes** | Toggle-chip picker; multi-category display in 4 places; categories list loses the reserved row. |
| Deps | No | — |
| Tests | **Yes** | Migration round-trip, multi-category filter, day union, deletion-removes-from-list, backup back-compat, chip picker. |
| i18n / copy | Minimal | "Categoria" → "Categorias"; "Sem categoria" stays as the empty label. |

## Architecture Considerations

- **`categoryIds: []` is the single source of truth for "uncategorized."** Today
  there are *two* representations (a `null` `categoryId` and the reserved-bucket
  id); this change **unifies** them into one — an empty array — which is simpler
  to reason about and removes a whole category record and its guard rails.
- **multiEntry index.** `exercises: '++id, name, *categoryIds'` lets Dexie answer
  `where('categoryIds').equals(catId)` per-category without a table scan.
  `fake-indexeddb` supports multiEntry, so this stays unit-testable.
- **The migration is the risk surface.** v6 must: for each exercise, set
  `categoryIds` from the old `categoryId` (reserved/unset → `[]`), delete the old
  field; then delete the reserved category record. It runs once, silently, and is
  irreversible — so it gets a dedicated round-trip test seeded on a v5 database.
- **Backups are the second compat surface.** A backup predating this change has
  `exercises[].categoryId` (singular) and may include a reserved category.
  `parseBackup`/import normalize: `categoryId` → `categoryIds`, and reserved
  categories are dropped with their references emptied. New backups carry
  `categoryIds`.
- **Display reuses the day-subtitle join.** Showing an exercise's categories as
  "A · B" is the same join `dayCategoryNames` already does for days — one helper,
  reused.

## Success Criteria

- [x] An exercise can be created/edited with **0, 1, or several** categories via toggle chips.
- [x] The list, the exercise detail, the Home row, and the day preview show **all** of an exercise's categories (or "Sem categoria" when none).
- [x] A day's derived categories are the **union** of its exercises' categories, distinct, in first-appearance order.
- [x] The category filter matches exercises that **include** the chosen category; "no category" matches empty.
- [x] Deleting a category **removes it from every exercise**; an exercise with no categories left shows "Sem categoria"; nothing is orphaned.
- [x] Existing data upgrades: every pre-v6 exercise keeps its category (now as a one-element list); the reserved "Sem categoria" category is gone.
- [x] An **old backup** (singular `categoryId`) imports, mapping each to a one-element list; a reserved category in it is dropped.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Migration corrupts/loses categories** on real user data | Med | **High** | Deterministic v6 upgrade; a test opens a **v5** DB with data and asserts the v6 result exercise-by-exercise; verify in a real browser too. |
| A stray reference to the removed `categoryId` compiles no more but a runtime path is missed | Med | **High** | It's a **type change** (`categoryId` removed) — `tsc` flags every read/write; grep sweep as backstop. |
| multiEntry query behaves differently in a real browser than fake-indexeddb | Low | Med | Keep the filter logic in a pure function tested directly; verify the indexed query in a real browser. |
| Old backup with a reserved category resurrects it on import | Med | Med | Import drops reserved categories and empties references; a test imports such a doc. |
| Retiring the reserved category breaks the categories spec/UI (delete guard) | Med | Med | Remove the guard + the reserved row together; the categories spec's deletion requirement is rewritten. |
| "no category" filter and empty-list display drift apart | Low | Low | Both derive from `categoryIds.length === 0`; one predicate, tested. |

---

## Implementation Notes (what the build confirmed)

**Replacing the type (not keeping both) was the right call.** Turning
`categoryId?: number` into `categoryIds: number[]` made `tsc` enumerate every
stale read/write — ~15 sites across filters, day derivation, backup, four screens
and the share card, plus every test fixture. Nothing slipped through silently;
the compile error list *was* the worklist.

**The migration is proven twice.** A jsdom test opens a genuine **v5** database
(old `categoryId` schema + a reserved "Sem categoria" record), then opens the real
v6 `MyOneGymDB` on the same name so the upgrade fires — asserting each exercise's
`categoryIds` and that the reserved category is deleted, and that the
`*categoryIds` multiEntry index answers `where('categoryIds').equals(id)`. Then
the **same migration was confirmed in a real browser** (Chromium), seeding v5 on a
non-app page and first-loading the app: `[1]` / `[]` / `[]`, old field gone,
reserved category dropped.

**One display unification fell out for free.** Uncategorized had *two*
representations before (a `null` `categoryId` and the reserved-bucket id); it is
now a single one — an empty `categoryIds` — which deleted a whole category record
and its delete-guard. "Sem categoria" is now purely a label, computed by the same
`exerciseCategoryLabel` helper the day summary already used.

**Two harness gotchas, both noted in tasks:** (1) adding a compound exercise to a
*shared* filter fixture broke two neighbouring tests that enumerate the whole set
— fixed by giving the new inclusion test its own inline data; (2) the first
browser migration attempt was a false negative because booting the app pre-created
a fresh v6 DB and SPA navigation doesn't re-open it — the clean run seeds v5 before
the app's first load.

**Post-implementation fix (reported by the user).** The category filter crashed
for **any** selection other than "Todas": `filterExercises` read
`exercise.categoryIds.length`/`.includes()` directly, so a record with
`categoryIds` undefined (a leftover from an intermediate v6 build the once-only
migration won't re-run on) threw `Cannot read properties of undefined`. No current
code path creates that shape, but a view filter must not crash on it — the read is
now null-safe (`?? []`, matching the display helper), treating such a record as
uncategorized. Reproduced with a failing test first, then verified in a real
browser (a broken record injected → all 10 filters work). Such records self-heal
on the next edit-and-save.

**The load flake was quiet this run** — 228/228 on the recorded runs. The shared
`db`-singleton fragility across test files remains latent, unrelated to this change.

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** 0 days (created, implemented and archived 2026-07-23)
**Outcome:** Successfully implemented (+ one post-implementation filter fix)

### Files Modified
- `src/db/types.ts` — `Exercise.categoryId?` → `categoryIds: number[]`; removed
  `Category.reserved`
- `src/db/db.ts` — Dexie **v6**: `*categoryIds` multiEntry index + upgrade
  (convert each exercise; delete the reserved "Sem categoria" category)
- `src/db/repos.ts` — exercise create/update take `categoryIds`; `deleteCategory`
  removes the category from every exercise (no reserved reassignment); removed
  `ensureUncategorized` and the reserved concept
- `src/lib/days.ts` — `exerciseCategoryNames` / `exerciseCategoryLabel` helpers;
  `dayCategoryNames` now unions each exercise's categories
- `src/lib/exerciseFilters.ts` — category filter by inclusion / empty;
  **null-safe read** (the post-impl fix)
- `src/data/portability.ts` — export `categoryIds`; `parseBackup` normalizes old
  singular `categoryId` and drops reserved categories; `generateExample` maps
- UI — `ExercisesPage` (toggle-chip picker + multi-category list),
  `ExerciseDetailPage`, `SessionPage`, `SessionEntryPage`, `HomePage`,
  `DaysPage`, `shareModel`, `CategoriesPage` (no reserved row)
- `src/styles/global.css` — `.chip-select` / `.chip-toggle`
- Tests (**+11**): `migration.test.ts` (2), `multi-category.integration.test.tsx`
  (4), union/includes/back-compat additions, the filter-crash regression, and
  every fixture migrated from singular `categoryId`
- `README.md`

**No new dependencies.**

### Specs Updated
- `openspec/specs/exercises/spec.md` — *Register an Exercise* (zero or more
  categories; toggle-chip picker) and *Filter and Search* (category filter by
  inclusion) modified
- `openspec/specs/categories/spec.md` — *Handle Category Deletion Safely*
  rewritten: no reserved bucket; deletion removes the category from exercises
- `openspec/specs/training-days/spec.md` — *Derived Day Categories* now the union
  of each exercise's categories
- `openspec/specs/data-portability/spec.md` — *Import* maps old singular
  `categoryId` to a one-element list and drops a reserved category

### Verification
- `npm test` (229/229 on a clean run), `npm run typecheck`, `npm run build` — pass
- **Migration proven twice**: a jsdom test seeds a real **v5** DB and asserts the
  v6 result exercise-by-exercise (+ the multiEntry query); confirmed again in a
  real browser by seeding v5 on a non-app page and first-loading the app
- **Post-implementation fix** (user-reported): the category filter crashed for any
  non-"Todas" selection when a record had `categoryIds` undefined (a leftover from
  an intermediate v6 state). Reproduced with a failing test, made the filter read
  null-safe, and verified in a real browser (a broken record injected → all 10
  filters work). Such records self-heal on the next edit-and-save.

### Worth carrying forward
- **Replacing the type (not keeping both fields)** turned `tsc` into the complete
  worklist for a model change — the reliable way to find every read/write.
- **A view filter must be null-safe on IndexedDB data.** Persisted data can be in
  shapes the type system doesn't guarantee (old records, partial migrations,
  imported docs); the display helper already guarded with `?? []`, and the filter
  now matches. Apply the same defensiveness to any new reader of stored data.
- **The load flake persists** (pre-existing): different untouched tests time out on
  `findBy*` under CPU contention; clean runs are 229/229. The shared `db`-singleton
  + zustand stores across test files remain the latent cause.
