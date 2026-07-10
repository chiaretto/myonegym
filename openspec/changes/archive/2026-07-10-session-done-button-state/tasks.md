# Implementation Tasks: Show Done State on the Session Exercise Detail

**Change ID:** `session-done-button-state`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 N/A — pure presentation off `entry.done`; no data/repo work ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 N/A — reads `entry.done`; no state changes ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 `SessionEntryPage`: done control by state — not done → `btn primary`
      "Concluir" (circle icon); done → `btn done` "Concluído" (check). Both call
      `onCompleteAndAdvance` ✓
- [x] 3.2 Added a **"✓ Concluído" chip** to the chips row when `entry.done` ✓
- [x] 3.3 `.btn.done` in `session.css` — accent-tinted confirmed look, distinct
      from the bold primary CTA ✓
- [x] 3.4 Updated session tests: pending taps "Concluir"; after marking + Voltar,
      the exercise shows "Concluído" (button + chip) ✓
- [x] 3.5 Voltar/Avançar, weight edit, read-only unchanged ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass (4 session integration tests)

---

## Phase 4: Integration & Polish

- [x] 4.1 Portuguese copy ("Concluir" pending / "Concluído" done + chip) ✓
- [x] 4.2 `README.md` updated (Concluir → done "Concluído" state + chip) ✓
- [x] 4.3 Visual pass at 390px: done exercise = calm accent "Concluído" + chip;
      pending exercise = bold solid "Concluir", no chip; stepped between them ✓
- [x] 4.4 Read-only completed detail still shows the static done state ✓

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
