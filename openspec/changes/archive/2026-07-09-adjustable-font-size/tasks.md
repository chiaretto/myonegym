# Implementation Tasks: User-Adjustable Font Size

**Change ID:** `adjustable-font-size`

---

## Phase 1: Foundation (State + Apply)

- [x] 1.1 `src/state/settings.ts` — Zustand `persist` store `useSettings` with
      `fontScale` (default 1.5), `setFontScale` (clamped), `reset`;
      `localStorage` name `myonegym.settings` ✓
- [x] 1.2 Constants `FONT_SCALE_MIN` 1.0, `FONT_SCALE_MAX` 2.0,
      `FONT_SCALE_DEFAULT` 1.5, `FONT_SCALE_STEP` 0.05 + `clampFontScale` ✓
- [x] 1.3 `applyFontScale(v)` sets `--font-scale` on `document.documentElement` ✓
- [x] 1.4 `src/main.tsx` applies the persisted value before `render` (no flash);
      `tokens.css` default set to 1.5 (matches the store default) ✓
- [x] 1.5 Store unit tests: default, clamp below/above, reset, apply, NaN → default ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] `npm test` (store) passes

---

## Phase 2: Business Logic (Live Application)

- [x] 2.1 App-level effect subscribes to `fontScale` and calls `applyFontScale`
      on every change (live app-wide) ✓
- [x] 2.2 Value clamped on read via `clampFontScale` (setter, apply, and
      `onRehydrateStorage` all guard tampered storage) ✓
- [x] 2.3 Integration test asserts the `--font-scale` property updates when the
      store changes ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Live-apply covered by a test

---

## Phase 3: User Interface

- [x] 3.1 `AppearancePage`: range slider (100%–200%, step 5%), percentage readout,
      live-preview card (title + body + weight badge), "Restaurar padrão" ✓
- [x] 3.2 `NavRow` "Aparência" (icon `text-size`) in `SettingsPage`; route
      `/settings/appearance` in `src/App.tsx` ✓
- [x] 3.3 Integration test: slider changes value + live `--font-scale`, persists,
      reset restores default ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Component tests pass

---

## Phase 4: Integration & Polish

- [x] 4.1 Portuguese copy ("Aparência", "Tamanho da fonte", "Prévia",
      "Restaurar padrão") ✓
- [x] 4.2 Inputs stay ≥16px effective at 100% (input token = 16px × 1.0);
      min clamped to 1.0 — no iOS zoom regression ✓
- [x] 4.3 `README.md` (Appearance) + `mockups/README.md` typography note updated
      (default 150%, user-adjustable) ✓
- [x] 4.4 Visual pass at 390px at 100% / 150% / 200% — no clipping/overlap;
      persistence confirmed (set 120% → reload → stays 120%, no flash) ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes (54/54)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
