# Delta: app-foundation

**Change ID:** `floating-action-bars`
**Affects:** adds a cross-cutting UI requirement — a screen's primary action, and
a modal's footer, stay reachable without scrolling

---

## ADDED Requirements

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

This pattern applies to the app's create/management screens — creating a **gym**,
**category**, **exercise**, or **training day** — and to the **workout session
runner's** complete-workout action. Each such action keeps its existing behaviour
(label, disabled state, and any accompanying hint) inside the bar. The exercise
stepper detail already follows this pattern (see the `workout-sessions` and
`home-navigation` specs).

A **modal** (bottom sheet) whose content can exceed the screen MUST keep its
**footer actions** (e.g. Cancelar / Salvar) **pinned and visible while its content
scrolls**, so the confirming/cancelling controls are never scrolled out of reach.

#### Scenario: The create button is reachable without scrolling
- GIVEN a settings list (e.g. exercises) long enough to fill the screen
- WHEN the user views the screen
- THEN the "+ Novo…" button is visible in a bar fixed to the bottom, without scrolling to the end of the list

#### Scenario: The bar covers no content at any font size
- GIVEN a screen with a fixed action bar and content taller than the viewport, at the maximum font-size setting
- WHEN the user scrolls to the bottom
- THEN the last content is fully readable above the bar

#### Scenario: Finishing a workout from a fixed bar
- GIVEN an in-progress workout session on a long training day
- WHEN the user views the runner
- THEN "Concluir treino" is in the bottom bar (with its disabled state and hint preserved), reachable without scrolling

#### Scenario: A modal footer stays visible while its content scrolls
- GIVEN the "Novo dia" modal whose exercise picker is taller than the sheet
- WHEN the user scrolls the picker
- THEN the Cancelar and Salvar buttons stay pinned to the bottom of the sheet, always visible

#### Scenario: A toast is not hidden by the bar
- GIVEN a screen with a fixed action bar
- WHEN a confirmation toast appears
- THEN it renders above the bar, not underneath it

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
