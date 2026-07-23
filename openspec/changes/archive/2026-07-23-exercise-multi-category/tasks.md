# Implementation Tasks: Multiple Categories per Exercise

**Change ID:** `exercise-multi-category`

---

## Phase 1: Data model + migration (the risk surface)

- [x] 1.1 `src/db/types.ts`: `Exercise.categoryId?: number` → `categoryIds:
      number[]`. Remove `Category.reserved` (retired) and, if unused elsewhere,
      the `UNCATEGORIZED` export stays only for the migration.
- [x] 1.2 `src/db/db.ts`: Dexie **v6**. New store line
      `exercises: '++id, name, *categoryIds'` (multiEntry). `.upgrade`:
      for each exercise set `categoryIds = (categoryId != null && categoryId !==
      reservedId) ? [categoryId] : []`, `delete categoryId`; then **delete the
      reserved "Sem categoria" category** record (looked up by name). Resolve the
      reserved id inside the upgrade before rewriting exercises.
- [x] 1.3 `src/db/repos.ts`: `createExercise`/`updateExercise` take
      `{ name, mediaUrl?, categoryIds: number[] }`. `deleteCategory`: remove the
      id from every exercise's `categoryIds` (iterate/modify), then delete the
      category — **no reserved reassignment**. Remove `ensureUncategorized`,
      `ensureUncategorizedTx`, and the reserved-delete guard.
- [x] 1.4 `src/db/repos.test.ts`: **migration round-trip** — open a **v5** DB,
      seed exercises (one categorized, one on the reserved bucket, one unset),
      reopen at v6, assert `categoryIds` for each and that the reserved category
      is gone. Plus: create/update with several categories; delete-a-category
      removes it from all exercises (one left empty).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes — the `categoryId` → `categoryIds` type change
      flagged every stale read/write (~15 sites); nothing missed silently
- [x] Data-layer + migration tests pass — `migration.test.ts` (2) opens a real
      **v5** DB and asserts the v6 result exercise-by-exercise; category-delete
      removes-from-list test in `repos.test.ts`

---

## Phase 2: Derivation, filters, portability

- [x] 2.1 `src/lib/days.ts`: `dayCategoryNames` collects **each** exercise's
      `categoryIds` (flat), distinct, first-appearance order.
- [x] 2.2 `src/lib/exerciseFilters.ts`: category filter — a specific category
      matches `categoryIds.includes(id)`; `'none'` matches `categoryIds.length ===
      0`. Update its `Exercise`-shape type.
- [x] 2.3 `src/data/portability.ts`: export exercises with `categoryIds`;
      `parseBackup`/import **normalize** old docs — `categoryId` (singular) →
      `categoryIds: categoryId != null ? [categoryId] : []`, and **drop reserved
      categories** (empty any references to them). `generateExample` maps the
      bundled `categoryId` → `categoryIds: [remapped]`.
- [x] 2.4 Tests: `days.test.ts` union derivation; `exerciseFilters.test.ts`
      includes/empty; `portability.test.ts` old-backup (singular + reserved)
      round-trip and a multi-category round-trip.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `days` (union), `exerciseFilters` (includes/empty), `portability`
      (multi-category round-trip + old singular+reserved back-compat) tests pass

---

## Phase 3: UI — picker + display

- [x] 3.1 `ExercisesPage.tsx` (`ExerciseFormPage`): replace the category `<select>`
      with **toggle chips** (state `categoryIds: number[]`, tap to add/remove).
      Label "Categorias"; none selected is valid (uncategorized).
- [x] 3.2 `ExercisesPage.tsx` (list row): show **all** category names joined `·`,
      or "Sem categoria" when empty (reuse the day-subtitle join helper).
- [x] 3.3 `ExerciseDetailPage.tsx`: the single category chip → **one chip per
      category** (none → no chip, or a "Sem categoria" chip — match the list).
- [x] 3.4 `HomePage.tsx` (day's exercise row): show the exercise's categories
      (joined), not a single one.
- [x] 3.5 `DaysPage.tsx` (`DayForm` preview + `catNameOf`): show all categories.
- [x] 3.6 `CategoriesPage.tsx`: no reserved row to render or guard; the delete
      flow just removes the category (the confirm copy can mention exercises lose
      the tag).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `multi-category.integration.test.tsx` (4): chip create with two categories,
      none-selected → uncategorized, edit drops one, delete-category removes it

---

## Phase 4: Integration & Polish

- [x] 4.1 Integration test: create an exercise with two categories via the chips →
      it appears with both on the list and contributes both to a day's derived
      categories; remove one category (delete it) → the exercise keeps the other.
- [x] 4.2 Update any test/fixtures that assumed singular `categoryId`
      (grep `categoryId:` in tests).
- [x] 4.3 **Real-browser pass** (headless Chromium): the migration on a seeded v5
      DB yields the right `categoryIds` and no reserved category; the chip picker
      toggles; a compound exercise shows both categories on Home and in a day's
      summary; the `where('categoryIds').equals(id)` indexed path returns the
      right exercises.
- [x] 4.5 (added) **Real-browser migration**, done cleanly by seeding a **v5**
      database on a non-app page (Playwright route) THEN first-loading the app, so
      MyOneGymDB opens the pre-existing v5 DB and runs the v6 upgrade: `Supino v5`
      (Peito) → `[1]`, `Alongamento v5` (reserved) → `[]`, `Prancha v5` (unset) →
      `[]`, old `categoryId` field gone, reserved "Sem categoria" deleted — matches
      the jsdom test. (A first attempt failed as a harness artifact: booting the app
      first pre-created a fresh v6 DB, and SPA navigation doesn't re-open it.) Also
      verified in-app: a compound exercise created via chips stores `[3,7]`, the
      list shows "Bíceps · Cardio", and a new day unions both.
- [x] 4.4 `README.md`: exercises can have multiple categories; "Sem categoria" is
      an empty list, not a reserved category.
- [x] 4.6 (fix, reported post-implementation) **The category filter crashed on an
      exercise with a missing `categoryIds`.** `filterExercises` read
      `exercise.categoryIds.length` / `.includes()` directly, so **any** filter
      selection other than "Todas" threw `Cannot read properties of undefined` when
      the DB held a record with `categoryIds` undefined (a leftover from an
      intermediate v6 state that the once-only migration won't re-run on). No
      current code path produces that shape — but a view filter must not crash on
      it. Made the read null-safe (`exercise.categoryIds ?? []`, matching the
      display helper), treating such a record as uncategorized. Regression test in
      `exerciseFilters.test.ts` (reproduced the exact TypeError first); confirmed
      in a real browser with a broken record injected — all 10 filters work, no
      crash. Such records self-heal on the next edit-and-save.

**Quality Gate:** PASSED
- [x] All tests pass — 229/229 (218 before + 11 new)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
