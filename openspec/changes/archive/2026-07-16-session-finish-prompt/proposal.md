# Proposal: Prompt to Finish the Workout After the Last Exercise

**Change ID:** `session-finish-prompt`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** In the guided stepper on the session exercise
  detail (`SessionEntryPage`), completing the **last** exercise silently navigates
  back to the runner (`onCompleteAndAdvance` → `nav(/session/${sessionId})`). The
  user gets no acknowledgement that they finished and no offer to **complete the
  workout** — they must notice the runner and tap "Concluir treino" themselves.
- **Who is affected?** Anyone running a workout through the guided stepper — the
  intended primary flow.
- **Current pain point?** The natural end of the stepper (last exercise done) is a
  dead end: no confirmation, no closure, an extra manual step to actually finish
  the session.

## Proposed Solution

When the user completes the **last exercise in the list** and, as a result,
**all** of the session's entries are done, show a confirmation that all exercises
are complete and ask whether to **finish the workout**.

- **Confirm** → complete the session (`completeSession`) and go to the session
  history (matching the existing "Concluir treino" action), with a toast.
- **Decline / dismiss** → return to the **runner** (the session's exercise list),
  session still in progress.
- **Not all done** (some skipped via "Avançar") → no prompt; return to the runner
  as today. This keeps the "todos concluídos" message truthful; the user can still
  finish manually with "Concluir treino".

Reuses the existing `useConfirm` sheet and `completeSession` repo — no new
primitives.

## Scope

### In Scope
- `SessionEntryPage.onCompleteAndAdvance`: on the last exercise, when all entries
  are now done, `useConfirm` → `completeSession` (confirm) or back to the runner
  (decline); non-last and not-all-done paths unchanged.
- Portuguese copy for the prompt ("Todos os exercícios concluídos!", "Deseja
  concluir o treino?", confirm "Concluir treino").

### Out of Scope
- The runner's existing **"Concluir treino"** button and its enable rule (≥1 done)
  — unchanged; this adds a second, guided entry point to the same action.
- Prompting when a **mid-list** exercise completion happens to finish all entries
  (the trigger is the **last-positioned** exercise, per the confirmed decision).
- Any change to how a session is completed/recorded (`completeSession` unchanged).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema or data change. |
| API | No | Offline, local-only. |
| Data layer | No | Reuses `completeSession`. |
| State | No | No new state; reads the current `entries` to test "all done". |
| UI | Yes | `SessionEntryPage.onCompleteAndAdvance` adds the confirm + complete/return branch. |
| i18n / copy | Yes | New Portuguese strings for the finish prompt. |

## Architecture Considerations

- **Reuses existing primitives.** `useConfirm` (async boolean sheet) and
  `completeSession` are already used elsewhere (`ExerciseDetailPage`,
  `SessionPage`); this just composes them at the stepper endpoint.
- **"All done" is derived, not stored.** After marking the current entry done, the
  check is `entries.every(e => e.id === currentId || e.done)` — the just-completed
  entry counts as done even before the live query re-emits.
- **Consistent completion.** Confirming runs the same `completeSession` + navigate
  to `/sessions` + toast that the runner's "Concluir treino" uses, so both paths
  end identically.

## Success Criteria

- [ ] Completing the last exercise with all entries done shows a prompt asking to
      finish the workout.
- [ ] Confirming completes the session and lands on the session history.
- [ ] Declining returns to the runner with the session still in progress.
- [ ] Completing the last exercise while some are skipped shows **no** prompt and
      returns to the runner.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass; an integration
      test covers confirm, decline, and the skipped-entries paths.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| "All done" computed before the live query updates | Med | Med | Treat the just-completed entry as done in the check (`e.id === currentId || e.done`). |
| Double completion (prompt + manual button) | Low | Low | Confirming navigates away to history immediately; the runner button path is unchanged. |
| Prompt feels intrusive on a deliberate early finish | Low | Low | Prompt only fires on the **last** exercise when **all** are done; skipped flows are untouched. |

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created and completed 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/SessionEntryPage.tsx` (finish prompt in `onCompleteAndAdvance`)
- `src/features/session/session.integration.test.tsx` (confirm/decline/skipped tests)
- `README.md` (session flow mentions the finish prompt)

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — modified **Session Exercise Detail**: end-of-stepper finish prompt (all-done → prompt; confirm completes, decline/skip returns to the runner) + 4 scenarios

### Verification
- `npm run build` (typecheck + production build) — pass
- `npm test` — 129/129 (serial)
- `openspec validate session-finish-prompt --strict` — valid
