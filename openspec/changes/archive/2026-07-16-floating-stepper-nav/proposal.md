# Proposal: Floating Stepper + Day-Aware Exercise Detail

**Change ID:** `floating-stepper-nav`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

Three symptoms, **two of which share one root cause**.

1. **The stepper is buried at the bottom of a scroll.** On the in-session
   exercise detail, **Concluir / Voltar / Avançar** sit *inside* the "Execução"
   tab, above the weight editor. Mid-set, with the phone on a bench, the user has
   to scroll to reach the action they need most — and the buttons **vanish
   entirely** when they switch to the Observações or Foto tab.

2. **Back from an exercise loses your place.** Open "Dia 3" on Home, tap an
   exercise, tap Voltar → Home reopens with **every day collapsed**. You have to
   find and expand "Dia 3" again, every single time.

3. **No way to walk a day's exercises outside a session.** The guided
   Voltar/Avançar only exists during a workout. Browsing a day's exercises means
   Home → exercise → back → Home → next exercise.

**The root cause of (2) and (3) is the same:** `/exercise/:id` carries **no
relation to the training day** it was opened from.

- `ExerciseDetailPage` hardcodes `<BackBar to="/" />` — an explicit `nav('/')`.
- `HomePage` holds the expanded day in `useState<number|null>(null)` — **local
  component state, reset on every mount**.

So even swapping `nav('/')` for `nav(-1)` would **not** fix (2): React unmounts
Home, and the open day dies with it. And Voltar/Avançar can't exist without
knowing *which* day's list to walk — an exercise may belong to several days (Home
even shows a "2 dias" chip).

## Proposed Solution

**Put the day in the URL.** One mechanism fixes all three:

