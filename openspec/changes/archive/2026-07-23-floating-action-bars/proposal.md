# Proposal: Floating Action Bars Across Screens

**Change ID:** `floating-action-bars`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** A screen's **primary action** sits at the
  **end of a scrolling list**, so on a long list it is **below the fold**. To
  create a gym, category, exercise or day — or to finish a workout — the user
  must **scroll to the bottom** to reach the button. The `floating-stepper-nav`
  change already fixed this for the exercise stepper; the rest of the app still
  buries its main actions.
- **Who is affected?** Anyone managing their catalog (the more gyms/exercises
  they have, the further the "+ Novo…" button scrolls away) and anyone finishing
  a workout on a long day.
- **What's the current pain point?** The action you came to the screen for is the
  one you have to hunt for. And in the **"Novo dia" modal**, whose exercise picker
  can be tall, **Cancelar/Salvar scroll out of view** — you can fill the form and
  then not see how to save it.

## Proposed Solution

Extend the **measured floating-bar pattern** already built for the stepper to
every screen the user listed, and pin modal footers.

- **Generalize the stepper's shell into a reusable `ActionBar`** — the fixed,
  bottom-anchored bar that **measures its own height** (`ResizeObserver` → a CSS
  variable) so the page reserves exactly enough room and **covers no content at
  any font scale**. `StepperBar` becomes a thin wrapper over it, so the shipped
  exercise stepper is unchanged in behaviour.
- **Page action bars** (viewport-fixed, reserve space in `.screen`):
  - `/session/:id` runner — **"Concluir treino"** (in-progress only; the
    completed-session share buttons stay in the body, per review).
  - `/settings/gyms` — **+ Nova academia**
  - `/settings/categories` — **+ Nova categoria**
  - `/settings/exercises` — **+ Novo exercício**
  - `/settings/days` — **+ Novo dia**
- **Modal footers** (a different mechanism — sticky **within** the sheet, which
  scrolls): `.sheet-actions` (Cancelar/Salvar and every other sheet footer) stays
  pinned to the bottom of the sheet as its content scrolls. The user named "Novo
  dia", but every sheet shares `.sheet-actions`, so all of them benefit — the
  consistent outcome.

## Scope

### In Scope
- New `src/ui/ActionBar.tsx` (the measured fixed shell, extracted from
  `StepperBar`).
- Refactor `StepperBar` to render inside `ActionBar` (no API/behaviour change).
- Rename the shared CSS to reflect the generalization: `.stepper-bar` →
  `.action-bar`, `--stepper-h` → `--action-bar-h`, `.has-stepper` →
  `.has-action-bar` (update the two exercise-detail pages + the stepper test's
  class assertions).
- Move the five page buttons into `ActionBar`; add `has-action-bar` to those
  `<main>`s.
- Make `.sheet-actions` a **sticky footer** inside `.sheet`.
- Keep each button's exact behaviour, label, disabled state, and any hint (e.g.
  "Marque ao menos um exercício" travels with Concluir into the bar).

### Out of Scope
- **The completed-session share buttons** (`Compartilhar` / `Compartilhar sem
  pesos`) — stay in the body (confirmed).
- **Any new actions** — this only relocates existing ones.
- **Home** (`/`) and **Sessions** (`/sessions`) — they have the bottom `TabBar`,
  not a single primary action; untouched.
- **The Data / Settings-index screens** — not listed.
- Changing what any button does, or its confirmation flows.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Presentation only. |
| State | No | No store change. |
| UI | **Yes** | New `ActionBar`; `StepperBar` refactor; 5 pages move their button into it; `Sheet` footer sticky. |
| CSS | **Yes** | Rename `.stepper-bar`/`--stepper-h`/`.has-stepper` → `.action-bar`/`--action-bar-h`/`.has-action-bar`; `.sheet-actions` sticky. |
| Deps | **No** | `ResizeObserver` already used. |
| Tests | **Yes** | New per-page "button is in a fixed bar" checks; update the stepper test's class names; a sheet-footer test; real-browser overlap pass. |
| i18n / copy | **No** | Same labels. |

