# Proposal: Workout Session Log

**Change ID:** `add-workout-session-log`
**Created:** 2026-07-09
**Status:** Implementation Complete
**Completed:** 2026-07-09

---

## Problem Statement

- **What problem are we solving?** MyOneGym today records only the *target*
  weight for each exercise per gym, plus a change log of how that target evolved.
  It does not record **that a workout actually happened**. The user cannot answer
  "did I train legs this week?", "when did I last do Dia 1?", or "how many
  sessions did I do this month?".
- **Who is affected?** The single end user tracking their own routine. Someone
  who trains consistently wants a lightweight training history, not just a
  weight number.
- **Current pain point?** The weight history timeline is per-`(gym, exercise)`
  and only moves when the target changes — it is not a record of attendance or
  of what was done in one visit. There is no notion of a "workout session" that
  groups the exercises done on a given day at a given gym.

## Proposed Solution

Introduce a **workout session** — a record of one training visit — that lives
alongside the existing entities and stays true to the offline, local-only,
per-gym model.

- **Start a session** from a training day on Home. The session is created in the
  **active gym** and snapshots that day's exercises into per-exercise
  **session entries**, each carrying the exercise's current target weight/unit
  at start time.
- **Run the session**: check off each exercise as done; optionally adjust the
  **weight actually used** for that entry (defaulted from the target). Only one
  session may be active at a time.
- **Complete the session**: stamps a completion time. Completed sessions are
  immutable except for deletion.
- **Session history**: a new view lists past sessions for the active gym, newest
  first (day name, date, gym, count done). Opening a session shows its entries.
- **Snapshots for durability**: session entries store the exercise **name** and
  the **weight used** as snapshots, so renaming/deleting an exercise, day, or
  changing a target later does not rewrite past sessions.
- **Backup-worthy**: unlike the device-local weight change log, sessions are
  real training history and ARE included in the full-backup JSON export/import.

## Scope

### In Scope
- A `workout-sessions` capability: start, run (mark done / set used weight),
  complete, view history, view session detail, delete a session.
- One active (in-progress) session at a time, scoped to the active gym.
- Session entries snapshot exercise name + used weight/unit at session time.
- "Start workout" affordance on the Home training-day accordion.
- Include sessions in the full-backup export and (replace-all) import.

### Out of Scope
- Per-set / per-rep tracking (sets × reps × RPE). Entries are per-exercise for v1.
- Rest timers and in-session notifications (separate proposal).
- Progress charts / analytics over sessions (separate proposal).
- Editing a completed session's entries (only deletion is allowed for v1).
- Automatically pushing a session's "used weight" into the target weight/history
  (may be a follow-up; v1 keeps sessions and targets decoupled).
- Including sessions in the *share* export (that document stays exercises-only).

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database  | Yes | New Dexie schema `version(2)`: `sessions` and `sessionEntries` tables. Additive migration; no changes to existing tables. |
| Data layer (repos) | Yes | New repo functions: `startSession`, `listSessions`, `getSession`, `setEntryDone`, `setEntryWeight`, `completeSession`, `deleteSession`, `getActiveSession`. Cascade: deleting a session removes its entries. |
| State     | Yes | Reuse `useActiveGym`; sessions are filtered by active gym. Optional lightweight active-session awareness for the Home "resume" affordance. |
| UI        | Yes | New "Active session" runner view + "Session history" list + session detail. New "Start" control on Home day headers. |
| Import/Export | Yes | Full-backup JSON gains a `sessions` (+ entries) section; import validates and restores it. Share export unchanged. |
| i18n / copy | Yes | New Portuguese strings ("Iniciar treino", "Sessões", "Concluir", etc.) consistent with existing copy. |

## Architecture Considerations

- **Fits the existing per-gym model.** A session belongs to a gym exactly as
  weights do (`gymId`). History views filter by the active gym, mirroring the
  weight-history behaviour.
- **Snapshot over reference.** Session entries keep `exerciseId`/`dayId` for
  linking *and* denormalized `exerciseName` + `usedValue`/`usedUnit` snapshots,
  so past sessions survive edits/deletes of the source entities (the same
  durability concern the weight history sidesteps by being append-only).
- **Additive Dexie migration.** Bump to `this.version(2).stores({...})` adding
  the two new stores; existing stores and data are untouched. `allTables()`
  extends to include the new tables for import/reset ordering.
- **New patterns introduced.** First entity that groups multiple exercises into
  a timestamped instance (a "run" of a day), and the first data with a
  start/complete lifecycle status.
- **Design reference.** Visual layout for the runner and history is checked in
  under `mockups/session-runner.html` and `mockups/session-history.html`. The
  read-only variant for a completed session and the Home day-header
  `▶ Iniciar` / `● Continuar` affordance are documented in `mockups/README.md`.
  Palette and components reuse the design tokens from that README — no new
  colors or component families are introduced.

## Success Criteria

- [ ] A user can start a workout from a day, mark exercises done, and complete it.
- [ ] Only one active session exists at a time; it is scoped to the active gym.
- [ ] Completed sessions appear in history (newest first) for the active gym and
      can be opened and deleted.
- [ ] Session entries preserve exercise name + used weight even after the source
      exercise/day/target changes.
- [ ] Full-backup export/import round-trips sessions and their entries.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` pass; new data-layer
      and component tests cover the flows above.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep into sets/reps/timers/charts | Med | Med | Explicitly out of scope; v1 is per-exercise done + used weight only. |
| Dexie migration breaks existing local data | Low | High | Additive `version(2)` only adds stores; covered by a migration/round-trip test. |
| Orphaned entries when a day/exercise is deleted | Med | Med | Store snapshots (name, used weight); keep nullable `exerciseId`/`dayId` links; deleting a source entity leaves past sessions intact. |
| Backup schema change breaks old imports | Low | Med | Version the backup document; treat missing `sessions` as an empty list on import. |
| Two sessions started at once | Low | Med | Enforce a single active session per gym at the repo layer with a guard + test. |

---

## Archive Information

**Archived:** 2026-07-09
**Duration:** 0 days (created and completed 2026-07-09)
**Outcome:** Successfully implemented

### Files Modified
- `src/db/types.ts`, `src/db/db.ts` (Dexie v2 + `sessions`/`sessionEntries`), `src/db/repos.ts`
- `src/data/portability.ts` (sessions in backup, `SCHEMA_VERSION` 2)
- `src/lib/hooks.ts`, `src/lib/format.ts`
- `src/features/session/` (new: `SessionPage`, `SessionsPage`, `session.css`)
- `src/features/home/HomePage.tsx` + `home.css` (Iniciar/Continuar affordance)
- `src/features/settings/SettingsPage.tsx`, `src/App.tsx`, `README.md`
- Tests: `src/db/repos.test.ts`, `src/data/portability.test.ts`, `src/features/session/session.integration.test.tsx`

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — **new capability** (7 requirements)
- `openspec/specs/home-navigation/spec.md` — added **Start or Resume a Workout From a Day**
- `openspec/specs/data-portability/spec.md` — modified **Export Full Backup JSON** and **Import JSON (Replace All)** to include sessions

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (48/48) — all pass
- Visual pass at 390px: start → runner → complete → history → detail