| URL | Meaning |
|-----|---------|
| `/?day=3` | Home with "Dia 3" expanded — survives remount, reload, and Back |
| `/exercise/5?day=3` | Exercise 5, opened from Dia 3 → Back returns to `/?day=3`, and Voltar/Avançar walk Dia 3's list |
| `/exercise/5` | No day context → no stepper, Back goes to `/` (exactly today's behaviour) |

**And float the stepper.** `Concluir / Voltar / Avançar` move out of the tab panel
into a **fixed bottom bar**, present on **every tab** of the in-session detail —
a bar that disappears when you switch tabs doesn't read as floating chrome, it
reads as a bug. The catalog detail gets the same bar with **only Voltar/Avançar**
(there is no session there, so nothing to conclude).

**The content padding is measured, not guessed.** The bar's height scales with the
user's font-size setting (100%–200%, see `app-foundation`), so a hard-coded
`padding-bottom` would leave content **covered at large scales** — precisely what
this change is meant to prevent. A `ResizeObserver` on the bar publishes its real
height to a CSS variable that the scroll container consumes.

### Decisions taken (from review)
1. **The bar shows on all tabs** of the session exercise detail, not just
   Execução. This changes behaviour, not just position: Concluir/Avançar become
   reachable while looking at the machine's photo or the note — which is exactly
   when you're mid-exercise.
2. **No day in the URL → no bar**, and Back goes to `/`. Guessing a day (e.g. the
   exercise's first) would advance the user into a day they never opened, and send
   Back to a day they never visited.

## Scope

### In Scope
- Home: the expanded day lives in the URL (`/?day=<id>`), not in local state.
- Home: exercise links carry the day (`/exercise/<id>?day=<id>`).
- `ExerciseDetailPage`: Back returns to `/?day=<id>`; a floating **Voltar/Avançar**
  over that day's ordered exercises.
- `SessionEntryPage`: the existing stepper becomes the same floating bar, on all
  three tabs, keeping its current behaviour (mark-and-advance, the finish prompt,
  the read-only completed state).
- A shared floating-bar component + measured bottom padding.
- Toast repositioned so it never lands under the bar.

### Out of Scope
- **Changing what the stepper does** — mark-and-advance, the end-of-day finish
  prompt, and the disabled ends stay exactly as specified today.
- **A "Concluir" on the catalog detail** — no session there, nothing to mark.
- Deep-linking a day from anywhere else (Sessions, Settings).
- Restoring scroll position on Home (only the expanded day is restored).
- Reworking the tab bar, the app bar, or gestures (swipe between exercises).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Nothing persisted; the day lives in the URL. |
| Data layer | No | `useDays()` already exposes each day's ordered `exerciseIds`. |
| State | **Yes (simplification)** | Home's `openId` `useState` → `useSearchParams`. Removes state, doesn't add any. |
| Routing | **Yes** | New `?day=` query param on `/` and `/exercise/:id`. No new routes. |
| UI | **Yes** | New `StepperBar` component; `SessionEntryPage` stepper moved out of the tab panel; `ExerciseDetailPage` gains the bar; `HomePage` links carry the day. |
| CSS | **Yes** | Fixed bar + measured `padding-bottom`; toast offset. |
| Deps | **No** | `ResizeObserver` is built in. |
| Tests | **Yes** | URL round-trip, day-list navigation, no-day fallback, bar on every tab. |
| i18n / copy | **No** | Reuses the existing Concluir / Voltar / Avançar labels. |

## Architecture Considerations

- **Less state, not more.** Home's open day moves from `useState` to the URL. The
  URL is the one place that survives unmount, reload, share and the browser's
  Back button — the exact properties the bug needs. This deletes state rather
  than adding a store.
- **Toggling a day MUST `replace`, not push.** Otherwise every expand/collapse
  becomes a history entry and Back walks the accordion instead of leaving Home.
- **The bar is chrome, not tab content.** It renders as a sibling of the tab
  panel, so it survives tab switches and the panels stop competing for the
  bottom of the screen.
- **The detail pages have no `TabBar`.** Verified: `SessionEntryPage` and
  `ExerciseDetailPage` render `BackBar` only, so a fixed bottom bar has no
  existing bottom nav to collide with (`.tabbar` is `position: sticky` and only
  mounts on Home/Sessions/Settings).
- **The toast is in the way.** `.toast` is `position: fixed; bottom: 92px;
  z-index: 30` — it will land on top of the bar. It must lift by the measured bar
  height on pages that have one.
- **`.screen`'s `padding-bottom: 104px` is a coincidence, not a solution.** It
  predates this and is a fixed value; relying on it would break at font-scale 2.0.

## Success Criteria

- [x] On the in-session exercise detail, Concluir/Voltar/Avançar sit in a bar fixed to the bottom of the screen.
- [x] The bar stays visible on **all three** tabs (Execução, Observações, Foto).
- [x] No content is ever hidden behind the bar — verified at font-scale **1.0 and 2.0**, and with the longest exercise list.
- [x] Home → open "Dia 3" → tap an exercise → **Voltar → Home with "Dia 3" still expanded**.
- [x] Reloading `/?day=3` opens Home with "Dia 3" expanded.
- [x] Expanding/collapsing days does **not** pile up browser history entries.
- [x] From a day, the catalog exercise detail offers Voltar/Avançar over **that day's** exercises, in order, disabled at the ends.
- [x] An exercise in two days navigates within the day it was opened from.
- [x] `/exercise/5` with no `?day=` shows **no** bar and Back goes to `/` (unchanged).
- [x] A toast never renders underneath the bar.
- [x] The stepper's existing behaviour is untouched: mark-and-advance, the finish prompt, disabled ends, read-only when completed.
- [x] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Fixed padding hides content at large font scales** — the whole point of the change | **High** | **High** | Measure the bar with `ResizeObserver` → CSS var; never hard-code a height. Verify at 1.0 **and** 2.0. |
| Day toggling pushes history → Back walks the accordion instead of leaving Home | **High** | Med | `setSearchParams(..., { replace: true })`; assert history length in a test. |
| Toast renders under the bar | **High** | Low | Offset the toast by the same measured height. |
| A stale `?day=` (day deleted/renamed since) | Med | Low | Treat an unknown day id as **no day**: no bar, Back to `/`. Same graceful path as a direct link. |
| Regressing the finish prompt / read-only state while moving the stepper | Med | **High** | It moves verbatim; the existing `session.integration.test.tsx` suite (finish prompt, decline, skip) must stay green untouched. |
| iOS home-indicator overlaps the bar | Med | Med | `padding-bottom: env(safe-area-inset-bottom)`, as `.tabbar` and `.sheet` already do. |
| Fixed bar eats screen on a short viewport | Low | Med | Bar is compact (one action row + one nav row, as today); verify at 390×844 and a small viewport. |

---

## Implementation Notes (what the build changed)

**The root-cause reading held up.** One mechanism — the day in the URL — fixed all
three symptoms, and Home's open day went from `useState` to `useSearchParams`, so
the change **removed** state rather than adding any.

Two things the plan didn't foresee:

1. **jsdom has no `ResizeObserver`.** Measuring threw on mount and took the whole
   page down — every session test failed with `ReferenceError`, not with a layout
   assertion. It's an environment gap (every target browser has it, iOS Safari
   13.4+), so the stub went into `vitest.setup.ts` beside `fake-indexeddb` rather
   than becoming a guard in product code that no real browser would ever exercise.
2. **`position: fixed` alone spans the viewport**, not the app. The bar is capped
   at 480px and centred to match the `.app` shell.

**`main.screen` is not the scroll container.** `.app` uses `min-height`, so
`main`'s `overflow-y: auto` never gets a constrained height and the **document**
scrolls. This first showed up as a false alarm: the overlap audit "found" covered
content because it was scrolling `main` (a no-op) and then flagging mid-content
elements passing under a fixed bar — which is normal. Scrolling the window
instead: clean everywhere. Worth knowing before writing any future scroll code.

**Verification.** jsdom can't prove "covers no content" — it has no layout — so it
was measured in headless Chromium: 9/9 combinations (font-scale 1.0/1.5/2.0 x the
three tabs), document scrolled to the end, no leaf element intersecting the bar.
The numbers justify the whole `ResizeObserver` approach: the bar is **127 / 145 /
165px** as the scale grows and the reservation tracks it (151 / 169 / 189px) — a
padding hard-coded at scale 1 would leave ~14px of content buried at scale 2.
Also confirmed in the browser: the toast rides 16px above the bar, the bar stays
fixed while scrolling, history doesn't grow across 6 day toggles, and the reported
bug is gone (Voltar → `/?day=1` with the day's 6 exercises still listed).

**The guard that mattered.** `session.integration.test.tsx` passes 7/7 with a
**zero-line diff** — the finish prompt, the decline path and the skip path are
untouched, which is the evidence that moving the stepper changed only its
position. The new replace-vs-push test was mutation-checked: it fails when
`replace` is dropped, so it actually guards the behaviour it claims to.

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created, implemented and archived 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/ui/StepperBar.tsx` — **new**; the fixed bottom bar, measuring its own
  height via `ResizeObserver` into `--stepper-h`; renders nothing when given no
  actions
- `src/features/home/HomePage.tsx` — the expanded day moved from
  `useState<number|null>` to `useSearchParams` (`?day=`), written with
  `{ replace: true }`; exercise links carry the day
- `src/features/exercise/ExerciseDetailPage.tsx` — reads `?day=`; the three
  hardcoded `<BackBar to="/">` call sites now target `/?day=<id>`; a
  Voltar/Avançar bar over that day's exercises (no Concluir — no session here)
- `src/features/session/SessionEntryPage.tsx` — the stepper lifted out of the
  `tab === 'exec'` panel into `StepperBar`, a sibling of `<Tabs>`; logic moved
  verbatim
- `src/styles/global.css` — `.stepper-bar` (fixed, capped at the 480px `.app`
  width, safe-area padding, z-index 10); `.screen.has-stepper` reserving
  `calc(24px + var(--stepper-h))`; `.toast` lifted above the bar
- `vitest.setup.ts` — `ResizeObserver` stub (jsdom gap)
- `README.md` — the floating stepper, `?day=` deep-linking, day-aware Back
- Tests (**+17**): `day-url.integration.test.tsx` (7),
  `stepper-bar.integration.test.tsx` (3), `day-nav.integration.test.tsx` (7)

**No new dependencies**; `package.json` untouched. Net effect on state: one
`useState` **removed**.

### Specs Updated
- `openspec/specs/home-navigation/spec.md` — *Home Accordion of Training Days*
  (the expanded day is addressable, survives leaving and returning, and toggling
  adds no history) and *Open Exercise Detail* (remembers its day; Back returns to
  it; floating Voltar/Avançar over that day; graceful with no day)
- `openspec/specs/workout-sessions/spec.md` — *Session Exercise Detail* (the
  stepper is a floating bar on every tab, reserving its measured height)

### Verification
- `npm test` (195/195), `npm run typecheck`, `npm run build` — all pass
- **`session.integration.test.tsx` passes 7/7 with a zero-line diff** — the
  evidence that moving the stepper changed only its position, not the finish
  prompt, the decline path or the skip path
- The replace-vs-push test was **mutation-checked**: dropping `replace` makes it
  fail, so it guards what it claims to
- Real-browser pass (headless Chromium — jsdom has no layout, so "covers no
  content" is unprovable there): **9/9** combinations of font-scale 1.0/1.5/2.0 x
  the three tabs, document scrolled to the end, no leaf element intersecting the
  bar. The bar measures **127 / 145 / 165px** as the scale grows and the
  reservation tracks it (151 / 169 / 189px) — a padding fixed at scale 1 would
  bury ~14px of content at scale 2. Toast rides 16px above the bar; the bar stays
  fixed while scrolling; history doesn't grow over 6 day toggles; and the reported
  bug is gone (Voltar → `/?day=1` with the day's 6 exercises still listed).

### Worth carrying forward
**`main.screen` is not the scroll container.** `.app` uses `min-height`, so
`main`'s `overflow-y: auto` never gets a constrained height and the **document**
scrolls. This produced a false alarm during verification (an audit scrolling
`main` was a no-op, and flagged mid-content elements passing under a fixed bar as
"covered"). Any future scroll or layout work should scroll the window.
