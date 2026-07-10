# Proposal: Show Exercise Image at Full Proportional Height

**Change ID:** `exercise-image-full-height`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Implements:** GitHub issue #2 — "Ajustar a exibição da imagem do exercício"

---

## Problem Statement

- **What problem are we solving?** On the exercise detail screens the media
  (image/GIF) sits in a **fixed 16:10 landscape box** (`.hero { aspect-ratio:
  16/10 }`). Because many exercise images/GIFs are **portrait or square**,
  `object-fit: contain` shrinks them to fit that short height, so they appear
  small and letterboxed — the user experiences this as the image being "cut" /
  not fully shown.
- **Who is affected?** Anyone viewing an exercise's media — on the Exercise
  detail page, the in-session exercise detail, and the day-form details preview
  (all share the same `.hero`).
- **Current pain point?** Issue #2: the image should be shown **at least at its
  full height, proportionally**, not constrained by a fixed-height container.

## Proposed Solution

Let the media display at its **natural aspect ratio** instead of forcing a fixed
16:10 box — a CSS-only change to the shared `.hero` / `.hero-media` rules
(`src/features/exercise/exercise.css`), which all three detail screens use.

- **Drop the fixed `aspect-ratio` on `.hero`.** The container sizes to the image.
- **Image sizes proportionally:** `img.hero-media { width: 100%; height: auto;
  object-fit: contain }` — full width, natural height, whole image, no crop.
- **Cap very tall media** with `max-height` (e.g. `72vh`) so an extreme portrait
  image still fits on screen (contained, never cropped); most images render at
  full proportional height with no cap.
- **Placeholder keeps a pleasant box:** the fallback glyph (`.media-fallback.
  hero-media`) retains a 16:10 shape via `aspect-ratio`, since it has no
  intrinsic size.

## Scope

### In Scope
- Update `.hero` / `.hero-media` in `src/features/exercise/exercise.css` so the
  exercise media shows at its full proportional height (capped), un-cropped, on
  **all** exercise detail views (Exercise detail, session-entry detail, day-form
  preview — all consume `.hero`).
- Keep the fallback placeholder a sensible box when there is no/broken media.

### Out of Scope
- Home/Settings **thumbnails** (`.thumb`) — those are intentionally small,
  fixed-size list images and remain `object-fit: cover`.
- Zoom / lightbox / pinch-to-zoom on the media. Deferred.
- Changing the `Media` component's markup or fallback behavior (still an `<img>`
  for GIFs, placeholder on missing/broken URLs).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Presentation only. |
| Data layer | No | — |
| State | No | — |
| UI | Yes (CSS only) | `.hero` / `.hero-media` in `exercise.css`; no TSX changes. Applies to `ExerciseDetailPage`, `SessionEntryPage`, and the `DaysPage` preview via the shared classes. |
| i18n / copy | No | — |

## Architecture Considerations

- **Single shared rule.** The three detail screens already reuse `.hero` /
  `.hero-media`; fixing those rules fixes every detail view at once — no per-page
  work, consistent with the design-token approach.
- **Natural-size with a screen cap.** `height: auto` shows the true proportion;
  `max-height: 72vh` keeps a very tall GIF usable without cropping (it contains).
- **Fallback sizing.** The placeholder div has no intrinsic dimensions, so it
  keeps an explicit aspect-ratio to remain a tidy box.

## Success Criteria

- [ ] A portrait/tall exercise image is shown at its full proportional height
      (no crop, no forced short box) on the exercise detail screens.
- [ ] A landscape/square image is shown fully and proportionally as well.
- [ ] A very tall image is capped to a screen-friendly height and remains fully
      visible (contained), not cropped.
- [ ] The missing/broken-media placeholder still renders as a tidy box.
- [ ] Home/Settings thumbnails are unchanged.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Very tall GIFs dominate the screen | Med | Low | `max-height: ~72vh` cap with `object-fit: contain`. |
| Fallback placeholder collapses without a fixed height | Med | Low | Give `.media-fallback.hero-media` its own `aspect-ratio`. |
| Layout shift as images load (height unknown until loaded) | Low | Low | Acceptable; `Media` uses `loading="lazy"`. Could reserve space later if needed. |
| Rounded corners clip oddly at natural size | Low | Low | Keep `overflow: hidden` + `border-radius` on `.hero`. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/exercise/exercise.css` — `.hero` (drop fixed 16:10), `img.hero-media`
  (full proportional height, `max-height: 72vh`, contain), `.media-fallback.hero-media`
  (keep a 16:10 placeholder box)

### Specs Updated
- `openspec/specs/exercises/spec.md` — added **Exercise Media Display on Detail Views**

### Notes
- Implements GitHub issue #2. CSS-only; all three detail views share `.hero`/`.hero-media`.

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (63/63) — all pass
- Visual pass at 390px (data-URI SVGs): portrait/tall capped at 72vh (full, contained),
  landscape natural proportion, missing media → 16:10 placeholder box
