# Implementation Tasks: First-Launch Sample Data Prompt & Reset App

**Change ID:** `onboarding-and-app-reset`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Add `resetAll(d: MyOneGymDB = db)` to `src/data/portability.ts`: clears
      every table returned by `allTables(d)` in a single transaction (same
      clearing step `importBackupReplaceAll` already performs, without the
      subsequent restore). ✓ 2026-07-13
- [x] 1.2 Add a device-local, persisted "example prompt already shown" flag
      (`hasSeenExamplePrompt`) in a new dedicated `src/state/onboarding.ts`
      store (kept separate from `settings.ts` since presentation prefs must
      stay untouched by "Resetar app" — see task 4.2), defaulting to `false`
      for brand-new storage. ✓ 2026-07-13
- [x] 1.3 Added `hasAnyRegisteredData(d)` to `src/db/repos.ts` (true when any
      gym/category/exercise/day exists). **Deviation from the original plan:**
      rather than doing the migration-safety check inside `onRehydrateStorage`
      (which runs async and would race the first paint / risk a prompt flash),
      the check is awaited explicitly in `App.tsx`'s init effect right after
      `reconcile()`, before ever setting `showExamplePrompt`. Same outcome
      (pre-existing installs are never retroactively prompted), simpler to
      test. ✓ 2026-07-13
- [x] 1.4 Unit tests: `resetAll` empties every table (gyms, categories,
      exercises, days, weights, weightHistory, sessions, sessionEntries) and
      leaves the DB usable afterwards (can `generateExample` again without
      error); `hasAnyRegisteredData` unit tests (empty → false; any single
      table populated → true). The full migration-safety flow (flag unset +
      pre-existing data → not prompted) is covered as an `App.tsx` integration
      test in Phase 3, where the real decision is made. ✓ 2026-07-13

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] `npm test` (data layer) passes — 39/39

---

## Phase 2: Business Logic (Domain/State)

- [x] 2.1 Exposed `hasSeenExamplePrompt`, `markPromptSeen`, `resetPromptSeen`
      from the dedicated `useOnboarding` store (`src/state/onboarding.ts`,
      built in Phase 1) so both the app shell (`App.tsx`) and the reset flow
      (`DataPage.tsx`) can read/update it. ✓ 2026-07-13
- [x] 2.2 Wired "Resetar app" (`DataPage.onReset`) to call `resetAll(db)`,
      then `reconcile()` the active gym store (same post-mutation reconcile
      already used by `onExample`/`onImportFile`), then `resetPromptSeen()` so
      the first-launch prompt is re-armed on next load. ✓ 2026-07-13
- [x] 2.3 Flag-transition coverage: `src/state/onboarding.test.ts` covers
      `markPromptSeen`/`resetPromptSeen` in isolation; the full
      accept-sets-it / decline-sets-it / reset-clears-it behavioral flows are
      covered end-to-end in the Phase 3 component tests
      (`App.onboarding.test.tsx`, `data.integration.test.tsx`), which is where
      those transitions are actually triggered by user action. ✓ 2026-07-13

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] State transitions tested

---

## Phase 3: User Interface

