# Proposal: Fix "Próximo treino" Day Selection on Home

**Change ID:** `fix-next-workout-day`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** On the Home ("Treinos") screen, the day marked
  **"Próximo treino"** (next workout) is **always the first day** in the list.
  The code hardcodes it: `const isFeatured = idx === 0 && activeSession == null`
  (`src/features/home/HomePage.tsx:124`). It ignores the user's workout history.
- **Who is affected?** Anyone with a multi-day routine. After finishing "Dia 1"
  they still see "Dia 1" flagged as the next workout instead of "Dia 2".
- **Current pain point?** The feature is meant to guide the user to the next day
  in rotation, but it never advances — making the marking misleading and useless.

## Proposed Solution

Compute the featured day from the **active gym's workout history** instead of a
fixed index.

- The **next workout** is the day **immediately after** the day of the **most
  recent completed session** (for the active gym), in the accordion's display
  order.
- **No completed sessions** → the **first** day.
- The most recent session was the **last** day in the list → **wrap** to the
  first day (restart the rotation).
- The most recent session's day is **no longer in the list** (deleted) → fall
  back to the **first** day.
- Extract the selection into a **pure, unit-tested helper**
  `nextWorkoutDayId(days, lastCompletedDayId)` in `src/lib/days.ts`; Home wires it
  to `useSessionSummaries` (already loaded — completed sessions, newest first) and
  features that day.

## Scope

### In Scope
- Pure helper `nextWorkoutDayId` + unit tests for all cases (none/middle/last/
  wrap/deleted/empty).
- `HomePage` uses the helper to mark the "Próximo treino" day (eyebrow label +
  `featured` styling on the day and its start button).

### Out of Scope
- Any change to how sessions are recorded or ordered (`listSessionSummaries`
  already returns completed sessions newest-first per gym).
- Changing the existing behavior that the marking is suppressed while the gym has
  an **in-progress** session being resumed.
- Cross-gym history (the next day follows the **active gym** only, like the rest
  of Home).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema or data change. |
| API | No | Offline, local-only. |
| Data layer | No | Reuses `listSessionSummaries` / `useSessionSummaries` (completed sessions, newest first). |
| State | No | No new state; derives the featured day from data already loaded on Home. |
| UI | Yes | `HomePage` featured-day computation + a new pure helper in `src/lib/days.ts`. |
| i18n / copy | No | "Próximo treino" wording unchanged. |

## Architecture Considerations

- **Pure function, easy to test.** The rotation logic is a small pure function
  (`days`, `lastCompletedDayId` → `dayId | null`), unit-tested independently of
  React — matching the project's `src/lib` helpers (`daySubtitle`,
  `dayNamesForExercise`).
- **One formula covers every case.** With `idx = days.findIndex(d => d.id ===
  lastCompletedDayId)` (which is `-1` when there is no session or the day was
  deleted), the next index is `(idx + 1) % days.length` — this yields the first
  day for "no session" and for "wrap after the last day" alike.
- **No new data dependencies.** Home already subscribes to `useSessionSummaries`
  (for the weekly ring), so the fix adds no queries.

## Success Criteria

- [ ] With no completed sessions, the **first** day is "Próximo treino".
- [ ] After completing a middle day, the **next** day in the list is featured.
- [ ] After completing the **last** day, the **first** day is featured (wrap).
- [ ] The featured day tracks the **most recent** completed session (not the
      highest index) and follows the **active gym**.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass; unit tests cover
      the helper and an integration test covers Home after a completed session.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Most-recent session's day was deleted | Low | Low | `findIndex` returns `-1` → helper falls back to the first day. |
| Off-by-one / wrap error | Low | Med | Single modulo formula, covered by unit tests for every boundary. |
| Behavior differs from user's mental model of "last session" | Low | Med | Uses the most recent **completed** session for the active gym (the marking is already hidden while a session is in progress). |

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created and completed 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/lib/days.ts` (new pure helper `nextWorkoutDayId`)
- `src/lib/days.test.ts` (unit tests for the helper)
- `src/features/home/HomePage.tsx` (featured day derived from history via the helper)
- `src/features/home/next-workout.integration.test.tsx` (**new** end-to-end cases)
- `src/features/session/session.integration.test.tsx` (incidental: `get`→`find` on the
  Editar button to remove a pre-existing async-live-query race that flaked the gate)

### Specs Updated
- `openspec/specs/home-navigation/spec.md` — added **Feature the Next Training Day** (6 scenarios)

### Verification
- `npm run build` (typecheck + production build) — pass
- `npm test` — 126/126 (serial)
- `openspec validate fix-next-workout-day --strict` — valid
