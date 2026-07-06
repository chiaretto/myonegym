# home-navigation Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Home Accordion of Training Days

The Home screen MUST present training days as an **accordion**. Expanding a day
lists that day's active exercises, each showing its **name** and **media
thumbnail** (a static image or an animated GIF).

#### Scenario: Expand a day
- GIVEN "Dia 1" contains "Rosca Direta" and "Supino"
- WHEN the user taps "Dia 1" on Home
- THEN the day expands and lists "Rosca Direta" and "Supino" with their media thumbnails (image or GIF)

#### Scenario: Collapse a day
- GIVEN "Dia 1" is expanded
- WHEN the user taps "Dia 1" again
- THEN the day collapses and hides its exercise list

#### Scenario: Empty state
- GIVEN no training days exist
- WHEN the user opens Home
- THEN an empty state guides the user to create data in Settings

### Requirement: Open Exercise Detail

Tapping an exercise on Home MUST open its detail view showing the **rendered
media** (a static image or an animated GIF, played back animated) and the
**editable per-gym weight** (see weights spec).

#### Scenario: View exercise detail
- GIVEN gym "A" is active and "Rosca Direta" has a media URL and weight 20 KG in "A"
- WHEN the user taps "Rosca Direta" from "Dia 1"
- THEN the detail view renders the media (image or animated GIF) and shows 20 KG with an edit control

#### Scenario: Broken media fallback
- GIVEN an exercise's media URL (image or GIF) fails to load
- WHEN its detail view (or list item) renders
- THEN a placeholder is shown instead of a broken image/GIF

### Requirement: Preview Current Weight on Home Rows

Each exercise row on Home MUST also display, as a compact read-only badge, the
**current target weight** (value + unit) for the exercise in the **active
gym**. When no weight is recorded for the exercise in the active gym, the badge
MUST invite the action (e.g., render "definir" or an equivalent hint) instead
of a numeric value or empty space. The badge is not independently editable —
tapping the row still opens the exercise detail (see Open Exercise Detail
requirement).

#### Scenario: Row shows the active-gym weight
- GIVEN gym "A" is active and "Rosca Direta" has weight 20 KG in gym "A"
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge "20 KG"

#### Scenario: Row invites action when no weight is set
- GIVEN "Rosca Direta" has no weight recorded in the active gym
- WHEN Dia 1 is expanded on Home
- THEN the "Rosca Direta" row shows an inline badge with a hint (e.g., "definir")

#### Scenario: Badge follows the active gym
- GIVEN "Rosca Direta" is 20 KG in gym "A" and 15 LB in gym "B"
- WHEN the user switches the active gym from "A" to "B"
- THEN Home rows update to reflect gym "B" weights ("15 LB")

