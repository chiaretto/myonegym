# Implementation Tasks: Show Exercise Image at Full Proportional Height

**Change ID:** `exercise-image-full-height`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 N/A — presentation-only change; no data model or repo work ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 N/A — no state changes ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes

---

## Phase 3: User Interface

- [x] 3.1 Removed `aspect-ratio: 16/10` from `.hero` (kept bg / radius /
      overflow / centering) ✓
- [x] 3.2 `img.hero-media { width: 100%; height: auto; max-height: 72vh;
      object-fit: contain; display: block }` — full proportional height, capped,
      un-cropped ✓
- [x] 3.3 `.media-fallback.hero-media { aspect-ratio: 16/10; width: 100%;
      display: grid; place-items: center; ... }` — placeholder stays a box ✓
- [x] 3.4 All three consumers (ExerciseDetailPage, SessionEntryPage, DaysPage
      preview) verified via the shared classes — no TSX change needed ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Existing component tests still pass (63/63)

---

## Phase 4: Integration & Polish

- [x] 4.1 No new strings ✓
- [x] 4.2 Visual pass at 390px with data-URI SVG media on the exercise detail:
      portrait 240×480 → 608px (capped 72vh, full), tall 200×700 → 608px
      (capped, contained), landscape 480×240 → 181px (natural), no-media → 226px
      (16:10 placeholder box) ✓
- [x] 4.3 Home/Settings thumbnails (`.thumb`) untouched ✓
- [x] 4.4 README has no media-box description — nothing to sync ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (63/63)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
