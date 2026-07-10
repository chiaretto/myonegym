# Proposal: Guided Session Navigation

**Change ID:** `session-guided-navigation`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Implements:** GitHub issue #3 — "Melhorar a experiência do uso do Workout Session"
**Builds on:** `add-workout-session-log`, `session-exercise-detail`

---

## Problem Statement

- **What problem are we solving?** Running a workout is clunky. On the exercise
  **detail** the done control is a toggle ("Marcar como concluído") that leaves
  the user on the same screen — to do the next exercise they must go back to the
  runner and tap the next row. There is also no guard against **completing a
  session with nothing done**.
- **Who is affected?** Anyone training with the app — the core in-session flow.
- **Current pain point?** (issue #3)
  1. Marking an exercise done doesn't move you forward.
  2. No quick way to step between exercises from the detail.
  3. "Concluir treino" can be pressed even when zero exercises were marked.

## Proposed Solution

Turn the exercise **detail** into a guided "player" and guard completion.

- **"Concluído" button that advances.** Replace the detail's
  "Marcar como concluído" toggle with a primary **"Concluído"** button: clicking
  it marks the entry done **and navigates to the next exercise's detail** (or
  back to the session overview when it is the last one).
- **Voltar / Avançar navigation.** Beside "Concluído", add **Voltar** (previous
  exercise) and **Avançar** (next exercise) controls that navigate **without**
  changing the done state, disabled at the ends of the list.
- **Guard "Concluir treino".** On the runner, disable the **"Concluir treino"**
  button while **no** entry is marked done (with a short hint), so a session
  can't be completed empty.
- **Read-only sessions.** For a completed session the detail stays read-only (no
  marking); Voltar/Avançar may still be used to browse the exercises.

## Scope

### In Scope
- `SessionEntryPage`: replace the done toggle with a **Concluído** button that
  marks done and advances; add **Voltar** / **Avançar** navigation between the
  session's exercises (disabled at the ends); last-exercise Concluído returns to
  the runner.
- `SessionPage`: disable **"Concluir treino"** when the done count is 0 (+ hint).
- Un-marking remains available via the runner list checkbox.

### Out of Scope
- Auto-advance timers / rest timer between exercises (separate proposal).
- Reordering exercises during a session.
- Changing the runner list's per-row checkbox behaviour (kept as the quick
  toggle / un-mark).
- Swipe gestures for prev/next (buttons only for now).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | No | Reuses `setEntryDone`, `listSessionEntries` / `useSessionEntries`. |
| State | No | Prev/next derived from the ordered entries; no new store. |
| UI | Yes | `SessionEntryPage` (button row + navigation), `SessionPage` (disable "Concluir treino"). |
| i18n / copy | Yes (small) | "Concluído", "Voltar", "Avançar", and a disabled-state hint. |

## Architecture Considerations

- **Detail as a stepper.** `SessionEntryPage` already renders one entry; it
  gains the ordered `useSessionEntries(sessionId)` to compute the current index
  and the previous/next entry ids, then navigates with the existing
  `/session/:id/entry/:entryId` route — no new routes or data.
- **Forward-only Concluído.** "Concluído" always marks done (idempotent) and
  advances; un-marking stays on the runner list, keeping the player simple.
- **Completion guard is presentational + specified.** Disabling "Concluir
  treino" at 0-done is a UI guard; the `workout-sessions` "Complete a Session"
  requirement is updated to require at least one done entry.
- **No data-layer change**, so risk is contained to two components.

## Success Criteria

- [ ] On the exercise detail, **Concluído** marks the entry done and shows the
      **next** exercise; on the last exercise it returns to the runner.
- [ ] **Voltar** / **Avançar** move to the previous/next exercise without
      changing done state; disabled at the first/last exercise.
- [ ] **"Concluir treino"** is disabled while no exercise is marked done, and
      enabled once at least one is.
- [ ] A completed session's detail is read-only (no marking); navigation still
      works.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with tests for
      mark-and-advance, prev/next navigation, and the completion guard.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Losing the ability to un-mark from the detail | Med | Low | Un-mark remains on the runner list checkbox; documented. |
| Off-by-one at list ends (advance past last / back before first) | Med | Med | Disable Voltar on first and Avançar on last; last-exercise Concluído → runner; covered by tests. |
| Three buttons crowd the row at large font scales | Med | Low | Voltar/Avançar compact (icon + short label); Concluído is the primary; verify at 100–200% scale. |
| Disabling "Concluir treino" traps a user who wants to abandon | Low | Low | Abandoning uses the existing delete (trash) action, not complete. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/SessionEntryPage.tsx` — guided stepper (Concluído mark+advance, Voltar/Avançar)
- `src/features/session/SessionPage.tsx` — "Concluir treino" disabled at 0 done + hint
- `src/features/session/session.css` — stacked stepper layout
- `src/features/session/session.integration.test.tsx`, `README.md`

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — modified **Session Exercise Detail**
  (guided stepper: Concluído advances; Voltar/Avançar navigation) and
  **Complete a Session** ("Concluir treino" disabled when nothing is done)

### Notes
- Implements GitHub issue #3. Verification exposed a 3-in-a-row overflow at 1.5×;
  the stepper was restructured to stack (Concluído full-width, Voltar/Avançar below).

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (64/64) — all pass
- Visual pass at 390px: middle exercise shows Voltar/Avançar enabled; runner at
  0-done shows "Concluir treino" disabled + hint
