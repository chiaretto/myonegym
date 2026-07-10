# Implementation Tasks: Increase Base Typography for Mobile Legibility

**Change ID:** `increase-base-typography`

---

## Phase 1: Foundation (Typography Tokens)

- [x] 1.1 Add `--font-scale: 2` and a semantic size scale to `src/styles/tokens.css`
      (each `calc(<base>rem * var(--font-scale))`, so the OS/browser preference composes) ✓
- [x] 1.2 Map current px → token. The sweep found more sizes than the original
      draft map (feature CSS also uses 15/24/34/56px), so the scale is
      `--fs-2xs`(11) `--fs-xs`(12) `--fs-sm`(13) `--fs-md`(14) `--fs-lg`(15)
      `--fs-xl`(16) `--fs-2xl`(17) `--fs-3xl`(20) `--fs-4xl`(24) `--fs-5xl`(34)
      `--fs-6xl`(40) `--fs-7xl`(56) — one monotonic scale covering every value ✓
- [x] 1.3 Root left at browser default (16px); input token is `--fs-xl` (16px base
      → 32px effective ≥ 16px, so no iOS zoom-on-focus) ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Tokens documented in `mockups/README.md` → Typography

---

## Phase 2: Apply Tokens Across Styles

- [x] 2.1 Replaced every `font-size` in `src/styles/global.css` with tokens
      (app bar, tab bar, rows, buttons, fields, chips, empty states, sheet, toast) ✓
- [x] 2.2 Swept `src/features/**` — migrated `exercise.css` and `home.css`;
      `index.html` had none ✓
- [x] 2.3 `grep -rhoE "font-size:\s*[0-9.]+px" src index.html` → no matches ✓
      Fixed icon boxes (`.brand-mark`, `.icon-btn`, `.row-ic`, `.tl-delete`)
      converted to `em` off their own `font-size` so glyphs scale with them.

**Quality Gate:** PASSED
- [x] No raw-px `font-size` outside `tokens.css`
- [x] `npm run typecheck` passes

---

## Phase 3: Layout Integrity After Scaling

- [x] 3.1 Audited at 2× on a 390px viewport (headless Chromium). App bar, tab bar,
      pills, chevrons, row meta, weight card all fit — no clipping. ✓
      **Fix applied:** verification exposed that `.row-body` (a `<span>` with no
      `display`) let `.row-title`/`.row-sub` run together inline — glaring at 2×.
      Set `.row-body { display: flex; flex-direction: column; }` so they stack
      (matches how `home.css` already treats its equivalents). ✓
- [x] 3.2 Long PT labels verified — `.ex-name` truncates with ellipsis
      ("Rosca Di…"); day/exercise titles wrap cleanly ✓
- [x] 3.3 Sizing is theme-independent (only in `:root`, no dark override) ✓

**Quality Gate:** PASSED
- [x] No clipped/overlapping text on a phone viewport (screenshots: Home empty +
      populated, Settings, Data, Exercise detail)
- [x] `npm test` passes (32/32)

---

## Phase 4: Verification & Polish

- [x] 4.1 Manual pass on a 390px viewport across Home, Exercise detail, Settings,
      Data — all readable, hierarchy preserved ✓
- [x] 4.2 One-knob rescale confirmed by construction (every size derives from
      `--font-scale`); default restored to 2× ✓
- [x] 4.3 `mockups/README.md` → Typography documents the scale + `--font-scale` ✓
- [x] 4.4 Final `npm run build` passes ✓

**Quality Gate:** PASSED
- [x] `npm run build` (typecheck + production build) passes
- [x] All tests pass (32/32)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Effective sizes ≥ 2× and driven by a single multiplier
- [x] Ready for `/openspec-archive`
