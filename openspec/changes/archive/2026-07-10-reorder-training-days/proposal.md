# Proposal: Reorder Training Days

**Change ID:** `reorder-training-days`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10

---

## Problem Statement

- **What problem are we solving?** Within a day, the user can reorder its
  exercises (up/down). But the **days themselves** appear in a fixed order
  (insertion / id order) and cannot be rearranged. A user who creates days out of
  sequence, or wants to reorder their week, is stuck.
- **Who is affected?** Anyone managing more than one training day
  (**Configurações → Dias de treino**), and anyone browsing them on the Home
  accordion.
- **Current pain point?** `listDays` sorts by `id` and there is no reorder
  affordance for the day list.

## Proposed Solution

Give days an explicit, user-controllable order — mirroring the exercise reorder.

- **Order field.** Add `order?: number` to `Day`. `listDays` sorts by
  `order ?? id` (days without an explicit order fall back to insertion order, so
  existing data and new days behave exactly as today until reordered).
- **Reorder repo.** `reorderDays(orderedIds)` persists `order = index` for each
  day, making the arrangement explicit.
- **UI (`DaysPage`).** Add **up / down** controls to each day row (like the
  exercise rows), disabled at the ends; moving a day recomputes the order and
  calls `reorderDays`.
- **Home reflects it.** The Home accordion already renders `listDays` order, so
  the user's day order shows there automatically.
- **No migration / no Dexie bump.** The order field is added to the type only;
  `listDays` sorts in JS (no new index), so existing stored days are unaffected.

## Scope

### In Scope
- `Day.order` + `listDays` sort by `order ?? id`.
- `reorderDays(orderedIds)` repo function (+ tests).
- Up/down reorder controls on the day list in `DaysPage`.
- Home accordion reflects the day order (already via `listDays`).

### Out of Scope
- Drag-and-drop reordering (buttons only, consistent with the exercise reorder).
- Reordering exercises (already supported) or any change to derived categories.
- A Dexie schema/index change or data migration.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema/index change; `order` is a plain field, sorted in JS. |
| Data layer | Yes | `Day.order`; `listDays` sort by `order ?? id`; new `reorderDays`. |
| State | No | Existing `useDays` live-query reflects the new order. |
| UI | Yes | `DaysPage` day rows get up/down controls + a move handler. |
| Import/Export | No | `Day` is exported whole; `order` round-trips. Old backups (no `order`) sort by id. |
| i18n / copy | Yes (small) | "Subir"/"Descer" aria-labels (already used for exercises). |

## Architecture Considerations

- **Mirrors the exercise reorder.** Same up/down affordance and reassign-indices
  approach, just at the day level with an explicit `order` field (days are
  top-level records, so unlike exercises they can't rely on array position).
- **Backward compatible.** `order ?? id` means untouched days keep insertion
  order; a new day (no order, highest id) still appends; the first reorder
  assigns `order` to all days.
- **No new store / index.** Sorting in JS avoids a Dexie version bump; the day
  list is small so this is cheap.

## Success Criteria

- [ ] In **Dias de treino**, each day has up/down controls (disabled at the ends)
      that rearrange the list; the new order persists across reloads.
- [ ] The **Home accordion** shows days in the user-defined order.
- [ ] Existing data and new days keep insertion order until reordered.
- [ ] Export/import round-trips the order; old backups still import.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with a repo test for
      `reorderDays` + `listDays` and a UI test for moving a day.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Day row crowds (up/down + edit + delete) at large font scale | Med | Med | Verify at 100–200%; if tight, compact the row (e.g., drop the leading icon or restructure) as done for the session stepper. |
| Mixed `order`/`id` sort is inconsistent | Low | Low | `reorderDays` assigns `order` to all days at once; `order` values (0..n-1) always sort before id-fallback new days (append). |
| Reorder races with a concurrent edit/delete | Low | Low | `reorderDays` runs in a single `rw` transaction; live-query re-renders. |

---

## Archive Information

**Archived:** 2026-07-10
**Outcome:** Successfully implemented

### Files Modified
- `src/db/types.ts` — `Day.order?: number`
- `src/db/repos.ts` — `listDays` sorts by `order ?? id`; new `reorderDays(orderedIds)`
- `src/db/repos.test.ts` — reorder persistence tests
- `src/features/settings/DaysPage.tsx` — Subir/Descer controls + `moveDay`
- `src/features/settings/days.integration.test.tsx` — reorder + Home-order test

### Specs Updated
- `openspec/specs/training-days/spec.md` — ADDED "Reorder Training Days"
