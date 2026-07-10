# Delta: app-foundation

**Change ID:** `increase-base-typography`
**Affects:** global typography / mobile legibility

---

## ADDED Requirements

### Requirement: Legible, Scalable Base Typography

The application's text sizing MUST be driven by a **single typography scale**
rather than scattered hardcoded pixel values. All `font-size` values MUST derive
from shared size tokens governed by one **scale multiplier**, so the entire app
can be resized from one place. The default effective text size MUST be **at
least 2× (200%)** the pre-change sizes, while preserving the relative size
**hierarchy** (all sizes scale by the same factor). Sizing SHOULD be expressed
relative to the root font size so the browser/OS text-size preference also
applies. Increasing the scale MUST NOT clip, overlap, or hide text on a mobile
viewport.

#### Scenario: Text is at least twice as large
- GIVEN a screen whose row title was 14px before this change
- WHEN the app renders with the default scale
- THEN the row title's effective size is at least 28px (≥ 2× the original)

#### Scenario: Hierarchy is preserved
- GIVEN prior sizes where the title was larger than its subtitle
- WHEN every size is scaled by the same multiplier
- THEN the title remains proportionally larger than the subtitle (ratios unchanged)

#### Scenario: One knob rescales the whole app
- GIVEN all font sizes derive from the shared scale multiplier
- WHEN the multiplier value is changed in a single place
- THEN every screen's text rescales uniformly with no per-component edits

#### Scenario: No clipped or overlapping text after scaling
- GIVEN the enlarged default scale on a phone-sized viewport
- WHEN the user views the app bar, tab bar, list rows, badges, sheets, and empty states
- THEN all text is fully visible without clipping or overlap (regions wrap or expand as needed)

#### Scenario: Inputs avoid mobile zoom-on-focus
- GIVEN a text input on a mobile browser
- WHEN the input's font size is scaled
- THEN its effective size remains at least 16px so focusing it does not trigger an automatic zoom

#### Scenario: No stray hardcoded sizes
- GIVEN the styling sources after this change
- WHEN font sizes are inspected outside the token definitions
- THEN no component sets a hardcoded pixel `font-size` (all reference the shared scale)

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
