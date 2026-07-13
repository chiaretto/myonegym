# app-foundation Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Installable, Offline PWA

The application MUST be a Progressive Web App: installable to the home screen,
mobile-first, and fully usable **offline** with **no login and no backend**.

#### Scenario: Install to home screen
- GIVEN the app is served over HTTPS (or localhost)
- WHEN the user chooses "Add to Home Screen"
- THEN the app installs with a name and icon and launches standalone

#### Scenario: Works offline
- GIVEN the app has been opened once (assets cached)
- WHEN the device is offline
- THEN the user can open the app and access all previously stored data

### Requirement: Local Browser Persistence

All application data MUST be stored locally in the browser (IndexedDB) and
persist across sessions. No data leaves the device except via explicit JSON
export.

#### Scenario: Data survives reload
- GIVEN the user created a gym, exercises, and a day
- WHEN the user closes and reopens the app
- THEN all previously created data is still present

#### Scenario: No network dependency for data
- GIVEN the device is offline
- WHEN the user creates and edits gyms/exercises/days/weights
- THEN all changes are saved locally without any network request

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

### Requirement: First-Launch Example Data Prompt

The app MUST ask the user, the **first time it is opened on a device**,
whether to load the bundled sample routine (see "Generate Example Data" in
the data-portability spec). Whether the user accepts or declines, the app
MUST remember locally on the device that the user has been asked, so the
prompt is shown **at most once** per device. This "already asked" flag is
**device-local** (like the font-size preference) and MUST NOT be part of the
exported/imported data backup. Accepting MUST run the same sample-data
generation used by "Gerar exemplo" in Settings. Declining MUST leave the app
without any generated data; the user can still generate the sample later from
Settings. A device that **already has registered data** the first time this
capability runs (e.g. an existing installation upgrading to a build that
includes this feature) MUST be treated as already-asked and MUST NOT be
prompted retroactively.

#### Scenario: First open offers the sample data
- GIVEN the app is opened for the first time on a device (no registered data, never asked before)
- WHEN the app finishes loading
- THEN the user is asked whether to load the sample exercises and training days

#### Scenario: Accepting loads the sample routine
- GIVEN the first-launch prompt is shown
- WHEN the user accepts
- THEN the bundled example routine is generated (the same result as tapping "Gerar exemplo" in Settings)
- AND the generated categories, exercises, days, gym, and weights are visible on Home

#### Scenario: Declining starts empty
- GIVEN the first-launch prompt is shown
- WHEN the user declines (or dismisses the prompt)
- THEN no data is created
- AND the user can still generate the sample later from Settings → Backup → "Gerar exemplo"

#### Scenario: Prompt shown only once per device
- GIVEN the user has already been asked (accepted or declined) on this device
- WHEN the app is opened again
- THEN the first-launch prompt does not reappear

#### Scenario: Existing installs are not retroactively prompted
- GIVEN a device already has registered data (e.g. gyms or exercises) from before this capability existed
- WHEN the app is opened on a build that includes this capability for the first time
- THEN the device is treated as already-asked and the first-launch prompt is not shown