- [x] 3.1 Added a first-launch prompt (`Sheet` from `ui/Sheet`, wired through
      `ui/Feedback.tsx`'s existing sheet-actions styling) in `App.tsx`, shown
      when `hasSeenExamplePrompt` is `false` after the initial `reconcile()`
      **and** the device has no registered data. Two explicit actions
      ("Carregar exemplo" / "Começar do zero") — both mark the flag seen;
      accepting also calls `generateExample` + `reconcile`. Dismissing the
      sheet (backdrop/Escape) behaves as decline. ✓ 2026-07-13
- [x] 3.2 Added a "Zona de perigo" group to `DataPage` with a "Resetar app"
      row, following the existing `group-label`/`group`/`row` markup (plus
      new `.row-ic.danger`/`.row-sub.danger` CSS for the danger tone).
      ✓ 2026-07-13
- [x] 3.3 Wired the row to `useConfirm` with `danger: true` and copy stating
      the action erases all data and **cannot be undone**, matching the tone
      of the existing import-overwrite confirmation. ✓ 2026-07-13
- [x] 3.4 Component/integration tests added: `src/App.onboarding.test.tsx`
      (prompt appears on empty+never-asked device; accept generates the
      sample and shows it on Home; decline leaves Home empty and the prompt
      never reappears; migration safety — pre-existing data and
      already-asked devices are not prompted) and
      `src/features/settings/data.integration.test.tsx` (reset row is
      confirm-gated — cancel leaves data intact; confirm erases all tables,
      empties Settings counts, and re-arms the first-launch prompt on the
      next mount). Also updated `App.test.tsx` and
      `appearance.integration.test.tsx` to explicitly mark the prompt seen in
      `beforeEach` so unrelated tests aren't coupled to onboarding state.
      ✓ 2026-07-13

**Quality Gate:**
- [x] `npm run typecheck` passes
- [x] All component/integration tests pass — 105/105 (full suite)

---

## Phase 4: Integration & Polish

- [x] 4.1 PT-BR copy finalized: prompt title "Bem-vindo ao MyOneGym" with a
      short explanation and "Carregar exemplo" / "Começar do zero" actions;
      reset row "Resetar app" / "Apaga todos os dados deste dispositivo. Não
      pode ser desfeito"; confirmation "Resetar app?" / "Isto apaga TODOS os
      dados cadastrados deste dispositivo — academias, categorias,
      exercícios, dias, pesos, histórico e treinos. Não pode ser desfeito." /
      "Apagar tudo" — consistent tone with "Gerar exemplo" and the existing
      import-overwrite warning. ✓ 2026-07-13
- [x] 4.2 Confirmed excluded from backups: `useOnboarding` persists under its
      own `myonegym.onboarding` localStorage key, entirely separate from
      `BackupDoc`/`exportBackup`/`importBackupReplaceAll` (which only ever
      touch Dexie tables). Added explicit regression tests in
      `portability.test.ts` (`exportBackup` output never contains
      `hasSeenExamplePrompt`; an unexpected `hasSeenExamplePrompt` field in an
      imported document is silently ignored, same as legacy `sessions`).
      ✓ 2026-07-13
- [x] 4.3 Manual verification done via a headless-Chromium (Playwright, system
      `/usr/bin/chromium`) run against the Vite dev server at a 390×844
      viewport, driving the exact flow end-to-end: fresh device → first-launch
      prompt appears with both actions → accept → bundled sample (gym "Fit
      Park", 6 days) visible on Home → reload → prompt does not reappear →
      Settings → Backup shows a "Zona de perigo" → "Resetar app" row → tap →
      confirmation sheet warns the action cannot be undone → cancel leaves the
      gym count at 1 → confirm → all Settings counts back to 0 → reload Home →
      first-launch prompt reappears (re-armed). All 9 assertions passed, 0
      browser console errors. Screenshots reviewed visually (dark theme,
      danger-zone styling, sheet layout) at the mobile viewport — no visual
      regressions. ✓ 2026-07-13
- [x] 4.4 Updated `README.md`'s Features section: documented the new
      "Zona de perigo" / "Resetar app" action under **Data**, and added a
      **First launch** bullet describing the one-time sample-data prompt and
      how reset re-arms it. ✓ 2026-07-13

**Quality Gate:**
- [x] `npm run build` (typecheck + production build) passes
- [x] `npm test` fully passes — 107/107 across 17 files (14 → 17 files after
      this phase's new `App.onboarding.test.tsx`,
      `features/settings/data.integration.test.tsx`, and
      `state/onboarding.test.ts`)
- [x] Docs synced

---

## Completion Checklist

- [x] All phases complete
- [x] All quality gates passed
- [x] Documentation synced
- [x] Ready for `/openspec-archive`
