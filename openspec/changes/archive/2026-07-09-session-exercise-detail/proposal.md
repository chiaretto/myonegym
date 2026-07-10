# Proposal: Session Exercise Detail

**Change ID:** `session-exercise-detail`
**Created:** 2026-07-09
**Status:** Implementation Complete
**Completed:** 2026-07-09
**Depends on:** `add-workout-session-log` (extends the `workout-sessions` capability)

---

## Problem Statement

- **What problem are we solving?** In the workout-session runner, each exercise
  is a compact row (checkbox + name + a used-weight pill that opens a small
  edit sheet). Compared to Home — where an exercise row shows a **media
  thumbnail** and taps through to a rich **detail** (image/GIF, weight, per-gym
  history) — the in-session list is flatter and gives the user no way to see the
  exercise's image or its weight progression *while training*, which is exactly
  when that context is most useful.
- **Who is affected?** A user running a workout who wants to check the movement's
  image/GIF, review how their weight has trended, and adjust the used weight on a
  full screen rather than a cramped inline pill.
- **Current pain point?** The runner row has no thumbnail and is not tappable to
  a detail; weight editing is a tiny sheet; there is no in-session view of the
  weight history. Marking an exercise done is only possible from the list.

## Proposed Solution

Bring the session runner's exercise list in line with Home, and add a
session-scoped exercise **detail** screen.

- **Home-style entry rows.** Each runner entry becomes a row with a **media
  thumbnail + name + category** and a compact, read-only **used-weight badge**,
  plus the existing **done checkbox**. Tapping the row (not the checkbox) opens
  the entry detail.
- **Session Exercise Detail** (`/session/:id/entry/:entryId`) — mirrors the
  existing `ExerciseDetailPage`:
  - Renders the exercise **media** (static image or animated GIF) as a hero.
  - Shows the **used weight** for this entry with an **edit → save** control
    (value + unit KG/LB/#). Saving updates **only this session entry** — the
    exercise's target weight is untouched (consistent with the runner today).
  - Shows the exercise's per-gym **weight-history timeline** (+ sparkline),
    read-only, scoped to the session's gym (reuses the current history view).
  - A **"Marcar como concluído" / "Concluído"** toggle so the entry can be
    marked done **from the detail too**, not only from the list.
- **Read-only parity.** When the session is **completed**, the detail is
  read-only (no weight editing, done toggle disabled), matching the completed
  session's read-only recap.
- **Snapshot-safe.** The entry still carries its name + used-weight snapshot, so
  a detail opened for a since-deleted exercise still shows the name and used
  weight (media falls back to a placeholder; live history is simply empty).

## Scope

### In Scope
- Restyle the runner (and read-only) entry rows to the Home row pattern
  (thumbnail + name + category + read-only used-weight badge + done checkbox).
- Make the row tap-through to a new session exercise detail screen.
- Session Exercise Detail: media hero, used-weight edit→save, per-gym weight
  history timeline (+ sparkline), and a done toggle.
- Read-only detail when the session is completed.
- Move used-weight **editing** from the inline list pill to the detail screen.

### Out of Scope
- Editing the exercise's **target** weight from the session, or pushing the used
  weight into the target/history (that is the separate deferred follow-up).
- Per-set / per-rep tracking.
- Changing which exercises are in the session (session composition is fixed at
  start time).
- Reordering entries.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Reuses `sessions`/`sessionEntries`; no schema change. |
| Data layer (repos) | Yes (small) | Add `getSessionEntry(entryId)`; reuse `setEntryDone`, `setEntryWeight`, `getWeight`, `listHistory`. |
| State | Yes (small) | Add `useSessionEntry(entryId)` live-query hook; reuse `useHistory`, `useGyms`, `useExerciseMap`/`useCategoryMap`. |
| UI | Yes | New `SessionEntryPage`; restyle runner rows in `SessionPage`; new route `/session/:id/entry/:entryId`. Reuse `Media`, `Sparkline`, and the timeline/hero markup + `exercise.css` classes. |
| i18n / copy | Yes | New PT strings ("Marcar como concluído", "Concluído", "Peso usado", …). |

## Architecture Considerations

- **Reuses the Home + ExerciseDetail patterns.** The row mirrors Home's
  `.exercise` row; the detail mirrors `ExerciseDetailPage` (hero `Media`,
  `Sparkline`, history timeline). This keeps one visual language and avoids new
  component families — it slots into the design tokens (incl. the `--fs-*`
  typography scale) with no new colors.
- **Used weight vs. target weight.** The detail **edits the session entry's used
  weight** (this workout only) and **displays the target-weight history** as
  read-only reference — the only weight history the app records. It deliberately
  does not edit the target (that separation is a design decision from the
  session-log change).
- **Done toggle in two places.** `setEntryDone` is the single source of truth;
  both the list checkbox and the detail toggle call it, and the runner's progress
  reflects either. LiveQuery keeps them in sync.
- **Depends on `add-workout-session-log`.** This modifies that change's
  `workout-sessions` requirements; it should be archived after (or alongside)
  that change so the merged spec is coherent.

## Success Criteria

- [ ] Runner entry rows show a media thumbnail and read style like Home rows.
- [ ] Tapping an entry row opens a detail with the exercise media, used weight
      (editable), and the per-gym weight-history timeline.
- [ ] The user can mark an entry done/undone from the detail **and** the list;
      the runner progress updates from either.
- [ ] Editing the used weight on the detail changes only the entry, not the
      exercise's target weight.
- [ ] When the session is completed, the detail is read-only.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` pass, with tests for
      the new detail (open, mark done from detail, edit used weight, read-only).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Nested interactive controls (checkbox inside a tappable row) | Med | Med | Keep the checkbox a sibling of the tap-through area (as done for the Home day header), never nested in a link/button. |
| Confusion between "used weight" (entry) and "target weight" (exercise) | Med | Med | Label clearly ("Peso usado" on the detail); show history as read-only "nesta academia"; do not expose target editing here. |
| Detail for a deleted exercise looks broken | Low | Low | Snapshot name + used weight always render; media placeholder + empty history are acceptable. |
| Duplicated detail UI drifts from `ExerciseDetailPage` | Low | Low | Reuse `Media`, `Sparkline`, and `exercise.css` timeline classes rather than re-authoring. |

---

## Archive Information

**Archived:** 2026-07-09
**Duration:** 0 days (created and completed 2026-07-09)
**Outcome:** Successfully implemented

### Files Modified
- `src/db/repos.ts` (`getSessionEntry`), `src/lib/hooks.ts` (`useSessionEntry`)
- `src/features/session/SessionPage.tsx` (Home-style rows → detail), `session.css`
- `src/features/session/SessionEntryPage.tsx` (new detail screen)
- `src/App.tsx` (route `/session/:id/entry/:entryId`), `README.md`
- Tests: `src/db/repos.test.ts`, `src/features/session/session.integration.test.tsx`

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — modified **Run a Session** (Home-style
  rows, tap-through, done from list or detail; used-weight editing moved to the
  detail) and added **Session Exercise Detail**

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (48/48) — all pass
- Visual pass at 390px: runner rows (thumbnail + badge) → entry detail (media,
  editable used weight, read-only history) → mark done (toggle → filled "Concluído")
