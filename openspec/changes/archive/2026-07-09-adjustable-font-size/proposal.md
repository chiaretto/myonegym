# Proposal: User-Adjustable Font Size

**Change ID:** `adjustable-font-size`
**Created:** 2026-07-09
**Status:** Implementation Complete
**Completed:** 2026-07-09
**Builds on:** `increase-base-typography` (the `--font-scale` token)

---

## Problem Statement

- **What problem are we solving?** `increase-base-typography` set the global
  type scale to a fixed **2× (200%)** for mobile legibility. In practice that is
  now **too large** for some users/devices — the opposite of the original
  "fonte muito pequena" complaint. There is no way to tune it without editing
  code.
- **Who is affected?** Every user. The comfortable size depends on the person,
  their device, and their eyesight — one fixed multiplier can't satisfy everyone.
- **Current pain point?** `--font-scale` is a single, code-level constant
  (`tokens.css: --font-scale: 2`). The knob exists but is not exposed, so a user
  who finds the text too big (or too small) is stuck.

## Proposed Solution

Expose the existing `--font-scale` knob as a **user setting**, persisted locally,
applied app-wide and live.

- **A persisted preference.** Add a small local settings store (Zustand +
  `persist`, mirroring `useActiveGym`) holding `fontScale`, keyed in
  `localStorage` as `myonegym.settings`.
- **Apply at the root.** On startup and on every change, set
  `document.documentElement.style.setProperty('--font-scale', String(fontScale))`.
  Because every `--fs-*` token is `calc(<rem> * var(--font-scale))`, this
  rescales all text instantly. An inline `<html>` style beats the `:root` value
  in `tokens.css`.
- **A Settings control.** Add **Configurações → Aparência** (a sub-page,
  consistent with the other settings sub-pages) with a **slider** to choose the
  size across a supported range (**100% – 200%**), a **live preview** line, the
  current **percentage** readout, and a **"Restaurar padrão"** reset.
- **A more comfortable default.** Lower the shipped default from 200% to a
  moderate **150%** (still clearly enlarged vs. the original, but not oversized).
  `tokens.css` default and the store default are set to the same value so there
  is no flash on first paint. Users can move it anywhere in range.
- **No-flash startup.** Read the stored value and set `--font-scale` **before
  first paint** (synchronously in `main.tsx`), so the app never flashes the
  default before the saved size applies.

## Scope

### In Scope
- Persisted `fontScale` preference (local, offline).
- Apply `--font-scale` at the document root from the stored value (before paint).
- **Aparência** settings sub-page: slider (100%–200%), live preview, percentage
  readout, reset to default.
- Lower the shipped default to **150%** (tokens.css + store), clamped to range.

### Out of Scope
- Per-element or per-screen font overrides (this is one global multiplier).
- Independent control of spacing/line-height/icon sizes (they already track the
  scale via tokens/`em`).
- Including the preference in the **backup JSON** — like the active gym, it is a
  device-local UI preference stored outside Dexie, not part of the data backup.
- A full theme/appearance system (dark-mode toggle, accent, etc.) — future work.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | Preference lives in `localStorage`, not IndexedDB. |
| State | Yes | New `useSettings` persisted store (`fontScale`) + a small apply-to-root effect/util. |
| UI | Yes | New `AppearancePage` + a `NavRow` in Settings; route `/settings/appearance`. |
| Styling | Yes (small) | `tokens.css` default `--font-scale` → 150%; runtime override on `<html>`. |
| Startup | Yes (small) | `main.tsx` sets `--font-scale` from storage before render (no flash). |
| i18n / copy | Yes | PT strings ("Aparência", "Tamanho da fonte", "Restaurar padrão", "Prévia"). |

## Architecture Considerations

- **This is exactly what the token was built for.** `increase-base-typography`
  deliberately routed all sizes through one `--font-scale`; this change just
  binds that knob to a persisted user value. No token or component restructuring.
- **Persistence mirrors `useActiveGym`.** Same Zustand `persist` pattern and
  `localStorage` namespace convention (`myonegym.*`); stays offline/local-only.
- **Runtime override precedence.** An inline style on `document.documentElement`
  overrides the `:root { --font-scale }` from `tokens.css`, so the stored value
  always wins once applied.
- **Modifies an archived requirement.** `app-foundation`'s "Legible, Scalable
  Base Typography" currently mandates a **fixed ≥2× default**. This change makes
  the scale **user-adjustable** with a **moderate default**, so that requirement
  is updated and a new "User-Adjustable Font Size" requirement is added.

## Success Criteria

- [ ] Settings has an **Aparência** control to choose the font size; changing it
      updates the whole app **live**.
- [ ] The chosen size **persists** across reloads and app restarts.
- [ ] **Reset** returns to the default; values are **clamped** to 100%–200%.
- [ ] No first-paint flash (stored size applied before render).
- [ ] Inputs stay ≥16px effective at the minimum (100%) — no iOS zoom regression.
- [ ] No clipped/overlapping text across the supported range on a phone.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass, with tests for the
      store (persist, clamp, reset) and the setting applying `--font-scale`.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Lowering the default conflicts with the archived "≥2×" rule | High | Low | Explicitly modify that requirement in this change's delta (default now moderate + adjustable). |
| First-paint flash at the old default before the stored value applies | Med | Low | Set `--font-scale` from `localStorage` synchronously in `main.tsx` before render; keep `tokens.css` default equal to the store default. |
| Values below 100% shrink inputs under 16px → iOS zoom-on-focus | Low | Med | Clamp the minimum to 100% (input token = 16px × scale ≥ 16px). |
| Extreme values break fixed-size chrome (tab bar, app bar) | Low | Med | Cap the maximum at 200% (already the verified ceiling); clamp; the range was visually validated in `increase-base-typography`. |
| Layout differs from the shipped 2× screenshots | Low | Low | Same token system; only the multiplier changes. Re-verify at min/mid/max. |

---

## Archive Information

**Archived:** 2026-07-09
**Duration:** 0 days (created and completed 2026-07-09)
**Outcome:** Successfully implemented

### Files Modified
- `src/state/settings.ts` (new — persisted `useSettings`, clamp, `applyFontScale`)
- `src/main.tsx` (apply before first paint), `src/App.tsx` (live effect + route)
- `src/features/settings/AppearancePage.tsx` + `appearance.css` (new), `SettingsPage.tsx`
- `src/styles/tokens.css` (default `--font-scale: 1.5`), `README.md`, `mockups/README.md`
- Tests: `src/state/settings.test.ts`, `src/features/settings/appearance.integration.test.tsx`

### Specs Updated
- `openspec/specs/app-foundation/spec.md` — modified **Legible, Scalable Base
  Typography** (fixed 2× → user-adjustable, default 150%) and added
  **User-Adjustable Font Size**

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (54/54) — all pass
- Visual pass at 390px at 100% / 150% / 200%; persistence + no-flash confirmed
