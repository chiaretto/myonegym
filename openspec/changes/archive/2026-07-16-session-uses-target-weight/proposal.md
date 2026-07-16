# Proposal: Session Weight Uses the Per-Gym Target

**Change ID:** `session-uses-target-weight`
**Created:** 2026-07-16
**Status:** Implementation Complete
**Completed:** 2026-07-16

---

## Problem Statement

- **What problem are we solving?** During a workout, the in-session exercise
  detail (`SessionEntryPage`) edits a **"Peso usado"** value that is stored
  **only on the session entry** (`SessionEntry.usedValue`/`usedUnit`) via
  `setEntryWeight`. It does **not** update the exercise's per-gym **target
  weight**, and it never appends to the weight-change history. So a weight
  adjusted mid-workout is silently lost to the exercise/gym it belongs to.
- **Who is affected?** The end user tracking their loads. They expect the weight
  they set while training to *be* the exercise's weight for that gym — not a
  throwaway per-session number.
- **Current pain point?** There are now **two** notions of weight (the per-gym
  target and a per-session "used" snapshot) that drift apart. The session detail
  also uses a *different, lesser* editor than the catalog exercise detail (no
  stepper history, no delete), so the experience is inconsistent.

## Proposed Solution

Make the workout session carry **no independent weight**. Weight is always the
exercise's **per-gym target** (`weights`, keyed by `(gymId, exerciseId)`), shown
and edited everywhere through the **same "Peso alvo" editor**.

- **Reuse one editor.** Extract the catalog's target-weight card + history
  timeline into a shared **`WeightEditor`** component (the same extraction pattern
  used for `NoteEditor`). `ExerciseDetailPage` and the session entry detail both
  render it, scoped to their gym + exercise.
- **Session detail edits the target.** On `SessionEntryPage` (Execução tab),
  replace the "Peso usado" card with the **Peso alvo** editor bound to
  `(session.gymId, entry.exerciseId)`. Saving calls `saveWeight` → updates the
  target **and** appends a history entry. While the session is **in progress** the
  editor (and its history delete) is editable; when the session is **completed**
  the card is **read-only**, showing the gym's current target.
- **Drop the per-session weight.** Remove `usedValue`/`usedUnit` from
  `SessionEntry`; `startSession` no longer snapshots a weight; `setEntryWeight` is
  removed. Entries still snapshot the exercise **name** (deletion resilience).
- **Live weight everywhere.** The runner rows and the completed-session recap show
  the exercise's **current per-gym target** (or "definir" when unset), looked up
  live rather than from a per-session field.

## Scope

### In Scope
- Extract a shared `WeightEditor` (Peso alvo card + per-gym history timeline with
  per-entry delete + edit→save stepper) from `ExerciseDetailPage`.
- Use `WeightEditor` on `SessionEntryPage` (editable in progress, read-only when
  completed) bound to the session's gym.
- Remove `SessionEntry.usedValue`/`usedUnit`, the weight snapshot in
  `startSession`, and `setEntryWeight`.
- Runner badge + recap show the live per-gym target weight.

### Out of Scope
- Any per-set / per-rep tracking.
- Recording "what weight was used at the time" as history separate from the
  target (the intentional reversal here is that the session shows the *live*
  target, not a frozen value).
- Backup/portability changes (sessions are device-local and already excluded).
- The exercise-notes Observações tab (unchanged).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Yes | Remove `usedValue`/`usedUnit` from `SessionEntry` (non-indexed; no store/index change). Optional `version(4)` migration to strip the fields from existing entries. |
| Data layer (repos) | Yes | `startSession` drops the target-weight lookup/snapshot; `setEntryWeight` removed. The detail saves via existing `saveWeight`. |
| API | No | Offline, local-only. |
| State | Yes | Runner + recap read current targets via `useGymWeights(session.gymId)`; `useSessionEntry` unchanged. |
| UI | Yes | New shared `WeightEditor`; `ExerciseDetailPage` and `SessionEntryPage` consume it; runner/recap badges show live target. |
| Import/Export | No | Sessions are not in backups. |
| i18n / copy | Yes | Session detail label becomes **"Peso alvo"**; runner badge unchanged (number + unit / "definir"). |

