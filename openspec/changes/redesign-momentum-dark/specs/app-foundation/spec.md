# Delta: app-foundation

**Change ID:** `redesign-momentum-dark`
**Affects:** design tokens (`src/styles/tokens.css`), global styles, fonts, PWA theme

---

## ADDED Requirements

### Requirement: Dark Premium Visual Identity

The application MUST present a single **dark** visual identity based on the
"Momentum" design direction: a near-black background with layered dark surfaces,
a warm **orange accent** (`#ff5a36`, with a lighter `#ff7a52` for gradients), and
muted/dim greys for secondary and tertiary text. All colors MUST derive from
shared **design tokens** (CSS custom properties) rather than hardcoded values, so
the palette is governed from one place. The app is **dark-only**: it MUST NOT
ship a separate light theme, and MUST NOT switch palette based on
`prefers-color-scheme`.

#### Scenario: Dark palette is the base
- GIVEN the app is opened on any device
- WHEN the first screen renders
- THEN the background is the near-black app background and cards use the dark surface tokens
- AND the accent color on primary actions is the Momentum orange

#### Scenario: No light-theme switch
- GIVEN the OS/browser is set to a light color scheme
- WHEN the app renders
- THEN the app still renders in the dark Momentum palette (it does not switch to a light theme)

#### Scenario: Colors come from tokens
- GIVEN a component needs a surface, text, border, or accent color
- WHEN it is styled
- THEN it references a design token (custom property), not a hardcoded literal

### Requirement: Momentum Type System

The application MUST use the Momentum type roles: a **display/title** typeface
(Sora) for headings, a **body/UI** typeface (Manrope) for content and controls,
and a **monospace** typeface (JetBrains Mono) for uppercase micro-labels
(letter-spacing ~.1–.14em). These fonts MUST be **self-hosted** so the app remains
fully usable **offline** with no runtime font network request. The type roles
MUST be applied through shared tokens/classes, and MUST compose with the existing
single **typography scale** (`--font-scale`) without altering it — only font
families and per-role weights change.

#### Scenario: Title vs body vs micro-label typefaces
- GIVEN a screen with a heading, body text, and an uppercase section label
- WHEN it renders
- THEN the heading uses the title typeface, the body uses the body typeface, and the section label uses the monospace micro-label style

#### Scenario: Fonts work offline
- GIVEN the app has been opened once and its assets are cached
- WHEN the device is offline and the app is reopened
- THEN all text renders in the intended fonts with no font network request

#### Scenario: Font families compose with the typography scale
- GIVEN the shipped default font scale (150%) and the user-adjustable range (100%–200%)
- WHEN the font families change to the Momentum type system
- THEN every size still derives from `--font-scale` and rescales together, hierarchy preserved

---

## MODIFIED Requirements

### Requirement: Legible, Scalable Base Typography

The application's text sizing MUST be driven by a **single typography scale**
rather than scattered hardcoded pixel values. All `font-size` values MUST derive
from shared size tokens governed by one **scale multiplier**, so the entire app
can be resized from one place. The multiplier MUST be **user-adjustable** and
persisted locally (see User-Adjustable Font Size). Its shipped **default MUST
enlarge text for mobile legibility** — at least **1.5× (150%)** the original base
sizes — while remaining adjustable **down to 100%** (original) and **up to at
least 200%**. The relative size **hierarchy** MUST be preserved (all sizes scale
by the same factor). Sizing SHOULD be expressed relative to the root font size so
the browser/OS text-size preference also applies. No value within the supported
range MUST clip, overlap, or hide text on a mobile viewport. The scale is
**theme-independent** and is unaffected by the choice of font families in the
Momentum type system (see Momentum Type System) — swapping typefaces MUST NOT
change the scale mechanism, its default, or its supported range.

#### Scenario: Default is comfortably enlarged
- GIVEN a screen whose row title is 14px at 100%
- WHEN the app renders with the shipped default scale (150%)
- THEN the row title's effective size is about 21px (1.5× the original)

#### Scenario: Hierarchy is preserved
- GIVEN prior sizes where the title was larger than its subtitle
- WHEN every size is scaled by the same multiplier
- THEN the title remains proportionally larger than the subtitle (ratios unchanged)

#### Scenario: Momentum fonts do not disturb the scale
- GIVEN the Momentum type system is applied (Sora / Manrope / JetBrains Mono)
- WHEN the user changes the font scale within 100%–200%
- THEN the whole app rescales from the single `--font-scale` knob exactly as before, with no clipping or overlap

> Note: No requirement is removed. The former light color scheme was an
> implementation detail of the token file, not a specified requirement; it is
> superseded by the Dark Premium Visual Identity requirement above.
