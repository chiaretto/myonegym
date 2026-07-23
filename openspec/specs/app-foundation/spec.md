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

### Requirement: Floating Action Bar for Primary Actions

A screen's **primary action** MUST remain reachable without scrolling. Where a
screen's main action (or small set of actions) would otherwise sit at the **end of
a scrolling body** — so a long list pushes it below the fold — that action MUST be
presented in a **bar fixed to the bottom of the screen**, above the scrolling
content.

The bar MUST **cover no content**: the screen MUST reserve space equal to the
bar's **actual rendered height**, at **any font-size setting** (see
User-Adjustable Font Size). Because the bar scales with the font size, a fixed
reservation would hide content at large scales; the reservation MUST track the
measured height. Transient messages (toasts) MUST NOT render underneath the bar
either.

This pattern applies to the app's **create/edit pages** — creating or editing a
**gym**, **category**, **exercise**, or **training day**, where **Cancelar /
Salvar** sit in the bar (see Create and Edit on Dedicated Pages) — the settings
**list** screens' create action, and the **workout session runner's**
complete-workout action. Each such action keeps its existing behaviour (label,
disabled state, and any accompanying hint) inside the bar. The exercise stepper
detail already follows this pattern (see the `workout-sessions` and
`home-navigation` specs).

A **modal** (bottom sheet) whose content can exceed the screen MUST keep its
**footer actions** (e.g. Cancelar / Confirmar, or a delete action) **pinned and
visible while its content scrolls**, so the acting/cancelling controls are never
scrolled out of reach.

#### Scenario: The create button is reachable without scrolling
- GIVEN a settings list (e.g. exercises) long enough to fill the screen
- WHEN the user views the screen
- THEN the "+ Novo…" button is visible in a bar fixed to the bottom, without scrolling to the end of the list

#### Scenario: The bar covers no content at any font size
- GIVEN a screen with a fixed action bar and content taller than the viewport, at the maximum font-size setting
- WHEN the user scrolls to the bottom
- THEN the last content is fully readable above the bar

#### Scenario: Saving from a form page's fixed bar
- GIVEN a create/edit page whose fields exceed the viewport
- WHEN the user scrolls to the bottom
- THEN Cancelar and Salvar are in the bottom bar, reachable without the form content being covered

#### Scenario: Finishing a workout from a fixed bar
- GIVEN an in-progress workout session on a long training day
- WHEN the user views the runner
- THEN "Concluir treino" is in the bottom bar (with its disabled state and hint preserved), reachable without scrolling

#### Scenario: A modal footer stays visible while its content scrolls
- GIVEN a modal whose body can exceed the sheet (e.g. the photo viewer, or a confirmation)
- WHEN the user scrolls the modal's content
- THEN its footer action(s) stay pinned to the bottom of the sheet, always visible

#### Scenario: A toast is not hidden by the bar
- GIVEN a screen with a fixed action bar
- WHEN a confirmation toast appears
- THEN it renders above the bar, not underneath it

### Requirement: Create and Edit on Dedicated Pages

Creating or editing a catalog entity — a **gym**, **category**, **exercise**, or
**training day** — MUST happen on a **dedicated page (its own route)**, not in a
modal. Each entity MUST expose a **create** route and an **edit** route; opening a
create/edit flow navigates to it, and the list's create control and each row's
edit control navigate there rather than opening an overlay.

Because these are real routes, they MUST be **deep-linkable** (reloading the URL
shows the form) and MUST honour the **browser Back button** and an in-page back
control by returning to the **list**, not by dismissing the app view. Saving MUST
persist and return to the list; cancelling MUST return without saving. An edit
route for an entity that **no longer exists** MUST show a not-found state with a
way back, never a crash.

Modals remain the right surface for **quick, transient, single-purpose**
interactions — a confirmation, a picker (e.g. the active-gym selector), or a
read-only preview (a photo, or an exercise peek) — and those are unaffected.

#### Scenario: Creating an entity happens on a page
- GIVEN the user is on the exercises list
- WHEN the user taps "+ Novo exercício"
- THEN the app navigates to a dedicated create page (its own URL), not a modal

#### Scenario: Editing happens on a page reached from the row
- GIVEN a gym in the list
- WHEN the user taps its edit control
- THEN the app navigates to that gym's edit page at its own URL

#### Scenario: Back returns to the list
- GIVEN the user is on a create or edit page
- WHEN the user uses the back control or the browser Back button
- THEN the list is shown again and the app is not dismissed

#### Scenario: A create/edit URL is deep-linkable
- GIVEN a create or edit URL
- WHEN the user reloads it
- THEN the form page is shown (not a blank list or an error)

#### Scenario: Saving returns to the list with the change applied
- GIVEN the user filled a create page
- WHEN the user saves
- THEN the entity is persisted and the list is shown with it present

#### Scenario: Editing a deleted entity is handled
- GIVEN an edit URL for an entity that has since been deleted
- WHEN the page loads
- THEN a not-found state with a way back is shown, not a crash
