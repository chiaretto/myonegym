# Implementation Tasks: Guided Session Navigation

**Change ID:** `session-guided-navigation`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 N/A — reuses `setEntryDone` and `useSessionEntries`; no data-model or
      repo changes ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 2: Business Logic (Selectors)

- [x] 2.1 `SessionEntryPage` loads ordered entries via `useSessionEntries`;
      computes current index + `prevId`/`nextId` ✓
- [x] 2.2 `goTo(id)` → `/session/:id/entry/:entryId`; `onCompleteAndAdvance`
      = `setEntryDone(true)` then next (or back to runner on the last) ✓
- [x] 2.3 Edges guarded (no prev on first, no next on last) ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 `SessionEntryPage`: **Concluído** (mark + advance) + **Voltar** /
      **Avançar** navigation, disabled at the ends ✓
- [x] 3.2 Read-only (completed): static done state; Voltar/Avançar still browse;
      no marking ✓
- [x] 3.3 `SessionPage`: **"Concluir treino"** disabled when `done === 0` + hint
      ("Marque ao menos um exercício para concluir.") ✓
- [x] 3.4 Layout fits at font scale — **stacked** the stepper (Concluído full-width
      on top, Voltar/Avançar split below) after a 3-in-a-row overflow at 1.5× ✓
- [x] 3.5 Integration tests: Concluído marks + advances; Voltar/Avançar navigate
      without marking; "Concluir treino" disabled at 0-done then enabled ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (4 session integration tests)

---

## Phase 4: Integration & Polish

- [x] 4.1 Portuguese copy ("Concluído", "Voltar", "Avançar", disabled hint) ✓
- [x] 4.2 `README.md` "How it works" describes the guided stepper ✓
- [x] 4.3 Visual pass at 390px (default 1.5×): middle exercise → Voltar/Avançar
      both enabled; runner with 0 done → "Concluir treino" disabled + hint ✓
- [x] 4.4 Un-mark still available from the runner list checkbox ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (64/64)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
