# Implementation Tasks: Create/Edit Forms as Pages

**Change ID:** `forms-as-pages`

---

## Phase 1: Routes + the simplest form (category)

- [x] 1.1 `App.tsx`: add the 8 routes — `/settings/<kind>/new` and
      `/settings/<kind>/:id/edit` for `gyms`, `categories`, `exercises`, `days`.
      Keep the four list routes.
- [x] 1.2 `CategoriesPage.tsx`: extract `CategoryForm` into a **page**
      (`CategoryFormPage`): `BackBar title="Nova categoria"/"Editar categoria"
      to="/settings/categories"`, the name `.field`, and **Cancelar/Salvar in an
      `<ActionBar>`** (`has-action-bar` on `<main>`). Load the category by id for
      edit (live query); not-found → message + back. Save → `repos` call → nav to
      the list; Cancelar → nav to the list.
- [x] 1.3 `CategoriesPage` (list): drop `editing` state + the `<Sheet>` form +
      `Sheet` import; "+ Nova categoria" and the row pencil **navigate** to
      `…/new` / `…/:id/edit`.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Category create/edit via the page works (in `forms-as-pages.integration.test.tsx`)

---

## Phase 2: Gym + category parity (preserve side-effects)

- [x] 2.1 `GymsPage.tsx`: `GymFormPage` — name `.field`, the **copy-weights**
      select (new + gyms exist only), Cancelar/Salvar in an `ActionBar`.
- [x] 2.2 **Preserve the side-effect**: after a **new** gym when there were **zero**
      gyms, `setActiveGym(newId)`; always `reconcile()`; then nav to the list.
      This logic lived in the list's `onSaved` — move it into the page verbatim.
- [x] 2.3 `GymsPage` (list): drop `editing`/`Sheet`; "+ Nova academia" + row
      pencil + the active toggle unchanged; create/edit navigate.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Gym tests: create/edit; a test asserts the **first** created gym becomes active; copy-weights preserved

---

## Phase 3: Exercise + Day (the complex forms)

- [x] 3.1 `ExercisesPage.tsx`: `ExerciseFormPage` — name, media URL, category
      select, and the **media preview**; Cancelar/Salvar in an `ActionBar`. The
      list keeps its search/filters; drop `editing`/`Sheet`; create/edit navigate.
- [x] 3.2 `DaysPage.tsx`: `DayFormPage` — name + the **selected-exercises list
      (reorder/remove)** + the **available list (add)**; the **exercise preview
      stays a nested `<Sheet>`** inside the page. Cancelar/Salvar in an `ActionBar`.
- [x] 3.3 `DaysPage` (list): drop `editing`/`Sheet`; the day row (tap-to-edit) and
      "+ Novo dia" navigate; reorder (up/down) + delete unchanged.
- [x] 3.4 Confirm no `setEditing` / stray `Sheet` import remains in the four list
      pages (grep sweep).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Exercise + Day create/edit via the page; day picker + preview verified (test + real browser)

---

## Phase 4: Tests + spec-driven copy

- [x] 4.1 Update `action-bars.integration.test.tsx`: the 4 "+ Novo…" cases assert
      **navigation to the form page** (its heading/URL), not `role="dialog"`. Keep
      the "button is in `.action-bar`" checks.
- [x] 4.2 New `forms-as-pages` integration tests: create + edit each entity through
      its page; Back returns to the list; a deep-link to `…/new` and `…/:id/edit`
      renders the form; a bad `:id` shows not-found.
- [x] 4.3 Verify the days/exercises integration tests (which seed via repos) still
      pass untouched.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] All settings tests pass; `action-bars` updated (navigation, not dialog); 7 new page tests

---

## Phase 5: Integration & Polish

- [x] 5.1 **Real-browser pass** (headless Chromium): for each entity, drive
      list → "+ Novo…" → fill → Salvar → back on the list with the new item; open
      an item → edit → Salvar → change visible; the browser **Back button** from a
      form returns to the list; the day form's exercise preview opens; the
      Salvar/Cancelar `ActionBar` covers no content at font-scale 1.0 and 2.0.
- [x] 5.4 (added) Real-browser findings: create→Salvar returns to the list;
      browser **Back** from an edit page returns to the list; deep-linking an edit
      URL prefills the form; the day-form preview is still a modal; the form's
      action bar covers no content at font-scale 2.0. One script false-alarm: the
      example dataset already has an "Ombros" category, so creating "Ombros" again
      correctly stayed on the form with a duplicate error — product working as
      intended, not a bug.
- [x] 5.2 Confirm the four non-form modals (gym selector, photo viewer, in-day
      preview, confirm) still open as sheets.
- [x] 5.3 `README.md`: create/edit are now dedicated pages/routes (deep-linkable,
      Back-friendly); modals are reserved for confirms/pickers/previews.

**Quality Gate:** PASSED
- [x] All tests pass — 218/218 (211 before + 7 new; `action-bars` count unchanged)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
