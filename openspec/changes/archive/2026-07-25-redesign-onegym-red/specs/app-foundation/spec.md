# Delta: app-foundation

**Change ID:** `redesign-onegym-red`
**Affects:** design tokens (`src/styles/tokens.css`), global styles, fonts,
icon system, PWA theme and icons
**Supersedes:** the visual-identity requirements added by `redesign-momentum-dark`

---

## ADDED Requirements

### Requirement: Brand Colour Has a Single Governed Source

The brand colour MUST be governed from the design tokens, and every place that
cannot read a CSS custom property MUST be documented as a deliberate copy kept in
sync. Today the brand colour exists in **five independent copies** and they have
already drifted — the PWA icons ship `#B8524E`, which matches neither the accent
nor the background.

The copies are: `src/styles/tokens.css`, the `theme-color` meta in `index.html`,
`theme_color`/`background_color` in `vite.config.ts`, `public/icon.svg` +
`public/favicon.svg`, and the `C` block in
`src/features/session/share/renderCard.ts`.

`renderCard.ts` paints to `<canvas>`, which cannot read CSS variables, so its
copy is unavoidable. It MUST remain a documented mirror, and it MUST NOT read
`--font-scale` — a shared PNG is a fixed-size design piece.

#### Scenario: Palette change reaches every surface
- GIVEN the accent token changes
- WHEN the app, the installed PWA chrome and a shared session card are inspected
- THEN all three show the same brand colour
- AND no surface still shows a previous palette's colour

#### Scenario: Shared card ignores the user's font scale
- GIVEN the user set the font scale to 200%
- WHEN the user shares a session card
- THEN the generated PNG uses its own fixed type sizes, unchanged by the setting

---

## MODIFIED Requirements

### Requirement: Dark Premium Visual Identity

The application MUST present a single **dark** visual identity based on the
**"OneGym Red"** design direction: a near-black background (`#050607`) with
layered dark surfaces (`#0c0f14` for cards), a **brand red** accent (`#ec2c2e`,
with a darker `#ba2324` as the bottom stop of a **vertical** 180° gradient), and
muted/dim greys for secondary and tertiary text. All colours MUST derive from
shared **design tokens** (CSS custom properties) rather than hardcoded values, so
the palette is governed from one place. The app is **dark-only**: it MUST NOT ship
a separate light theme, and MUST NOT switch palette based on
`prefers-color-scheme`.

Buttons and chips MUST be **fully rounded** (pill radius); cards use a 20px
radius. Numeric inputs and steppers MUST stay rectangular-rounded so a field
still reads as a field.

Accent-coloured **text** MUST meet WCAG AA against the app background, and white
on the solid accent MUST meet AA for normal text.

The colour used for **destructive and error** states MUST be distinguishable from
the brand accent by **both hue and lightness**, so that "delete" never reads as an
ordinary accent action. It MUST NOT be the alert colour applied to a rest day.

#### Scenario: Dark palette is the base
- GIVEN the app is opened on any device
- WHEN the first screen renders
- THEN the background is the near-black app background and cards use the dark surface tokens
- AND the accent colour on primary actions is the brand red

#### Scenario: No light-theme switch
- GIVEN the OS/browser is set to a light colour scheme
- WHEN the app renders
- THEN the app still renders in the dark palette (it does not switch to a light theme)

#### Scenario: Destructive action is not mistaken for a brand action
- GIVEN a screen shows both an accent-coloured highlight and a destructive action
- WHEN the user looks at the screen
- THEN the destructive affordance differs from the accent in hue and in lightness
- AND it does not borrow the accent's tint or border

### Requirement: Typography

The app MUST use a **single** typeface family across every role, in **two
weights** (400 regular, 700 bold), self-hosted so the PWA works offline with no
runtime network request.

The three token names MUST be preserved so no consumer changes: `--font-title`,
`--font-sans` and `--font-mono`. `--font-mono` keeps its name but denotes the
**micro-label role** (uppercase, wide letter-spacing) rendered in the same family
— it is no longer a monospace face.

The existing single **typography-scale** mechanism MUST be preserved: one
`--font-scale` knob, user-adjustable, applied through the `--fs-*` tokens.

The **default** scale MUST be **125%**. The CSS default in `tokens.css` and
`FONT_SCALE_DEFAULT` in `src/state/settings.ts` MUST hold the same value — if they
diverge the app flashes at the wrong size on first paint.

`--fs-xl` MUST remain at least 16px effective at the default scale, or iOS zooms
the viewport when an input takes focus.

#### Scenario: One family, offline
- GIVEN the device is offline
- WHEN the app renders
- THEN titles, body and micro-labels all render in the bundled family
- AND no font request is made at runtime

#### Scenario: Default scale is consistent across CSS and TS
- GIVEN a fresh install with no stored preference
- WHEN the app paints for the first time
- THEN text renders at 125% and does not visibly resize after hydration

#### Scenario: Scale control still works end to end
- GIVEN the user opens Settings → Aparência
- WHEN the user moves the scale between 100% and 200%
- THEN every text size in the app rescales with hierarchy preserved and no clipping

### Requirement: Icon System

Icons MUST come from the bundled **Tabler icon webfont** as the base set, via the
existing `src/ui/Icon.tsx` wrapper. The app uses 34 distinct glyphs across 77 call
sites and the brand asset set does not cover them, so the webfont MUST NOT be
removed.

A **second, complementary** system MAY render brand-signature glyphs from PNG
artwork as a CSS mask, so one asset serves every colour state through
`currentColor`. It MUST be limited to glyphs that exist in the brand artwork —
navigation tabs, play, chevron, building, and the muscle-group avatars.

Because the artwork is line art displayed below its native size, and some crops
never reach full opacity, the mask MUST be composited so that partially
transparent pixels still paint a solid glyph. A glyph that renders as a
washed-out hairline is a defect, not a style.

#### Scenario: Brand glyph inherits its colour
- GIVEN the same PNG-backed glyph is used in an active and an inactive tab
- WHEN both render
- THEN the active one paints in the accent and the inactive one in the muted grey
- AND both come from a single asset file

#### Scenario: Every glyph in use still renders
- GIVEN the app renders all screens
- WHEN icons are inspected
- THEN no icon is missing or blank, including the ones with no brand artwork

---

## REMOVED Requirements

(None — the Momentum identity requirements are modified in place, not dropped.)
