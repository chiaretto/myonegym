# Implementation Tasks: Richer Example Data from a Bundled Backup

**Change ID:** `example-data-from-backup`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Added `src/data/example-data.json` (issue #4 backup — gyms, categories,
      exercises, days, weights) ✓
- [x] 1.2 Rewrote `generateExample` (`src/data/portability.ts`) to insert from the
      bundled data with **id remapping**: categories (dedup by name) → exercises
      (remapped categoryId, keep mediaUrl) → days (remapped exerciseIds, drop the
      dataset `categoryId`) → gym "Fit Park" + weights (+ history) only when no gym
      exists ✓
- [x] 1.3 Updated the `generate example` test (8 categories, 27 exercises, 6 days,
      1 gym "Fit Park", 18 weights, media present, days have no categoryId) ✓
- [x] 1.4 Added an additive/reference-safe test (existing "Peito" + gym → no dup,
      no 2nd gym, all day→exercise refs resolve) ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 N/A — no state changes ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 N/A — `DataPage` "Gerar exemplo" unchanged ✓
- [x] 3.2 Decoupled `home.integration.test.tsx` — seeds its own gym/day/exercise/
      weight via repos ✓
- [x] 3.3 Decoupled `session.integration.test.tsx` — shared `seedDia1()` fixture
      (gym + "Dia 1" 3 exercises + "Dia 2", Supino 40 KG) replacing `generateExample` ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] All component/integration tests pass (65/65)

---

## Phase 4: Integration & Polish

- [x] 4.1 No new strings ✓
- [x] 4.2 `README.md` unchanged — only says "generate an example routine" (no
      content to sync) ✓
- [x] 4.3 Visual pass at 390px: fresh app → **Gerar exemplo** → gym "Fit Park",
      6 days with derived categories, real exercise media + weight badges ✓
- [x] 4.4 Generated data verified (counts: 8/27/6/1/18); export/import unaffected ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (65/65)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
