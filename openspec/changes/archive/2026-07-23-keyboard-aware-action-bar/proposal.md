# Proposal: Keyboard-Aware Floating Action Bar

**Change ID:** `keyboard-aware-action-bar`
**Created:** 2026-07-23
**Status:** Implementation Complete
**Completed:** 2026-07-23

---

## Problem Statement

- **What problem are we solving?** On Android, opening the soft keyboard **hides
  the floating action bar** behind it. The bar is `position: fixed; bottom: 0`,
  which anchors to the **layout** viewport; the Android keyboard shrinks only the
  **visual** viewport by default, so the bar stays pinned under the keyboard —
  exactly where the user can't reach it.
- **Who is affected?** Anyone filling a form on a phone — every create/edit page
  (gym, category, exercise, day) has text inputs, and its **Salvar / Cancelar**
  live in that bar. You type, and the button you need to submit is gone.
- **What's the current pain point?** The user must dismiss the keyboard to see the
  action, tap it, and hope focus didn't shift — a clumsy dance on the app's most
  common write path.

## Proposed Solution

Make the fixed bottom chrome **rise with the keyboard**, using the
**`visualViewport` API** (confirmed in review — universal across Android and iOS,
and testable, unlike the Android-only `interactive-widget` meta).

- A small module/hook publishes a **`--kb-inset`** CSS variable on `<html>`: how
  much the keyboard occludes the bottom of the layout viewport, computed as
  `window.innerHeight − (visualViewport.height + visualViewport.offsetTop)`,
  clamped to `≥ 0`. It listens to `visualViewport`'s `resize` and `scroll`.
- `.action-bar` and `.toast` lift by that amount (`bottom` gains `+ var(--kb-inset,
  0px)`), so the bar sits **just above the keyboard** when it's open and returns
  to the screen bottom when it closes.
- The content reservation (`.screen.has-action-bar`) is unchanged — it reserves
  the bar's height; while the keyboard is open the form scrolls under a bar that
  now floats above the keyboard.
- **Degrades safely**: where `visualViewport` is absent, `--kb-inset` stays `0`
  and the bar behaves exactly as today (no regression).

## Scope

### In Scope
- A `useKeyboardInset` hook (or a tiny init module) that maintains `--kb-inset`
  from `visualViewport`, mounted once at the app root.
- `.action-bar` and `.toast` consume `--kb-inset` in their `bottom`.
- Unit test of the **inset math** (pure function) and a test that the hook wires
  the `visualViewport` listeners and updates the variable on a simulated change.

### Out of Scope
- **`interactive-widget` viewport-meta** approach (declined in favour of
  visualViewport).
- **Resizing/scrolling content** on keyboard open beyond what the browser already
  does — only the fixed chrome is repositioned.
- The **sticky modal footer** (`.sheet > .sheet-actions`) — a sheet already scrolls
  within itself and the OS keeps the focused field visible; not reported, left as
  a follow-up if needed.
- iOS-specific quirks beyond what `visualViewport` reports (it is the same API on
  both).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Presentation only. |
| State | No | A DOM-level CSS variable, not app state. |
| UI | **Yes** | New `useKeyboardInset` hook mounted at the app root; `.action-bar`/`.toast` bottom offsets. |
| CSS | **Yes** | `bottom: calc(… + var(--kb-inset, 0px))` on the two fixed elements. |
| Deps | No | `visualViewport` is built in. |
| Tests | **Yes** | Pure inset-math test; a listener/variable-update test with a mocked `visualViewport`. |
| i18n / copy | No | — |

## Architecture Considerations

- **One publisher, many consumers — same pattern as `--action-bar-h`.** The app
  already drives fixed-chrome layout through CSS variables published from JS
  (`ActionBar` publishes `--action-bar-h`; the toast reads it). `--kb-inset` is
  the same idea: a single listener publishes, CSS consumes. No per-component
  wiring.
- **Mounted once, globally.** The keyboard affects any fixed-bottom element, so the
  hook lives at the app root (like `applyFontScale`), not inside `ActionBar` —
  avoids duplicate listeners when a screen has a bar and a toast.
- **The math must use `offsetTop`.** When the page itself scrolls under the
  keyboard, `visualViewport.offsetTop` is non-zero; the occlusion is
  `innerHeight − (height + offsetTop)`. Omitting `offsetTop` mislifts the bar
  during scroll. This is the one subtle bit, so it's a pure, unit-tested function.
- **Verifiability.** A real soft keyboard can't be summoned in headless Chromium,
  so the end-to-end proof needs a device. But the inset math is pure and unit-
  tested, and the listener→variable wiring is tested against a **mocked
  `visualViewport`** (dispatch a resize, assert `--kb-inset`). A real-browser pass
  simulates the occlusion by overriding `visualViewport` metrics.

## Success Criteria

