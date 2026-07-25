# Delta: home-navigation

**Change ID:** `redesign-momentum-dark`
**Affects:** Home screen (`src/features/home/`) — adds two derived, read-only surfaces

---

## ADDED Requirements

### Requirement: Weekly Training Summary

The Home screen MUST present a **weekly training summary** at the top of the
content, showing how many workout sessions the user has **completed this week**.
The summary MUST include a visual **progress indicator** (a ring or equivalent)
and a textual count (e.g. "3 / 5 treinos"). The values MUST be **derived** from
the existing completed-session history (see the workout-sessions spec) — no new
persisted state is introduced. When there is no session history for the current
week, the summary MUST render a valid zero state (0 completed) rather than being
absent or broken.

#### Scenario: Summary reflects completed sessions
- GIVEN the user completed 3 sessions in the current week and their weekly goal/total is 5
- WHEN the user opens Home
- THEN the summary shows a progress indicator at 3/5 and the text "3 / 5 treinos"

#### Scenario: Zero state at the start of the week
- GIVEN the user has completed no sessions in the current week
- WHEN the user opens Home
- THEN the summary renders a valid 0/N state (empty ring, "0 / N treinos") without error

#### Scenario: Summary updates after completing a workout
- GIVEN the summary shows 2 completed this week
- WHEN the user completes another workout and returns to Home
- THEN the summary reflects 3 completed this week

### Requirement: Featured Next Workout

The Home screen MUST visually **feature the next training day** to guide the user
to start their next workout. The featured day MUST be given a distinct treatment
(e.g. an eyebrow label such as "PRÓXIMO TREINO", emphasized title, and a filled
accent **start** call-to-action) that stands apart from the other day cards. The
featured day's start affordance MUST behave exactly like the standard
start/resume affordance (see "Start or Resume a Workout From a Day") — including
resuming an in-progress session and requiring an active gym. When no training
days exist, the featured treatment MUST NOT appear (the empty state applies).

#### Scenario: Next day is featured with a start CTA
- GIVEN at least one training day exists and no session is in progress
- WHEN the user opens Home
- THEN the next training day is shown with a distinct featured treatment and a filled accent start CTA
- AND the other days are shown as standard cards

#### Scenario: Featured CTA starts (or resumes) like the standard affordance
- GIVEN gym "A" is active and the featured day has no active session
- WHEN the user taps the featured start CTA
- THEN an in-progress session for that day is created in gym "A" and the runner opens
- AND if that day already had an in-progress session, tapping resumes it instead of creating a second

#### Scenario: No featured treatment when there are no days
- GIVEN no training days exist
- WHEN the user opens Home
- THEN the empty state is shown and no featured next-workout card appears
