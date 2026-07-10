# Proposal: Show Done State on the Session Exercise Detail

**Change ID:** `session-done-button-state`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Builds on:** `session-guided-navigation`

---

## Problem Statement

- **What problem are we solving?** In the guided session stepper, the exercise
  **detail**'s done control is always the same primary **"✓ Concluído"** button,
  whether or not the current exercise has already been marked done. So when the
  user steps between exercises with **Voltar / Avançar**, there is **no visual
  difference** between an exercise already completed and one still pending — and
  a not-done exercise even shows a button reading "Concluído", which is
  misleading.
- **Who is affected?** Anyone running a workout and navigating between exercises.
- **Current pain point?** You can't tell, on the detail, whether the current
  exercise is done — you have to go back to the runner list to see the checkbox.

## Proposed Solution

Make the detail's done control **reflect the current entry's done state**.

- **Not done** → a prominent call-to-action **"Concluir"** button (empty-circle
  icon) that marks the entry done **and advances** (unchanged behaviour).
- **Already done** → a **distinct "Concluído" state** (filled check, calmer /
  confirmed styling) so the exercise is instantly recognizable as completed;
  activating it still advances.
- **Reinforce at a glance** with a small **"Concluído" chip** near the exercise
  title when the entry is done, so stepping between exercises makes completion
  obvious even before reading the button.

The two styles invert emphasis on purpose: the **pending** action is bold
(invites the tap), the **done** state is calm/confirmed — an established pattern.

## Scope

### In Scope
- `SessionEntryPage` (in-progress): the done control shows **two states** —
  "Concluir" (pending, bold CTA) vs "Concluído" (done, confirmed style) — both
  advance on activation; the pending one also marks done.
- A **"Concluído" chip** on the detail when the current entry is done.
- Keep Voltar/Avançar, weight edit, history, and read-only behaviour as-is
  (read-only already shows a static "Concluído / Não feito").

### Out of Scope
- The runner **list** rows — they already show done state (filled checkbox +
  strikethrough + dimmed); unchanged.
- Un-marking from the detail (still done via the runner list checkbox).
- Any change to progress counting or completion rules.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | No | — |
| State | No | Uses the existing `entry.done`. |
| UI | Yes | `SessionEntryPage` done control (two states) + a done chip; small CSS. |
| i18n / copy | Yes (small) | "Concluir" (pending) vs "Concluído" (done). |

## Architecture Considerations

- **Pure presentation off `entry.done`.** The state already exists; this only
  changes how the detail renders it — no data or logic changes.
- **Consistent with the runner.** The list already distinguishes done/undone;
  this brings the detail in line so the two views agree.
- **Modifies one requirement.** `workout-sessions` → "Session Exercise Detail"
  (the done-control description gains the done/not-done visual states).

## Success Criteria

- [ ] On the detail of a **not-done** exercise, the control is a bold "Concluir"
      CTA (and marks done + advances on tap).
- [ ] On the detail of an **already-done** exercise, the control shows a distinct
      "Concluído" confirmed state (and still advances on tap).
- [ ] Stepping with Voltar/Avançar makes each exercise's done status visible at a
      glance (button state + done chip).
- [ ] Read-only completed sessions still show the static done state.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with tests asserting
      the pending vs done rendering.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Relabelling "Concluído" → "Concluir" (pending) breaks issue-#3 tests/spec | High | Low | This change deliberately updates the "Session Exercise Detail" spec + the affected tests. |
| Done and pending styles not distinct enough | Med | Med | Invert emphasis (bold CTA vs calm confirmed) + add the done chip; verify visually. |
| Confusion about tapping an already-done control | Low | Low | It advances (harmless, idempotent); un-mark remains on the runner list. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/features/session/SessionEntryPage.tsx` — state-aware done control (Concluir / Concluído) + "Concluído" chip
- `src/features/session/session.css` — `.btn.done` confirmed style
- `src/features/session/session.integration.test.tsx`, `README.md`

### Specs Updated
- `openspec/specs/workout-sessions/spec.md` — modified **Session Exercise Detail**
  (done control visually reflects done vs. pending; "Concluir" CTA vs. "Concluído"
  confirmed state + a done chip)

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (64/64) — all pass
- Visual pass at 390px: done exercise = calm accent "Concluído" + chip; pending =
  bold solid "Concluir", no chip
