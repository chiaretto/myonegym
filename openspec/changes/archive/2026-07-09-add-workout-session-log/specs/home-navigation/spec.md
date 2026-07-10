# Delta: home-navigation

**Change ID:** `add-workout-session-log`
**Affects:** Home accordion — starting/resuming a workout session from a day

---

## ADDED Requirements

### Requirement: Start or Resume a Workout From a Day

Each training day on the Home accordion MUST expose a **start workout**
affordance that begins a session for that day in the **active gym** (see the
workout-sessions spec). When the active gym already has an in-progress session,
the affordance MUST instead offer to **resume** that session rather than start a
new one.

#### Scenario: Start a workout from Home
- GIVEN gym "A" is active and "Dia 1" is shown on Home with no active session
- WHEN the user taps the start-workout affordance on "Dia 1"
- THEN an in-progress session for "Dia 1" is created in gym "A"
- AND the user is taken to the active-session runner

#### Scenario: Resume instead of starting a second session
- GIVEN gym "A" already has an in-progress session for "Dia 1"
- WHEN the user views Home
- THEN the affordance invites the user to resume the active session
- AND tapping it opens the existing session rather than creating a new one

#### Scenario: Start requires an active gym
- GIVEN no gym is active
- WHEN the user taps the start-workout affordance
- THEN starting is blocked and the user is prompted to create/select a gym first

---

## MODIFIED Requirements

(None)

---

## REMOVED Requirements

(None)
