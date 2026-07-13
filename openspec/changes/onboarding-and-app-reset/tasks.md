# Implementation Tasks: First-Launch Sample Data Prompt & Reset App

**Change ID:** `onboarding-and-app-reset`

---

## Phase 1: Foundation (Data Layer)

- [ ] 1.1 Add `resetAll(d: MyOneGymDB = db)` to `src/data/portability.ts`: clears
      every table returned by `allTables(d)` in a single transaction (same
      clearing step `importBackupReplaceAll` already performs, without the
      subsequent restore).
- [ ] 1.2 Add a device-local, persisted "example prompt already shown" flag
      (e.g. `hasSeenExamplePrompt`) alongside `fontScale` in
      `src/state/settings.ts` (or a new small persisted store), defaulting to
      `false` for brand-new storage.
- [ ] 1.3 On first read of the persisted store (`onRehydrateStorage`, mirroring
      the existing `fontScale` clamp), if the flag is unset **and** the local DB
      already has any registered data (e.g. any gym, category, exercise, or
      day), treat the device as already-asked so pre-existing installs are
      never retroactively prompted.
- [ ] 1.4 Unit tests: `resetAll` empties every table (gyms, categories,
      exercises, days, weights, weightHistory, sessions, sessionEntries) and
      leaves the DB usable afterwards (can `generateExample` again without
      error); the migration-safety flag defaulting logic (pre-existing data →
      already-asked; empty DB → not yet asked).

**Quality Gate:**
- [ ] `npm run typecheck` passes
- [ ] `npm test` (data layer) passes

---

## Phase 2: Business Logic (Domain/State)

- [ ] 2.1 Expose the "already asked" flag and a setter from the settings
      store (or a dedicated onboarding store) so both the app shell and the
      reset flow can read/update it.
- [ ] 2.2 Wire "Resetar app" to call `resetAll`, then `reconcile()` the active
      gym store (same post-mutation reconcile already used by
      `onExample`/`onImportFile` in `DataPage`), then reset the "already
      asked" flag back to `false` so the first-launch prompt is re-armed.
- [ ] 2.3 Unit/store tests for the flag transitions (accept/decline both set
      it; reset clears it).

**Quality Gate:**
- [ ] `npm run typecheck` passes
- [ ] State transitions tested

---

## Phase 3: User Interface

- [ ] 3.1 Add a first-launch prompt component (reusing the existing `Sheet`
      pattern from `ui/Feedback.tsx`/`ui/Sheet`) shown from the app shell
      (`App.tsx`) when the "already asked" flag is `false` after the initial
      `reconcile()`. Offer two explicit actions ("Carregar exemplo" /
      "Começar do zero" or equivalent copy) — both dismiss the prompt and set
      the flag; accepting also calls `generateExample` + `reconcile`.
- 3.2 Add a "Zona de perigo" / danger group to `DataPage` with a "Resetar
      app" row, following the existing `group-label`/`group`/`row` markup
      used by the other Backup rows.
- [ ] 3.3 Wire the row to `useConfirm` with `danger: true` and copy that
      states the action erases all data and **cannot be undone**, matching
      the tone of the existing import-overwrite confirmation.
- [ ] 3.4 Component/integration tests: first-launch prompt appears on an
      empty, never-asked DB and not otherwise; accepting shows the generated
      sample on Home; declining leaves Home in its empty state; the reset row
      is confirm-gated and, once confirmed, empties Home/Settings counts back
      to zero.

**Quality Gate:**
- [ ] `npm run typecheck` passes
- [ ] All component/integration tests pass

---

## Phase 4: Integration & Polish

- [ ] 4.1 Finalize PT-BR copy for the prompt and the reset row/confirmation,
      consistent with existing Settings strings ("Gerar exemplo", "Importar
      backup (JSON)", etc.).
- [ ] 4.2 Confirm the "already asked" flag and any reset-flow state are
      **excluded** from `exportBackup`/`importBackupReplaceAll` (device-local
      only, same treatment as weight history and sessions).
- [ ] 4.3 Manual verification at a 390px mobile viewport: fresh app → prompt
      appears → accept → sample data visible on Home; separately, fresh app →
      decline → empty Home, "Gerar exemplo" still available in Settings;
      Settings → Backup → Resetar app → confirm → app returns to empty state
      and the first-launch prompt reappears on next load.
- [ ] 4.4 Update `README.md` if it documents the current example-data /
      settings flow.

**Quality Gate:**
- [ ] `npm run build` (typecheck + production build) passes
- [ ] `npm test` fully passes
- [ ] Docs synced

---

## Completion Checklist

- [ ] All phases complete
- [ ] All quality gates passed
- [ ] Documentation synced
- [ ] Ready for `/openspec-archive`
