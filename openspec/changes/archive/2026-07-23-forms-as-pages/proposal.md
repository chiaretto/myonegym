# Proposal: Create/Edit Forms as Pages, Not Modals

**Change ID:** `forms-as-pages`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** Every create/edit form — gym, category,
  exercise, training day — opens in a **bottom-sheet modal**. On a phone a modal
  is a cramped, capped (`88vh`) surface stacked over the list, and it is **not a
  real screen**: the browser **Back button dismisses the whole app view** instead
  of closing the form, the form is **not deep-linkable**, and a half-filled form
  is lost if the sheet is dismissed by a stray backdrop tap.
- **Who is affected?** Anyone adding or editing their catalog — the day form
  especially, whose exercise picker + reorder is tall and fights the sheet's
  height cap.
- **What's the current pain point?** These are **editing screens wearing a modal
  costume**. A modal is right for a quick confirm or a photo preview; it is wrong
  for a multi-field form with its own navigation, where the user expects Back to
  mean "back to the list", a shareable/reloadable URL, and room to work.

## Proposed Solution

Turn each of the four **create/edit forms into a real route**, reusing the
patterns already in the app (`BackBar`, the floating `ActionBar` from
`floating-action-bars`).

- **New routes** (8): for each of gyms / categories / exercises / days,
  `/settings/<kind>/new` and `/settings/<kind>/:id/edit`.
