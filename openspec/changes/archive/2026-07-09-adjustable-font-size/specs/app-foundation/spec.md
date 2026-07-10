# Delta: app-foundation

**Change ID:** `adjustable-font-size`
**Affects:** global typography — the scale becomes a user setting
**Builds on:** `increase-base-typography`

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
range MUST clip, overlap, or hide text on a mobile viewport.

#### Scenario: Default is comfortably enlarged
- GIVEN a screen whose row title is 14px at 100%
- WHEN the app renders with the shipped default scale (150%)
- THEN the row title's effective size is about 21px (1.5× the original)

#### Scenario: Hierarchy is preserved
- GIVEN prior sizes where the title was larger than its subtitle
- WHEN every size is scaled by the same multiplier
- THEN the title remains proportionally larger than the subtitle (ratios unchanged)

#### Scenario: One knob rescales the whole app
- GIVEN all font sizes derive from the shared scale multiplier
- WHEN the multiplier value changes (in code default or via the user setting)
- THEN every screen's text rescales uniformly with no per-component edits

#### Scenario: No clipped or overlapping text across the range
- GIVEN any scale within the supported range (100%–200%) on a phone-sized viewport
- WHEN the user views the app bar, tab bar, list rows, badges, sheets, and empty states
- THEN all text is fully visible without clipping or overlap (regions wrap or expand as needed)

#### Scenario: Inputs avoid mobile zoom-on-focus
- GIVEN a text input on a mobile browser at the minimum scale (100%)
- WHEN the input's font size is computed
- THEN its effective size remains at least 16px so focusing it does not trigger an automatic zoom

#### Scenario: No stray hardcoded sizes
- GIVEN the styling sources
- WHEN font sizes are inspected outside the token definitions
- THEN no component sets a hardcoded pixel `font-size` (all reference the shared scale)

---

## ADDED Requirements

### Requirement: User-Adjustable Font Size

Settings MUST provide a control to choose the app's **font size** (the scale
multiplier) within a supported range of **at least 100%–200%**. The chosen value
MUST **persist locally** across sessions and app restarts (device-local; it is
NOT part of the data backup). Applying a value MUST take effect **immediately and
app-wide** (live). The control MUST offer a **reset to the default** and SHOULD
show the **current value** (e.g., a percentage) and a **live preview**. Values
outside the supported range MUST be **clamped**. The stored value MUST be applied
**before first paint** so the app does not flash a different size on startup.

#### Scenario: Change the font size from Settings
- GIVEN the appearance setting is open
- WHEN the user increases the font size to 180%
- THEN all text across the app immediately grows to the 180% scale

#### Scenario: Preference persists across restarts
- GIVEN the user set the font size to 120%
- WHEN the user closes and reopens the app
- THEN the app renders at 120% (the stored value), without flashing another size first

#### Scenario: Reset to default
- GIVEN the user changed the font size away from the default
- WHEN the user taps "Restaurar padrão"
- THEN the font size returns to the shipped default (150%)

#### Scenario: Out-of-range values are clamped
- GIVEN a stored or entered value outside 100%–200% (e.g., 400% or 50%)
- WHEN the app applies it
- THEN the value is clamped into the supported range before use

#### Scenario: Applies on every screen
- GIVEN the user set a non-default font size
- WHEN the user navigates to Home, a session, an exercise detail, or Settings
- THEN each screen renders at the chosen size

---

## REMOVED Requirements

(None)