## Architecture Considerations

- **Single source of truth for weight.** Collapses the two-weight model into one:
  the per-gym target keyed by `(gymId, exerciseId)`. Fits the project's core
  decision that weight belongs to the exercise within a gym (project.md).
- **Component reuse mirrors `NoteEditor`.** The recently added `NoteEditor` set
  the precedent of a small shared editor consumed by both the catalog detail and
  the session detail; `WeightEditor` follows the same shape (props: `gymId`,
  `exerciseId`, `readOnly?`).
- **Reverses a prior decision.** `add-workout-session-log` /
  `session-exercise-detail` deliberately snapshotted the used weight so past
  sessions were immutable. This change intentionally supersedes that: the session
  reflects the **live** target. Past completed sessions therefore show the
  current target (or "definir"/"—" if it was since cleared/deleted), not a frozen
  value. The exercise **name** snapshot is kept for deletion resilience.
- **No new data patterns.** Reuses `saveWeight`, `listHistory`,
  `deleteHistoryEntry`, and `useGymWeights` — all already present.

## Success Criteria

- [ ] The in-session exercise detail shows the **Peso alvo** editor (same as the
      catalog), scoped to the session's gym.
- [ ] Saving the weight there updates the exercise's per-gym target **and**
      appends a weight-history entry (verifiable on the catalog detail).
- [ ] `SessionEntry` no longer has `usedValue`/`usedUnit`; `startSession` stores
      no weight; `setEntryWeight` is gone.
- [ ] Runner rows and the completed-session recap show the live per-gym target
      (or "definir" when unset).
- [ ] A completed session's detail shows the target **read-only** (no edit, no
      history delete).
- [ ] `npm run build`, `npm run typecheck`, and `npm test` pass; tests cover the
      target-update-from-session flow and the removal of the per-session weight.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Existing completed sessions lose their frozen "used" weight | High (by design) | Low | Intended: recaps show the live target. Document the behavior change; keep the name snapshot so rows still render. |
| Editing weight from a past (completed) session surprises the user | Med | Med | Completed-session detail is **read-only** for weight (confirmed decision). |
| Removing `usedValue` breaks reads of old entries | Low | Med | Fields are optional/non-indexed; stop reading them and (optionally) strip via a `version(4)` migration; covered by a data-layer test. |
| Duplicated weight-editor logic drifts | Low | Med | Extract one `WeightEditor` and consume it in both pages (no copy-paste). |

---

## Archive Information

**Archived:** 2026-07-16
**Duration:** 0 days (created and completed 2026-07-16)
**Outcome:** Successfully implemented

### Files Modified
- `src/db/types.ts` (removed `usedValue`/`usedUnit` from `SessionEntry`)
- `src/db/db.ts` (Dexie `version(4)` migration strips the dead fields)
- `src/db/repos.ts` (`startSession` no weight snapshot; removed `setEntryWeight`)
- `src/features/exercise/WeightEditor.tsx` (**new** shared Peso alvo editor)
- `src/features/exercise/ExerciseDetailPage.tsx` (consumes `WeightEditor`)
- `src/features/session/SessionEntryPage.tsx` (Execução tab → `WeightEditor`, read-only when completed)
- `src/features/session/SessionPage.tsx` (runner/recap badge from `useGymWeights`)
- `src/features/session/session.css` (removed dead `.entry-edit`/`.u-seg`)
- `README.md`
- Tests: `src/db/repos.test.ts`, `src/features/session/session.integration.test.tsx`

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — modified **Start a Workout Session**, **Run a Session**, **Session Exercise Detail**, **View Session Detail** (+ Purpose) for the no-independent-weight / shared-editor model
- `openspec/specs/weights/spec.md` — modified **Edit and Save Weight** (same editor available on the in-session detail while in progress)

### Verification
- `npm run build` (typecheck + production build) — pass
- `npm test` — 116/116 (serial)
- `openspec validate session-uses-target-weight --strict` — valid