## Architecture Considerations

- **Reuse, not re-invent.** The stepper already solved the hard part (measured
  height so nothing is covered at large font scales). This change lifts that shell
  into `ActionBar` and points four more screens plus the session runner at it —
  one primitive, one CSS class, one measured variable.
- **Two mechanisms, deliberately.** A **page** bar is `position: fixed` to the
  viewport and reserves space in the scroll container. A **modal** footer is
  `position: sticky` to the bottom of the sheet's **own** scroll area — a
  viewport-fixed bar would detach from the sheet. They look the same to the user;
  they are not the same layout.
- **No TabBar collision.** Verified: the four settings sub-pages and the session
  runner render `BackBar`/appbar only — no bottom `TabBar` (that lives on Home /
  Sessions / Settings-index). So a viewport-fixed bar has nothing to overlap.
- **The generalization touches shipped code.** Renaming `stepper-*` → `action-*`
  updates the two exercise-detail pages and the `stepper-bar.integration.test.tsx`
  class assertions. Behaviour is unchanged; the overlap guarantee is re-verified
  in a real browser (as `floating-stepper-nav` required).
- **The toast already reads the bar variable** (`--stepper-h` today) so it rides
  above any bar — that wiring carries over to `--action-bar-h`.

## Success Criteria

- [x] On `/session/:id` (in progress), "Concluir treino" sits in a bar fixed to the bottom; its disabled state and the "marque ao menos um" hint are preserved.
- [x] On each of gyms / categories / exercises / days, the "+ Novo…" button sits in a fixed bottom bar.
- [x] No content is ever hidden behind any of these bars — verified at font-scale **1.0 and 2.0** with a long list.
- [x] In the "Novo dia" modal (and every other sheet), **Cancelar/Salvar stay visible** while the sheet content scrolls.
- [x] The exercise stepper still works exactly as before (its tests pass after the rename).
- [x] A toast never renders underneath a bar.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Renaming `stepper-*` regresses the shipped stepper | Med | **High** | `StepperBar` composes `ActionBar` with identical output; the (updated) stepper integration tests + a real-browser overlap pass are the guard. |
| Fixed padding hides content at large font scales (the whole point) | Med | **High** | Measured `--action-bar-h`, never a constant; verify at 1.0 **and** 2.0 on a long list. |
| Sticky sheet footer overlaps scrolled content (transparent) | Med | Med | Give `.sheet-actions` a solid background + top border; verify with the tall "Novo dia" picker. |
| Two bars mounted at once fight over the CSS var | Low | Low | One primary action per screen; `ActionBar` unmounts clean (removes the var). |
| A settings list shorter than the viewport now has a bar floating over empty space | High | Low | Expected and fine — it's the same as the stepper on a short day; the bar is chrome. |
| iOS home-indicator overlaps a bar | Med | Med | `env(safe-area-inset-bottom)` padding, already in `.stepper-bar`/`.sheet`. |

---

## Implementation Notes (what the build confirmed)

Pure reuse: the stepper had already solved the hard part (measured height so
nothing is covered at large font scales). This lifted that shell into `ActionBar`,
pointed the session runner and four settings screens at it, and generalized the
CSS names (`stepper-*` → `action-*`). `StepperBar` now composes `ActionBar`, so the
shipped stepper is unchanged — proven by its integration suite passing 17/17 after
the rename (only class-name assertions were updated).

**The one non-obvious trap: `.sheet-actions` has two homes.** It is the footer of a
modal sheet **and** the inline Salvar/Cancelar row of the weight/note editors,
which render in a tab panel, not a sheet. A global `position: sticky` would have
pinned the inline editors' buttons to the bottom of the page. Scoping the sticky
rule to `.sheet > .sheet-actions` (direct child) targets only real modal footers;
the inline ones keep their original flow. Caught by reading every `.sheet-actions`
call site before writing the CSS, not after.

