# Implementation Tasks: Session Weight Uses the Per-Gym Target

**Change ID:** `session-uses-target-weight`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Removed `usedValue?` / `usedUnit?` from `SessionEntry` in
      `src/db/types.ts` (keeps `exerciseName` snapshot + `done`). ✓
- [x] 1.2 `src/db/repos.ts`: `startSession` no longer looks up the weight or sets
      `usedValue`/`usedUnit` (entry = `sessionId`, `exerciseId`, `exerciseName`,
      `done`); dropped `d.weights` from its transaction. Removed `setEntryWeight`. ✓
- [x] 1.3 Dexie `version(4)` migration in `src/db/db.ts` strips
      `usedValue`/`usedUnit` from existing `sessionEntries`. ✓
- [x] 1.4 Rewrote session data-layer tests in `src/db/repos.test.ts`: entries have
      no stored weight; the session weight is the live per-gym target; adjusting it
      goes through `saveWeight` (updates target + history); survives source
      deletion via the name snapshot. Dropped `setEntryWeight`/snapshot assertions. ✓

**Quality Gate:** PASSED (whole-project typecheck deferred to Phase 3 while the UI
was migrated off the removed fields; green there and at final build)
- [x] `npm test` (data layer) passes — 30/30 in `repos.test.ts`
- [x] `npm run typecheck` — passes (verified at end of Phase 3)

---

## Phase 2: Business Logic (State / Selectors)

- [x] 2.1 Runner + read-only recap resolve the per-entry weight from the current
      target via `useGymWeights(session.gymId)` (Map<exerciseId, Weight>) — no new
      persisted state (`SessionPage`). ✓
- [x] 2.2 Session detail binds `WeightEditor` to `(session.gymId,
      entry.exerciseId)`; catalog binds to `(activeGymId, exerciseId)`. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Weight source (per-gym target) exercised by repo + integration tests

---

## Phase 3: User Interface

- [x] 3.1 Extracted `src/features/exercise/WeightEditor.tsx` — the **Peso alvo**
      card (edit→save stepper + unit segment) **and** the per-gym history timeline
      (Sparkline + delete-with-confirm). Props: `gymId: number | null`,
      `exerciseId: number | null`, `readOnly?`. `canEdit = !readOnly && exerciseId
      != null` gates edit + history delete. ✓
- [x] 3.2 `ExerciseDetailPage` renders `<WeightEditor>` in the **Detalhe** tab;
      removed the now-duplicated weight/history logic and dead imports. ✓
- [x] 3.3 `SessionEntryPage`: replaced the "Peso usado" card + read-only history in
      the **Execução** tab with `<WeightEditor gymId={session.gymId}
      exerciseId={entry.exerciseId ?? null} readOnly={session.status ===
      'completed'} />`; removed `setEntryWeight`, local weight state, and unused
      imports. ✓
- [x] 3.4 `SessionPage` runner rows show the live target from
      `useGymWeights(session.gymId)` (value + unit, or "definir") — used by both
      the in-progress runner and the completed recap. ✓
- [x] 3.5 Updated `session.integration.test.tsx`: editing weight on the entry
      detail updates the exercise's **target** (asserted on `db.weights`) with no
      per-session `usedValue`. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (session integration 4/4; repos 30/30; notes 2/2)

---

## Phase 4: Integration & Polish

- [x] 4.1 Session detail weight label reads **"Peso alvo"** (via `WeightEditor`);
      no "Peso usado" strings remain (grep clean). ✓
- [x] 4.2 Removed the now-dead `.entry-edit`/`.u-seg` block from `session.css`
      (old per-session editor; no TSX references). `.used-weight` kept (runner
      badge). ✓
- [x] 4.3 `README.md` "How it works": the in-session detail edits the per-gym
      **target** (same editor as the catalog); sessions store no independent
      weight; recap shows the live target + name snapshot. ✓
- [x] 4.4 Behavior verified through the integration harness (real DOM): editing
      the weight on the entry detail updates `db.weights` (target + history) with
      no `usedValue`; runner badge reads the live target. Production build OK.
      (Manual 390px pixel pass still recommended before release.) ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes — 116/116 (serial)
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
