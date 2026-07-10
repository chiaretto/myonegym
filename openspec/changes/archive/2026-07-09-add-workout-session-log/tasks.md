# Implementation Tasks: Workout Session Log

**Change ID:** `add-workout-session-log`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Added `Session` (`+ status`) and `SessionEntry` types to `src/db/types.ts` ✓
- [x] 1.2 Bumped Dexie to `this.version(2).stores({...})` adding `sessions` +
      `sessionEntries`; extended `allTables()` ✓
- [x] 1.3 Added repos: `startSession`, `getActiveSession`, `getSession`,
      `listSessionEntries`, `listSessionSummaries` (done/total counts),
      `setEntryDone`, `setEntryWeight`, `completeSession`, `deleteSession` ✓
- [x] 1.4 `startSession` rejects (ValidationError) when the gym already has an
      active session ✓
- [x] 1.5 9 data-layer tests in `src/db/repos.test.ts` (snapshot weights, empty
      when unset, snapshot independence, single-active guard, per-gym, run,
      complete, history counts, delete cascade, survives source deletion) ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes

---

## Phase 2: Business Logic (State / Selectors)

- [x] 2.1 Added live-query hooks in `src/lib/hooks.ts`: `useActiveSession`,
      `useSessionSummaries`, `useSession`, `useSessionEntries` (keyed on gymId /
      id; reuse `useActiveGym`, no new persisted store) ✓
- [x] 2.2 All session hooks key on `activeGymId`, so history and the Home
      resume affordance follow the active gym (mirrors weight hooks) ✓
- [x] 2.3 Covered by repo tests (`getActiveSession` per gym) + the integration
      test asserting one active session and Continuar/resume behaviour ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Gym-switch / active-session transitions tested

---

## Phase 3: User Interface

- [x] 3.1 & 3.3 `SessionPage` (`src/features/session/SessionPage.tsx`) — one
      component covering the **runner** (hero, progress bar, checkbox entries,
      editable used-weight pill via bottom sheet, "Concluir treino" CTA) and its
      **read-only** variant when the session is completed (static marks, no
      pencil, completion footer, kebab = "Excluir sessão"). Visually verified. ✓
- [x] 3.2 `SessionsPage` history: per-active-gym list grouped by month,
      done-count badge (full at 100%), count in header, delete via detail ✓
- [x] 3.4 Home day header restructured into title-main / `▷ Iniciar` pill /
      chevron; switches to `Continuar` (filled) when a session is active for the
      day. (Nested buttons avoided by splitting the toggle into its own control.) ✓
- [x] 3.5 Routes `/sessions` + `/session/:id` in `src/App.tsx`; history reachable
      from Settings → "Sessões" (runner kebab is delete-only per mockup) ✓
- [x] 3.6 `session.integration.test.tsx`: start→mark done→complete→history→delete,
      plus single-active-session/resume ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 `exportBackup` now includes `sessions` + `sessionEntries`;
      `SCHEMA_VERSION` bumped to 2. DataPage needs no change (it calls the
      serializer, which is format-agnostic). ✓
- [x] 4.2 `parseBackup` treats a missing `sessions`/`sessionEntries` field as `[]`
      (older backups import as zero sessions); `importBackupReplaceAll` restores
      them; share export unchanged (exercises only) ✓
- [x] 4.3 3 portability tests: exports sessions, round-trips them, older backup
      imports as zero sessions ✓
- [x] 4.4 All copy is Portuguese ("Iniciar", "Continuar", "Concluir treino",
      "Sessões", "Excluir sessão", "Nenhuma sessão ainda", …) ✓
- [x] 4.5 `README.md` "How it works" documents workout sessions + backup note ✓
- [x] 4.6 Visual pass at 390px (headless Chromium): Home pill → runner (progress,
      checkboxes, weight pills, "definir") → history (2/3 badge, month group) →
      read-only detail — no clipping/overlap at 2× type ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (46/46)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
