# Delta: home-navigation

**Change ID:** `redesign-onegym-red`
**Affects:** Home screen (`src/features/home/`) — the weekly summary changes from
a progress ring to a seven-day track with a fixed goal, and the day card is
restructured into two lines
**Supersedes:** the Weekly Training Summary requirement added by
`redesign-momentum-dark`

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Weekly Training Summary

The Home screen MUST present a **weekly training summary** at the top of the
content, showing how many workout sessions the user has **completed this week**
against a **fixed weekly goal of 7**.

This replaces the previous behaviour, where the total was the **number of
configured training days** (`days.length`). That denominator was misleading: with
9 configured days a user could never reach "9 / 9" inside a 7-day week, and the
number silently meant "sessions against day-plans" rather than a weekly goal.

The summary MUST include a **seven-day track**, one cell per day of the current
week, **Monday first** — matching the existing `startOfWeek` helper
(`src/lib/week.ts`), which anchors the week to local-midnight Monday.

Each cell MUST convey one of:

- **done** — at least one session was completed that day
- **today** — the current day, still open
- **future** — a day later in the week
- **empty** — a past day with no completed session

A past day with no session MUST render as **empty**, and MUST NOT be marked as a
failure. The app stores no weekday expectation per training day, so "no session
here" is the only claim the data supports.

All values MUST be **derived** from the existing completed-session history —
`Session.completedAt` is already persisted and indexed. No new persisted state is
introduced and no migration is required.

When there is no session history for the current week, the summary MUST render a
valid zero state (0 completed, all cells empty or future) rather than being absent
or broken.

The summary MAY show a **streak** of consecutive days trained, also derived from
completed-session history.

Where the count and the track can disagree — more than one session on the same
calendar day — the day MUST be marked so the difference is legible rather than
looking like a defect.

#### Scenario: Summary reflects completed sessions
- GIVEN the user completed 3 sessions on distinct days of the current week
- WHEN the user opens Home
- THEN the summary shows the text "3 / 7 treinos"
- AND exactly 3 cells of the seven-day track are marked done

#### Scenario: Goal is fixed, not derived from configured days
- GIVEN the user has 4 configured training days
- WHEN the user opens Home
- THEN the summary shows a goal of 7, not 4

#### Scenario: Zero state at the start of the week
- GIVEN the user has completed no sessions in the current week
- WHEN the user opens Home on Monday
- THEN the summary renders "0 / 7 treinos" without error
- AND Monday is marked as today while the remaining six cells are future

#### Scenario: Week starts on Monday
- GIVEN the user completed a session on Sunday of the current week
- WHEN the user opens Home
- THEN that session counts toward the current week
- AND it is shown in the last cell of the track

#### Scenario: Past day with no session is not accused
- GIVEN today is Friday and the user did not train on Wednesday
- WHEN the user opens Home
- THEN Wednesday renders as an empty cell
- AND it carries no failure marker

#### Scenario: Two sessions on the same day stay legible
- GIVEN the user completed two sessions on Tuesday
- WHEN the user opens Home
- THEN Tuesday is marked as done and additionally flagged as having more than one session

### Requirement: Training Day Card

Each training day on Home MUST be presented as a card carrying the day **name**,
the **categories** it covers, an affordance to **start or resume** it, and an
affordance to **expand** it.

The day **name** MUST occupy the **first line** of the card on its own, with the
full card width available to it. The **avatar**, **categories**, **start** and
**expand** affordances MUST sit together on the **second line**.

When the second line cannot give the categories a readable width, the start and
expand affordances MUST wrap to their own line rather than squeezing the
categories to an unreadable column.

The card MAY show a **muscle-group avatar** derived from the day's categories.
There is no muscle-group concept in the data model — `Category` is free text —
so the avatar MUST come from a name-to-artwork map with a neutral fallback, and a
day whose categories match nothing MUST still render a valid card.

The start affordance's accessible name MUST remain exactly **"Iniciar"**, or
**"Continuar"** when a session for that day is already active.

#### Scenario: Name gets its own line
- GIVEN a day whose name is long
- WHEN the card renders
- THEN the name occupies the first line alone
- AND the avatar, categories, start button and chevron are on the line below it

#### Scenario: Actions wrap instead of crushing the categories
- GIVEN a narrow viewport or a large font scale
- WHEN the categories cannot keep a readable width on the second line
- THEN the start and expand affordances move to their own line

#### Scenario: Unmapped categories still render
- GIVEN a day whose categories match no artwork in the map
- WHEN the card renders
- THEN the avatar shows the neutral fallback and the card is otherwise complete

#### Scenario: Start button keeps its accessible name
- GIVEN a day with no active session
- WHEN assistive technology reads the start affordance
- THEN its name is exactly "Iniciar"

---

## REMOVED Requirements

### Requirement: Weekly progress ring

**Reason:** replaced by the seven-day track in the modified Weekly Training
Summary requirement above. The ring answered "how much" but never "when" — it
could show 43% without revealing that the user had not trained for three days.

**Migration:** the ring markup in `HomePage.tsx` (an inline 64×64 `<svg>` with
`.ring-track` / `.ring-fill` circles and a `.week-pct` label) and its CSS are
removed together. They must go in the same change: the ring's geometry lives in
the TSX, so leaving the markup while removing the CSS would paint an unstyled SVG.