- [x] With the keyboard open on a form page, the **Salvar/Cancelar** bar sits directly above the keyboard, fully visible and tappable.
- [x] Closing the keyboard returns the bar to the bottom of the screen.
- [x] While the keyboard is open and the page scrolls, the bar stays above the keyboard (offsetTop accounted for).
- [x] A toast during typing renders above both the bar and the keyboard.
- [x] Where `visualViewport` is unavailable, behaviour is exactly as today (bar at `bottom: 0`).
- [x] The inset is never negative (no bar drift when the keyboard is closed).
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Can't verify with a real keyboard in CI | **High** | Med | Pure inset math is unit-tested; wiring tested with a mocked `visualViewport`; a real-browser pass simulates occlusion; final confirmation on a device (noted). |
| `offsetTop` omitted → bar mispositions while scrolling with the keyboard up | Med | Med | Encode the full formula in the tested pure function; a scroll-case test. |
| Listener leak or thrash on every keyboard toggle | Low | Low | One listener at the app root, removed on unmount; updates set a single CSS var (cheap). |
| A jump/flicker as the bar animates up | Low | Low | No transition on `bottom` (instant follow), matching the keyboard's own animation closely enough. |
| `visualViewport` reports odd values on some Android skins | Low | Med | Clamp to `≥ 0`; degrade to `0` (today's behaviour) if the API misbehaves. |

---

## Implementation Notes (what the build confirmed)

Same publisher/consumer shape the app already uses for `--action-bar-h`: one
global listener (`useKeyboardInset`, mounted at the app root beside the font-scale
effect) publishes `--kb-inset`, and the two fixed elements (`.action-bar`,
`.toast`) consume it in their `bottom`. Degrades to today's behaviour where
`visualViewport` is absent (`var(--kb-inset, 0px)` → 0).

**The `offsetTop` subtlety was real and is tested.** The occlusion is
`innerHeight − (vv.height + vv.offsetTop)` — when the page scrolls under the
keyboard, `offsetTop` is non-zero and omitting it would mis-lift the bar. The pure
`keyboardInset` function encodes the full formula; a unit test covers the scrolled
case (`844, 424, 100 → 320`).

**Verification split across the two halves it could reach:**
- **jsdom** proves the *JS half* — a mocked `visualViewport` resize drives
  `--kb-inset` (open → 320, scrolled → still 320, close → 0), it's a no-op without
  the API, and it cleans up on unmount.
- **A real browser** proves the *whole chain* — a controllable `visualViewport`
  installed via `addInitScript` **before** app load, so the real hook subscribed
  to it; a 320px "keyboard" drove `--kb-inset` to 320px and the `.action-bar`
  bottom from **844 → 524** (exactly the keyboard line), returning to 844 on close.

**What still needs a device.** A true Android/iOS soft keyboard can't be summoned
in headless Chromium, so the final on-hardware confirmation is deferred (noted,
like the camera/EXIF checks in `add-exercise-photos`). The mechanism is proven end
to end against a simulated viewport; a device only re-confirms the OS actually
reports the metrics the same way (it does — this is the standard API).

---

## Archive Information

**Archived:** 2026-07-23
**Duration:** 0 days (created, implemented and archived 2026-07-23)
**Outcome:** Successfully implemented (final on-device keyboard confirmation deferred to hardware)

### Files Modified
- `src/lib/keyboardInset.ts` — **new**; pure `keyboardInset()` + `useKeyboardInset()`
  (publishes `--kb-inset` from `visualViewport`; no-op without the API)
- `src/lib/keyboardInset.test.ts` — **new** (5); the inset math
- `src/lib/keyboard-inset.integration.test.tsx` — **new** (3); the hook wiring via
  a mocked `visualViewport`
- `src/App.tsx` — `useKeyboardInset()` mounted once at the app root
- `src/styles/global.css` — `.action-bar` and `.toast` bottoms add
  `var(--kb-inset, 0px)`
- `README.md` — the bar rises above the on-screen keyboard

**No new dependencies** — `visualViewport` is built in.

### Specs Updated
- `openspec/specs/app-foundation/spec.md` — *Floating Action Bar for Primary
  Actions* modified: the bar MUST rise above the on-screen keyboard and return
  when it closes (+ a scenario)

### Verification
- `npm test` (237/237), `npm run typecheck`, `npm run build` — all pass
- **jsdom** proves the JS half: a mocked `visualViewport` resize drives
  `--kb-inset` (open → 320, scrolled-with-offsetTop → still 320, close → 0), no-op
  without the API, cleaned up on unmount
- **Real browser** proves the whole chain: a controllable `visualViewport`
  installed before app load so the real hook subscribed to it; a 320px "keyboard"
  drove `--kb-inset` to 320px and the `.action-bar` bottom from 844 → 524 (the
  keyboard line), returning to 844 on close

### Open follow-up (needs hardware)
A true Android/iOS **soft keyboard** can't be summoned in headless Chromium, so
the on-device confirmation is deferred — the mechanism is proven end-to-end against
a simulated viewport, and a device only re-confirms the OS reports the same
`visualViewport` metrics (the standard API). Same kind of hardware-gated check as
the camera/EXIF items in `add-exercise-photos`.

### Worth carrying forward
- **`--kb-inset` is now available app-wide** for any fixed-bottom chrome — reuse it
  rather than re-listening to `visualViewport`.
- The occlusion formula **must include `offsetTop`** (`innerHeight − (height +
  offsetTop)`); it's isolated in the pure, tested `keyboardInset()`.
