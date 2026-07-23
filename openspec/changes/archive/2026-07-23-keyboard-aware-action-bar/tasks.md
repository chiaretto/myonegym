# Implementation Tasks: Keyboard-Aware Floating Action Bar

**Change ID:** `keyboard-aware-action-bar`

---

## Phase 1: The inset math (pure) + the hook

- [x] 1.1 `src/lib/keyboardInset.ts`: a pure `keyboardInset({ innerHeight,
      vvHeight, vvOffsetTop })` → `Math.max(0, innerHeight - (vvHeight +
      vvOffsetTop))`. This is the one subtle bit — `offsetTop` matters when the
      page scrolls under the keyboard.
- [x] 1.2 Same file: `useKeyboardInset()` (or an init fn) that, on mount, reads
      `window.visualViewport`, computes the inset, writes it to `--kb-inset` on
      `<html>`, and updates on the viewport's `resize` and `scroll`. No-op (and
      leaves `--kb-inset` unset/`0`) when `visualViewport` is undefined. Clean up
      the listeners on unmount.
- [x] 1.3 Tests in `src/lib/keyboardInset.test.ts`: the pure function for
      closed (0), open (keyboard height), and scrolled-with-keyboard (offsetTop
      subtracted) cases; never negative.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Inset-math tests pass — 5/5 (closed, open, scrolled-with-offsetTop, never-negative, rounding)

---

## Phase 2: Wire it in + CSS

- [x] 2.1 Mount `useKeyboardInset()` once at the app root (`App.tsx`), next to the
      existing font-scale application — a single global listener.
- [x] 2.2 `src/styles/global.css`: `.action-bar` bottom becomes
      `calc(env(safe-area-inset-bottom-or-0) + var(--kb-inset, 0px))` — i.e. add
      `var(--kb-inset, 0px)` to its bottom so it lifts with the keyboard. Keep the
      safe-area padding inside the bar.
- [x] 2.3 `.toast` bottom gains `+ var(--kb-inset, 0px)` too, so a toast while
      typing clears the keyboard.
- [x] 2.4 Confirm `.screen.has-action-bar` reservation is unchanged (still the
      bar's height) — the form scrolls under the lifted bar.

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `keyboard-inset.integration.test.tsx` (3): a mocked `visualViewport` resize
      drives `--kb-inset` (open→320, scroll→still 320, close→0); no-op without the
      API; variable + listeners cleaned up on unmount

---

## Phase 3: Integration & Polish

- [x] 3.1 Integration test: render a create/edit page, mock `window.visualViewport`
      (height reduced + a resize event), assert `--kb-inset` on `<html>` is the
      keyboard height and returns to 0 when restored.
- [x] 3.2 **Real-browser pass** (headless Chromium): installed a controllable
      `visualViewport` via `addInitScript` BEFORE app load, so the **real hook**
      subscribed to it. Driving a 320px "keyboard": `--kb-inset` → 320px and the
      `.action-bar`'s bottom rose from **844 → 524** (exactly the keyboard line);
      "closing" returned it to 844 — full JS→CSS chain, no page errors. The true
      soft-keyboard test still needs an Android device (headless can't summon one).
- [x] 3.3 No-regression check: with `visualViewport` untouched, the bar is exactly
      at the bottom as today across the settings/list/runner screens.
- [x] 3.4 `README.md` / code comment: the fixed action bar lifts with the mobile
      keyboard via `visualViewport` (`--kb-inset`).

**Quality Gate:** PASSED
- [x] All tests pass — 237/237 (229 before + 8 new)
- [x] `npm run build` passes
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive` (**via PR** — push the branch and
      `gh pr create`, don't push `main` directly)