**Verification.** jsdom can't prove "covers no content" (no layout), so it was
measured in headless Chromium: **10/10** screen×scale combinations (4 settings
pages + the runner, at font-scale 1.0 and 2.0), document scrolled to the end, no
leaf content intersecting the bar. The bars measure 72→91px (settings) and
103→167px (runner, with its hint) as the scale grows, and the reservation tracks
each — a fixed padding would bury content at 2.0. The "Novo dia" modal footer is
`position: sticky` and Salvar stays visible with the picker scrolled fully down.
Screenshots confirm all three. The completed-session view is untouched (share
buttons in the body, no bar), as scoped.

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** 0 days (created, implemented and archived 2026-07-23)
**Outcome:** Successfully implemented

### Files Modified
- `src/ui/ActionBar.tsx` — **new**; the measured fixed-bottom shell (ResizeObserver
  → `--action-bar-h`, renders null when empty), extracted from the stepper
- `src/ui/StepperBar.tsx` — now composes `ActionBar` (behaviour unchanged)
- `src/features/session/SessionPage.tsx` — "Concluir treino" (+ its hint) in an
  `ActionBar`, in-progress only; `has-action-bar` on `<main>` only then
- `src/features/settings/{Gyms,Categories,Exercises,Days}Page.tsx` — each
  "+ Novo…" moved into an `ActionBar`; `has-action-bar` on `<main>`
- `src/features/session/SessionEntryPage.tsx`, `src/features/exercise/ExerciseDetailPage.tsx`
  — `has-stepper` → `has-action-bar`
- `src/styles/global.css` — renamed `.stepper-bar`/`--stepper-h`/`.has-stepper` →
  `.action-bar`/`--action-bar-h`/`.has-action-bar`; **`.sheet > .sheet-actions`**
  sticky footer (scoped so inline weight/note editors are untouched)
- `src/features/settings/action-bars.integration.test.tsx` — **new** (6 tests)
- `src/features/session/stepper-bar.integration.test.tsx`,
  `src/features/exercise/day-nav.integration.test.tsx` — class-name assertions
  updated for the rename
- `README.md` — the floating action bar across create-screens, runner, modal footers

**No new dependencies**; presentation only.

### Specs Updated
- `openspec/specs/app-foundation/spec.md` — **added** *Floating Action Bar for
  Primary Actions* (5 scenarios): a screen's primary action sits in a fixed
  bottom bar that reserves its measured height (covers no content at any font
  scale), and a modal's footer stays pinned as its content scrolls

### Verification
- `npm test` (211/211), `npm run typecheck`, `npm run build` — all pass
- **Stepper regression guard**: its integration suite passes 17/17 after the
  `stepper-*` → `action-*` rename (only class-name assertions changed)
- **Overlap measured in a real browser** (headless Chromium — jsdom has no
  layout): 10/10 screen×scale combinations (4 settings pages + the runner, at
  font-scale 1.0 and 2.0), scrolled to the end, no content behind the bar. Bars
  measure 72→91px (settings) and 103→167px (runner) as the scale grows; the
  reservation tracks each
- **Modal footer**: the "Novo dia" footer is `position: sticky` and Salvar stays
  visible with the sheet scrolled fully down

### Worth carrying forward
- **`.sheet-actions` has two homes** — modal footers AND the inline weight/note
  editors (in a tab panel, not a sheet). The sticky rule is scoped to
  `.sheet > .sheet-actions` (direct child) so the inline editors keep their normal
  flow. Any future change to `.sheet-actions` must respect that split.
- `ui/ActionBar` is now the one primitive for a screen's fixed bottom action(s);
  reuse it rather than re-implementing a fixed bar.
