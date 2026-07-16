# Implementation Tasks: Prompt to Finish the Workout After the Last Exercise

**Change ID:** `session-finish-prompt`

---

## Phase 1: User Interface (Stepper Endpoint)

- [x] 1.1 `src/features/session/SessionEntryPage.tsx`: added `useConfirm` +
      `useToast` and imported `completeSession`. In `onCompleteAndAdvance`, after
      `setEntryDone`: non-last → `goTo(nextId)`; last → `allDone =
      entries.every(e => e.id === eId || e.done)`, and when all done →
      `confirm({ title: 'Todos os exercícios concluídos!', message: 'Deseja
      concluir o treino?', confirmLabel: 'Concluir treino' })` → confirm =
      `completeSession` + toast + `nav('/sessions')`, decline/not-all-done =
      `nav(/session/${sessionId})`. ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 2: Tests

- [x] 2.1 Added a `Finish-workout prompt` describe block to
      `src/features/session/session.integration.test.tsx`: complete all via the
      stepper → prompt → **confirm** completes + history; **decline** → runner,
      session 'active'; **skip** a middle exercise → last completion shows **no**
      prompt, runner, session 'active'. ✓

**Quality Gate:** PASSED
- [x] Component/integration tests pass — 7/7 in `session.integration.test.tsx`

---

## Phase 3: Integration & Polish

- [x] 3.1 Runner's existing "Concluir treino" button unchanged — covered by the
      existing `steps between exercises … guards Concluir treino` test (still
      passing). ✓
- [x] 3.2 Prompt flow verified through the integration harness (real DOM): the
      confirm sheet renders "Concluir treino" / "Cancelar" and behaves on
      confirm/decline. Production build OK. (Manual 390px pixel pass still
      recommended.) ✓
- [x] 3.3 `README.md` session flow updated to describe the end-of-stepper finish
      prompt. ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes — 129/129 (serial)
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