- **List → form**: the **"+ Novo…"** button (already in the list's `ActionBar`)
  **navigates** to `…/new` instead of opening a sheet; a row's **edit** control
  navigates to `…/:id/edit`.
- **The form page**: a `BackBar` (Back → the list), the same fields as today, and
  **Cancelar / Salvar in a floating `ActionBar`** (consistent with the rest of the
  app). Saving persists and navigates back to the list; Cancelar navigates back.
- **Edit loads by id** (live query); a **missing id** (deleted, bad URL) shows a
  not-found state with a way back, never a crash.
- **Behaviour preserved exactly**: the gym form's *copy weights from another gym*
  and its *activate-the-first-gym* + reconcile side-effect; the exercise form's
  media preview; the day form's exercise picker/reorder and its **exercise
  preview** (which stays a small modal — it's a read-only peek, not a form).

**What stays a modal** (not cadastro/edição, out of scope): the **active-gym
selector**, the **photo viewer**, the **exercise preview** inside the day form,
and the **confirmation dialog**. These are quick, transient, single-purpose — the
right use of a sheet.

## Scope

### In Scope
- 8 new routes in `App.tsx`.
- 4 form-page components (gym, category, exercise, day) — the existing `*Form`
  bodies, moved out of their `Sheet` onto a page with a `BackBar` + `ActionBar`.
- List pages drop their `editing` state, `<Sheet>` form, and `Sheet` import; their
  "+ Novo…" and edit controls navigate.
- Edit-by-id loading + not-found handling.
- Update `action-bars.integration.test.tsx` (its "+ Novo…" cases assert a dialog
  today; now they assert navigation) + new form-page tests.

### Out of Scope
- **The four modals that aren't forms** — active-gym selector, photo viewer,
  in-day exercise preview, confirmation dialog — unchanged.
- **The inline editors** (Peso alvo / Observações on the exercise detail) — already
  inline panels, not modals; untouched.
- **New fields or validation** — same inputs, same `repos` calls, same messages.
- **Home / Sessions / Data / Appearance** screens.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Same `repos` create/update/delete calls. |
| State | No | Removes per-list `editing` state; the URL carries the mode instead. |
| Routing | **Yes** | 8 new routes; no route removed. |
| UI | **Yes** | 4 form pages; 4 list pages lose their sheet form; nav wiring; `ActionBar` for form actions. |
| CSS | Minimal | Reuse `.field`, `.action-bar`, `has-action-bar`; the form `.sheet-actions` styling is no longer used by these forms (still used by remaining sheets). |
| Deps | No | React Router already present. |
| Tests | **Yes** | Update the `action-bars` dialog assertions → navigation; new create/edit-via-page + back + not-found tests. |
| i18n / copy | No | Same labels/titles (now page headers). |

## Architecture Considerations

- **Reuse, not invent.** Form pages are `BackBar` + `.field`s + `ActionBar` — the
  three primitives every other screen already uses. No new component *kind*.
- **The URL becomes the mode.** `editing: Entity | 'new' | null` (component state)
  becomes the route (`/new`, `/:id/edit`, or the list). This is the same "less
  state, the URL is the source of truth" move as `floating-stepper-nav` — and it
  is what makes Back, reload, and deep-links work for free.
- **Route specificity.** `/settings/gyms/new` (literal) and
  `/settings/gyms/:id/edit` don't collide; ids are numbers, never `"new"`. The
  list route `/settings/gyms` is unaffected.
- **Preserving the gym side-effect.** The list's `onSaved` currently activates the
  first-ever gym and reconciles. That logic moves into the gym form page (it has
  the new id and the before-count), then navigates back — behaviour identical.
- **The day form's nested preview stays a sheet.** It's a read-only exercise peek
  triggered from within the form; a modal is correct there. Only the **form
  itself** leaves the sheet.
- **One spec touches this**: `app-foundation`'s *Floating Action Bar* requirement
  currently uses the **"Novo dia" modal** as its sticky-footer example — false
  once Novo dia is a page. Its modal-footer clause still holds for the remaining
  modals; the example is updated.

## Success Criteria

- [x] Each of gym / category / exercise / day opens a **full page** (not a sheet) to create and to edit, at its own URL.
- [x] "+ Novo…" navigates to `…/new`; a row's edit navigates to `…/:id/edit`.
- [x] The browser **Back button** (and the `BackBar`) returns to the list without leaving the app.
- [x] Reloading a `…/new` or `…/:id/edit` URL shows the form (deep-linkable).
- [x] Saving persists and returns to the list with the change visible; Cancelar returns without saving.
- [x] Editing a **non-existent id** shows a not-found state, not a crash.
- [x] Every current behaviour holds: copy-weights, activate-first-gym, media preview, day picker/reorder + its exercise preview.
- [x] The four non-form modals still behave as modals.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Losing the gym *activate-first* / reconcile side-effect in the move | Med | **High** | Move it verbatim into the gym form page; a test asserts the first created gym becomes active. |
| Edit route with a stale/bad id crashes | Med | Med | Live-query the entity; render a not-found + back when absent (mirrors the session/exercise detail pattern). |
| The day form's picker/reorder or nested preview regresses in the move | Med | **High** | Move the body verbatim; the preview stays a sheet; a test creates a day with ordered exercises via the page. |
| Existing tests assume the form is a modal | High | Low | Only `action-bars.integration.test.tsx` does; update its 4 assertions to navigation. Others seed via repos. |
| A dangling `editing`/`Sheet` reference left in a list page | Med | Low | Typecheck + a grep sweep for `setEditing`/`Sheet` in the four list pages. |
| Route order/typos send `/new` to the edit page | Low | Med | Distinct literal vs `:id` segments; a deep-link test for each `/new` and `/:id/edit`. |

---

## Implementation Notes (what the build confirmed)

Pure reuse again: each form page is `BackBar` + `.field`s + `ActionBar` — no new
component kind, just the three primitives every screen already uses. The
`editing: Entity | 'new' | null` component state is gone; the **URL is the mode**
(`/new`, `/:id/edit`, or the list), which is what makes Back, reload and
deep-links work for free — the same move as `floating-stepper-nav`.

**The gym side-effect survived the move** — the "first gym becomes active" +
reconcile logic that lived in the list's `onSaved` is now in the gym form page,
with a test asserting the first created gym is active.

**Edit-by-id loads via a live query** with a not-found branch (mirrors the
session/exercise detail pattern), so a deleted-or-bad id shows a message + back,
not a crash.

**Test impact was as scoped**: only `action-bars.integration.test.tsx` was
coupled (it asserted a `role="dialog"` after "+ Novo…"; now it asserts navigation
to the form page + Salvar in the `.action-bar`). The days/exercises integration
tests seed via repos and passed untouched. 7 new page tests cover create, edit,
Cancelar, deep-link, not-found, the gym side-effect, and the day picker + preview.

**Verification.** jsdom for logic; a real browser for what it can't show —
create→Salvar→list, browser **Back**→list, deep-linked edit prefilled, the
day-form preview still a modal, and the form's action bar covering no content at
font-scale 2.0. One script false-alarm worth recording: the example dataset
already has an **"Ombros"** category, so re-creating it correctly kept the form
open with a duplicate-name error — the product working as intended.

**The load flake persists** (unrelated): on a busy machine two untouched
`App.onboarding` tests time out on `findBy*`; a clean full run is 218/218. The
shared `db` singleton + zustand stores across test files remain a latent
fragility, not a regression from this change.

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** 0 days (created, implemented and archived 2026-07-23)
**Outcome:** Successfully implemented

### Files Modified
- `src/App.tsx` — 8 new routes (`/settings/<kind>/new` and `/:id/edit` for gyms,
  categories, exercises, days)
- `src/features/settings/CategoriesPage.tsx` — list navigates; exports
  `CategoryFormPage`
- `src/features/settings/GymsPage.tsx` — exports `GymFormPage`; the
  activate-first-gym + reconcile side-effect moved into the form page
- `src/features/settings/ExercisesPage.tsx` — exports `ExerciseFormPage`
- `src/features/settings/DaysPage.tsx` — exports `DayFormPage`; the exercise
  preview stays a nested `<Sheet>`
- `src/styles/global.css` — `.action-bar .form-actions` (Cancelar/Salvar side by
  side in the page's action bar)
- `src/features/settings/action-bars.integration.test.tsx` — the 4 create-screen
  cases assert navigation to the form page, not a modal dialog
- `src/features/settings/forms-as-pages.integration.test.tsx` — **new** (7 tests)
- `README.md` — create/edit are dedicated pages; modals reserved for
  confirms/pickers/previews

**No new dependencies**; presentation/routing only. Net state change: the per-list
`editing` state is removed (the URL carries the mode).

### Specs Updated
- `openspec/specs/app-foundation/spec.md`:
  - **added** *Create and Edit on Dedicated Pages* (6 scenarios): create/edit are
    routes, deep-linkable, Back returns to the list, not-found for a deleted id;
    modals reserved for confirms/pickers/previews
  - **modified** *Floating Action Bar for Primary Actions*: create/edit pages'
    Cancelar/Salvar are in the bar; the stale "Novo dia modal" sticky-footer
    example is replaced with a modal that still exists (photo viewer / confirmation)

### Verification
- `npm test` (218/218 on a clean run), `npm run typecheck`, `npm run build` — pass
- Only `action-bars.integration.test.tsx` was coupled (dialog → navigation); the
  days/exercises integration tests seed via repos and passed untouched
- 7 new page tests: create, edit, Cancelar, deep-link, not-found, the gym
  activate-first side-effect, and the day picker + still-modal preview
- Real-browser pass (headless Chromium): create→Salvar→list; browser **Back** from
  an edit page → list; deep-linked edit prefilled; day-form preview still a modal;
  the form's action bar covers no content at font-scale 2.0. A script false-alarm
  (re-creating the example's existing "Ombros" category correctly stayed on the
  form with a duplicate error) confirmed the validation path, not a bug

### Worth carrying forward
- **The load flake persists** (pre-existing, unrelated): on a busy machine two
  untouched `App.onboarding` tests time out on `findBy*`; a clean full run is
  218/218. Root cause remains the shared `db` singleton + zustand stores across
  test files — worth isolating if it keeps recurring.
- The **form-page shape** (`BackBar` + `.field`s + `ActionBar`, URL-as-mode,
  live-query-by-id with a not-found branch) is now the template for any future
  create/edit screen — reuse it.
