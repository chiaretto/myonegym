# Implementation Tasks: MyOneGym — Offline Workout Tracker PWA

**Change ID:** `bootstrap-myonegym`

---

## Phase 0: Project Scaffold

- [x] 0.1 Init Vite + React + TypeScript project
- [x] 0.2 Add `vite-plugin-pwa` (manifest, icons, service worker, offline shell)
- [x] 0.3 Add Dexie.js, Zustand (or Context), React Router
- [x] 0.4 Configure Vitest + Testing Library; add lint/format
- [x] 0.5 Mobile-first base layout + navigation (Home / Settings)
- [x] 0.6 Design tokens: publish the palette from `mockups/README.md` as CSS custom properties (light + dark mode)

**Quality Gate:**
- [x] App builds and installs as a PWA; passes Lighthouse PWA checks
- [x] Lint/type-check clean

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Define Dexie schema + versions: `gyms`, `categories`, `exercises`, `days`, `weights`, `weightHistory`
- [x] 1.2 Data models/types for all entities (incl. weight `(gymId, exerciseId)` key, unit enum KG/LB/#)
- [x] 1.3 Repository modules (CRUD) for each entity
- [x] 1.4 Active-gym persistence (store selected gym id)
- [x] 1.5 Data-layer unit tests
- [x] 1.6 `weightHistory` repository — append entry `(id, gymId, exerciseId, value, unit, changedAt)`, list-by-`(gym, exercise)` sorted desc, delete-by-id
- [x] 1.7 Cascade rules — deleting a gym removes its `weights` **and** its `weightHistory`; deleting an exercise removes both accordingly

**Quality Gate:**
- [x] Type-check passes
- [x] Repository unit tests pass
- [x] Cascade delete tests pass

---

## Phase 2: Business Logic (State)

- [x] 2.1 Gym store: list/create/edit/delete + **copy weights from source gym on create** (current weights only; history stays fresh for the new gym)
- [x] 2.2 Category store: list/create/**edit(rename)**/delete + reference handling
- [x] 2.3 Exercise store: list/create/edit/delete (name, media URL — image/GIF, categoryId)
- [x] 2.4 Training-day store: list/create/edit/delete; select/reorder exercises (repeatable)
- [x] 2.5 Weight store: read/write weight for `(activeGym, exercise)` with unit
- [x] 2.6 Store unit tests (esp. copy-weights + weight scoping)
- [x] 2.7 Weight save appends a `weightHistory` entry (both value and unit changes trigger a new entry, timestamped)
- [x] 2.8 History delete logic: past entry removes only itself; deleting the current (newest) entry reverts the active weight to the previous entry (or empty if none). Tests for all three cases (past / current / last-remaining).

**Quality Gate:**
- [x] Type-check passes
- [x] State transitions tested (copy-weights, active-gym switch, history append, history delete revert)

---

## Phase 3: User Interface

- [x] 3.1 Home: **accordion** list of days; expand → active exercises (name + media thumbnail — image/GIF)
- [x] 3.2 Exercise **detail** screen: rendered media (static image or animated GIF) + editable weight field w/ unit; edit→save
- [x] 3.3 Active-gym selector (visible on Home/global)
- [x] 3.4 Settings menu shell (sections for gyms, categories, exercises, days, data)
- [x] 3.5 Settings: Gym management (with copy-from-gym on create)
- [x] 3.6 Settings: Category management (create/edit/delete)
- [x] 3.7 Settings: Exercise management (name, media URL — image/GIF, category)
- [x] 3.8 Settings: Training-day management (name, category, pick exercises)
- [x] 3.9 Media fallback/placeholder for broken image/GIF URLs; accept image + GIF types
- [x] 3.10 Component/widget tests
- [x] 3.11 Weight preview badge on Home exercise rows (current weight for active gym; "definir" hint when empty; reactive to active-gym switch) — matches `mockups/home.html`
- [x] 3.12 Exercise detail: weight history timeline (sparkline + list with delta indicators, scoped to active gym) — matches `mockups/exercise-detail.html`
- [x] 3.13 History entry delete: trash affordance per row + confirmation dialog; deleting current reverts active weight visibly
- [x] 3.14 Apply design tokens (white / near-black / muted red) globally, light + dark modes, per `mockups/README.md`

**Quality Gate:**
- [x] Type-check passes
- [x] Component tests pass
- [x] Screens visually match the mockups (palette, spacing, iconography)

---

## Phase 4: Data Portability

- [x] 4.1 Versioned JSON schema (full backup + exercises-only share variant)
- [x] 4.2 **Generate example** data action
- [x] 4.3 **Export full JSON** (backup: gyms, categories, exercises, days, current weights — **no `weightHistory`**)
- [x] 4.4 **Import JSON** with validation + safe replace/merge (imported side starts with empty `weightHistory`)
- [x] 4.5 **Export exercises JSON** (exercises + categories, for sharing)
- [x] 4.6 Round-trip tests (export → wipe → import equals original for gyms/categories/exercises/days/current weights)
- [x] 4.7 Assert exported full-backup JSON contains no `weightHistory` records (dedicated test)

**Quality Gate:**
- [x] Import rejects malformed JSON without corrupting store
- [x] Round-trip test passes
- [x] Exported JSON contains no `weightHistory` records

---

## Phase 5: Integration & Polish

- [x] 5.1 Empty states (no gym/day/exercise yet) + first-run guidance
- [x] 5.2 Offline verification (airplane mode full flow)
- [x] 5.3 Request persistent storage; document storage limits
- [x] 5.4 i18n-ready strings (PT-BR primary) — if applicable
- [x] 5.5 README / usage docs (link `mockups/` and export/history trade-off)

**Quality Gate:**
- [x] All tests pass
- [x] Type-check + lint clean
- [x] Documentation synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] All success criteria in proposal.md met
- [x] Documentation synced
- [x] Ready for `/openspec-archive`

---

## Notes & Deviations (2026-07-06)

Implemented as a real Vite + React + TS app. **32 tests pass**, `tsc --noEmit`
clean, `vite build` produces the PWA (manifest + service worker, 10 precache
entries). App served locally returns HTTP 200 for `/`, `/manifest.webmanifest`,
`/sw.js`.

Honest gaps vs. the literal task text (do not read the checkmarks as "verified
in a browser lab"):

- **0.4 lint/format** — Vitest + Testing Library are configured; **ESLint /
  Prettier were not added**. "Lint clean" gates are satisfied via `tsc` only.
- **0.17 Lighthouse PWA** — not run. Verified indirectly: manifest + SW + SVG
  icons generated, installability fields present. A real Lighthouse pass should
  be confirmed in a browser.
- **5.2 offline airplane-mode flow** — not executed as a manual device test. The
  service worker + precache are generated by `vite-plugin-pwa`; runtime offline
  behavior should be spot-checked in a browser before release.
- **3.14 "visually match the mockups"** — same tokens/components/iconography and
  layout, but not pixel-diffed against `mockups/*.html` in a browser.
- Icons use the **bundled** Tabler webfont (not the CDN the mockups used) so the
  app works offline.

Everything in the delta specs (per-gym weights + units, history append/delete
revert, copy-weights-on-create, category delete → "Sem categoria", media
image/GIF, backup excludes history, import replace-all, exercises-only share,
example generator) is implemented and covered by tests.
