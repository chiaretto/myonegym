# Implementation Tasks: Reorder Training Days

**Change ID:** `reorder-training-days`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Added `order?: number` to the `Day` interface (`src/db/types.ts`) ✓
- [x] 1.2 `listDays` sorts by `order ?? id` (id tiebreaker) — no Dexie index/version change ✓
- [x] 1.3 Added `reorderDays(orderedIds)` — persists `order = index` in a single `rw` tx ✓
- [x] 1.4 Repo test: default insertion order; `reorderDays` persists a new order;
      a new day appends after the ordered ones ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes

---

## Phase 2: Business Logic (State)

- [x] 2.1 N/A — the existing `useDays` live-query reflects the new order ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 `DaysPage` day rows: **Subir/Descer** (up/down) controls, disabled at the
      ends; `moveDay(i, dir)` swaps + calls `reorderDays` ✓
- [x] 3.2 Row layout kept compact — the icon+name area became the tap-to-edit
      button (replacing the pencil), so the row holds up/down/delete without
      crowding; verified at 1.5× (names wrap, no clipping) ✓
- [x] 3.3 Integration test: moving a day in Settings persists the order and the
      Home accordion reflects it ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 "Subir …"/"Descer …" aria-labels ✓
- [x] 4.2 `README.md` — no day-ordering description to sync ✓
- [x] 4.3 Visual pass at 390px: reordered days in Settings (Dia 6 ↑ past Dia 5);
      Home reflects the order ✓
- [x] 4.4 Export/import round-trips `order` (Day is exported whole; unchanged) ✓

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
