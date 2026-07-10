# Proposal: Increase Base Typography for Mobile Legibility

**Change ID:** `increase-base-typography`
**Created:** 2026-07-09
**Status:** Implementation Complete
**Completed:** 2026-07-09

---

## Problem Statement

- **What problem are we solving?** Text in MyOneGym is too small to read
  comfortably on a phone. Row titles are 14px, subtitles/labels 11–12px, and the
  tab bar is 11px — below what is comfortable at arm's length on a handset.
- **Who is affected?** The end user, on the primary target device (mobile).
- **Current pain point?** Every `font-size` in `src/styles/global.css` is a
  **hardcoded pixel value** (`11px`, `12px`, `13px`, `14px`, `16px`, `17px`,
  `20px`, `40px`). Because they are fixed px — not `rem` and not driven by a
  token — the app ignores the browser/OS font-size preference and there is **no
  single place to make text bigger**. Making it larger today means hand-editing
  ~20+ scattered declarations, and doing so risks drifting the visual hierarchy.

## Proposed Solution

Introduce a **single typography scale** in `src/styles/tokens.css` driven by one
multiplier, and route every font size through it. Increase the effective size by
**at least 2×** while preserving the existing size *ratios* (hierarchy is
unchanged; everything is simply larger).

- Add a `--font-scale` custom property (default **2**) plus semantic size tokens
  (`--fs-2xs` … `--fs-2xl`) each computed as `calc(<current-px> * var(--font-scale))`.
- Replace the hardcoded `font-size: <px>` declarations across `global.css`
  (and any feature CSS) with the matching `--fs-*` token.
- Keep sizes anchored in `rem` where practical so the OS/browser text-size
  preference is also respected (accessibility), with `--font-scale` layered on top.
- One knob: changing `--font-scale` (or the root font-size) rescales the whole
  app; 2× is the default, tunable up/down without touching component CSS again.

## Scope

### In Scope
- A typography-scale token set + `--font-scale` multiplier in `tokens.css`.
- Migrating all hardcoded `font-size` px values in `src/styles/global.css` (and
  feature-level CSS such as `src/features/**/**.css`) to the tokens.
- Setting the default effective scale to **≥ 2×** the current sizes.
- Verifying layouts (app bar, tab bar, rows, sheets, badges, empty states) still
  fit and do not clip after scaling; adjusting fixed heights/paddings that
  overflow purely because of the larger text.

### Out of Scope
- A user-facing font-size setting/slider (could be a follow-up — the token makes
  it trivial later).
- Redesigning the visual hierarchy, spacing system, or color tokens.
- Changing icon semantics; icon glyph sizes are rescaled with the same tokens
  only where they sit inline with text.
- Content or feature changes (this is presentation only).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Presentation-only change. |
| API / Data layer | No | — |
| State | No | — |
| Design tokens (`tokens.css`) | Yes | New `--font-scale` + `--fs-*` size tokens (light + dark blocks unaffected — sizing is theme-independent). |
| Global CSS (`global.css`) | Yes | ~20+ `font-size` declarations swapped to tokens. |
| Feature CSS (`src/features/**`) | Yes (audit) | Any local `font-size` px swapped to tokens. |
| `index.html` / inputs | Yes | Input `font-size` scales too; keep ≥16px effective to avoid iOS focus-zoom. |
| Layout integrity | Yes (verify) | App bar (17px→), tab bar (11px→), fixed-height controls audited for clipping/overflow. |

## Architecture Considerations

- **Single source of truth.** Sizing joins the existing token system in
  `tokens.css` (which already centralizes color/radii), matching the project's
  "mirrors mockups/README.md" convention. No new pattern family is introduced.
- **Ratio-preserving.** Multiplying every base by the same `--font-scale` keeps
  the current hierarchy intact — 2× larger, same proportions.
- **Accessibility.** Anchoring to `rem` lets the OS/browser preference compose
  with the app multiplier, an improvement over today's fixed px.
- **Reversible / tunable.** The default is 2×; the value lives in one property,
  so tuning to 1.8× or 2.2× after real-device testing is a one-line change.

## Success Criteria

- [ ] Effective font sizes across the app are **at least 2×** their current values.
- [ ] All `font-size` values derive from the shared scale (no stray hardcoded px
      in `global.css` / feature CSS).
- [ ] Changing `--font-scale` in one place rescales the entire app.
- [ ] No text is clipped or overlapping on a phone viewport (app bar, tab bar,
      rows, badges, sheets, empty states) after scaling.
- [ ] Inputs remain ≥16px effective (no iOS zoom-on-focus regression).
- [ ] `npm run build`, `npm run typecheck`, and `npm test` pass.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 2× text overflows fixed-height bars/controls | High | Med | Audit app bar / tab bar / pills; relax fixed heights or add wrapping after scaling; verify on a phone viewport. |
| Long labels (day names, exercise names) truncate/wrap awkwardly | Med | Med | Allow wrapping or ellipsis; test with long Portuguese strings. |
| Inputs drop below 16px effective → iOS zooms on focus | Low | Med | Keep the input token ≥16px effective. |
| Straight 2× feels too large in practice | Med | Low | `--font-scale` is one knob; tune after real-device testing (≥2× is the floor). |
| Missed hardcoded px in feature CSS | Med | Low | Grep sweep for `font-size` across `src/**` as an implementation task. |

---

## Archive Information

**Archived:** 2026-07-09
**Duration:** 0 days (created and completed 2026-07-09)
**Outcome:** Successfully implemented

### Files Modified
- `src/styles/tokens.css` — added `--font-scale` (default 2) + `--fs-2xs … --fs-7xl` scale
- `src/styles/global.css` — all `font-size` → tokens; `.row-body` stacked; fixed icon boxes → `em`
- `src/features/exercise/exercise.css` — `font-size` → tokens; `.tl-delete` box → `em`
- `src/features/home/home.css` — `font-size` → tokens
- `mockups/README.md` — documented the typography scale

### Specs Updated
- `openspec/specs/app-foundation/spec.md` — added Requirement: **Legible, Scalable Base Typography**

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (32/32) — all pass
- Visual pass at 390px (headless Chromium): Home (empty + populated), Settings, Data, Exercise detail — 2× type, no clipping/overlap
