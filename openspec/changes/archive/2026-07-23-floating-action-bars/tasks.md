# Implementation Tasks: Floating Action Bars Across Screens

**Change ID:** `floating-action-bars`

---

## Phase 1: The shared ActionBar primitive

- [x] 1.1 `src/ui/ActionBar.tsx`: extract the measured fixed-bottom shell from
      `StepperBar` — a `ResizeObserver` publishes the bar's height to
      `--action-bar-h` on `<html>` (cleared on unmount); renders `children`;
      returns `null` when it has no children (no bar, no reservation).
- [x] 1.2 `src/styles/global.css`: rename `.stepper-bar` → `.action-bar`,
      `--stepper-h` → `--action-bar-h`, `.screen.has-stepper` →
      `.screen.has-action-bar`; update the `.toast` offset to `--action-bar-h`.
      Keep every value (fixed, 480px cap, safe-area padding, z-index, shadow).
- [x] 1.3 Refactor `src/ui/StepperBar.tsx` to render its action + Voltar/Avançar
      row **inside `<ActionBar>`** (drop its own ResizeObserver — ActionBar owns
      the measurement). Public props unchanged.
- [x] 1.4 Update the two consumers of `has-stepper`:
      `src/features/session/SessionEntryPage.tsx` and
      `src/features/exercise/ExerciseDetailPage.tsx` → `has-action-bar`.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Stepper suite green after the rename — 17/17 across
      `stepper-bar` + `day-nav` + `session.integration`

---

## Phase 2: Session runner — Concluir treino

- [x] 2.1 `src/features/session/SessionPage.tsx`: in the **in-progress** branch,
      move the "Concluir treino" button **and** the "Marque ao menos um exercício"
      hint out of `<main>` into an `<ActionBar>` sibling. Keep `disabled={done ===
      0}` and the toast/nav on complete.
- [x] 2.2 Add `has-action-bar` to `<main className="screen">` only when in
      progress (the completed branch keeps its in-body share buttons — out of
      scope).
- [x] 2.3 Confirm the completed-session view is visually unchanged (share buttons
      stay in the body, no bar).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Session runner test: Concluir in the bar, disabled with nothing done,
      enabled after marking one; completed session shows no bar

---

## Phase 3: Settings create-screens

- [x] 3.1 `GymsPage`, `CategoriesPage`, `ExercisesPage`, `DaysPage`: replace the
      trailing `<button className="btn primary" style={{ marginTop: 14 }}>` with
      the same button inside `<ActionBar>`; add `has-action-bar` to each
      `<main>`. Same label, icon, and `setEditing('new')` handler.
- [x] 3.2 Drop the now-unneeded `marginTop: 14` inline style (the bar handles
      spacing).
- [x] 3.3 Empty-state check: each page still shows its empty state above the bar
      (the bar floats even when the list is empty — that's fine and consistent).

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Each settings page test: the "+ Novo…" button is inside `.action-bar` and
      opens the form sheet

---

## Phase 4: Modal footers (sticky within the sheet)

- [x] 4.1 `src/styles/global.css`: make `.sheet-actions` a **sticky footer** —
      `position: sticky; bottom: 0`, a solid `--surface-1` background (matching
      the sheet), a small top border/padding so scrolled content doesn't bleed
      through, and it stays inside the sheet's own scroll area.
- [x] 4.2 Verify the sheet's bottom padding (`env(safe-area-inset-bottom)`) still
      applies so the footer clears the iOS home indicator.
- [x] 4.4 (added) **Scoped the sticky footer to `.sheet > .sheet-actions`.**
      `.sheet-actions` is used in TWO contexts: modal footers **and** the inline
      weight/note editors (in a tab panel, not a sheet). A global sticky rule
      would have pinned the inline editors' Salvar to the page bottom. The
      direct-child selector targets only real modal footers; the base
      `.sheet-actions` (inline) is unchanged.
- [x] 4.3 This applies to **every** sheet (`.sheet-actions` is shared) — the "Novo
      dia" picker is the tall one that proves it, but gyms/categories/exercises
      forms and the weight/note editors get it too.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Real-browser: the "Novo dia" footer is `position: sticky` and Salvar stays
      visible with the sheet scrolled fully to the bottom

---

## Phase 5: Integration & Polish

- [x] 5.1 Per-page integration tests: for the session runner and each settings
      page, assert the action button lives inside `.action-bar` (a sibling of
      `main.screen`, not scrolling content) and `main.screen` has
      `has-action-bar`.
- [x] 5.2 **Real-browser pass** (headless Chromium — layout is what jsdom fakes):
      - a **long** list on each settings page and a **long** session: at
        font-scale **1.0 and 2.0**, scroll to the end and assert the last content
        never intersects the bar (the "covers no content" guarantee, measured);
      - the "Novo dia" modal with the full exercise picker: the footer stays
        pinned while the picker scrolls;
      - the exercise **stepper** still behaves (regression from the rename);
      - a toast renders above a bar.
- [x] 5.3 `README.md`: note the floating action bar generalized across the
      create-screens, the session runner, and modal footers.

**Quality Gate:** PASSED
- [x] All tests pass — 211/211 (205 before + 6 new action-bar tests)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
