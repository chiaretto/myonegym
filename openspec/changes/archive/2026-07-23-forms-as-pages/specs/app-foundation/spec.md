# Delta: app-foundation

**Change ID:** `forms-as-pages`
**Affects:** create/edit flows become dedicated pages (routes), not modals; the
Floating Action Bar requirement's modal example is updated accordingly

---

## ADDED Requirements

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

---

## MODIFIED Requirements

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

---

## REMOVED Requirements

(None)
