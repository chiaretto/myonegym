# Delta: app-foundation

**Change ID:** `keyboard-aware-action-bar`
**Affects:** the floating action bar must rise above the on-screen keyboard
instead of hiding behind it

---

## ADDED Requirements

(None)

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

On a device with an on-screen (soft) keyboard, the bar MUST **rise to stay above
the keyboard** when it opens — a form's Salvar/Cancelar (and any toast) MUST remain
visible and tappable while typing — and return to the bottom when the keyboard
closes. The bar MUST NOT be left hidden behind the keyboard.

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

#### Scenario: The bar rises with the on-screen keyboard
- GIVEN a create/edit page whose Salvar/Cancelar are in the bottom bar
- WHEN the user focuses a text field and the soft keyboard opens
- THEN the bar rises to sit just above the keyboard, fully visible and tappable
- AND WHEN the keyboard closes, the bar returns to the bottom of the screen

#### Scenario: A toast is not hidden by the bar
- GIVEN a screen with a fixed action bar
- WHEN a confirmation toast appears
- THEN it renders above the bar, not underneath it

---

## REMOVED Requirements

(None)
