# Proposal: First-Launch Sample Data Prompt & Reset App

**Change ID:** `onboarding-and-app-reset`
**Created:** 2026-07-13
**Status:** Draft
**Implements:** GitHub issue #8 — "Melhorar comportamento dos dados de exemplo"

---

## Problem Statement

- **What problem are we solving?** Today the bundled sample routine (see the
  data-portability "Generate Example Data" requirement) is only reachable by
  digging into **Settings → Backup → Gerar exemplo**. A first-time user who
  opens the app to a completely empty Home screen has no prompt or hint to try
  it, and can be left staring at empty states. Separately, there is no way to
  wipe the app back to a clean slate — a user who wants to start over (or
  finish testing/exploring the sample data) has no "erase everything" action.
- **Who is affected?** First-time users (onboarding friction, empty-state
  confusion) and any user who wants to discard all their registered data and
  start fresh (no supported path today, short of clearing browser storage
  manually).
- **Current pain point?** No first-run guidance towards the sample data, and
  no in-app reset/erase capability.

## Proposed Solution

- **First-launch prompt.** The first time the app is opened on a device (no
  prior local data and never asked before), show a prompt asking whether to
  load the sample exercises and training days. Accepting runs the exact same
  "generate example" action already used by **Gerar exemplo** in Settings
  (bundled dataset, additive, remapped ids — see data-portability spec).
  Declining (or dismissing) leaves the app empty. Either choice is
  remembered **locally on the device** (not part of the data backup, same
  category of preference as the font-size setting) so the prompt is shown
  **at most once**. Users who already have data before this feature ships are
  treated as already-asked, so nobody already using the app gets an
  unexpected prompt.
- **Reset app.** Add a new **"Resetar app"** action to **Settings → Backup**,
  in a clearly separated "danger zone" area alongside the existing
  export/import actions. It erases **all registered data** on the device
  (gyms, categories, exercises, training days, weights, weight history, and
  workout sessions) — mirroring the full wipe that "Importar backup" already
  performs before restoring. The action requires an explicit confirmation
  that states the action **cannot be undone**, matching the existing
  destructive-confirmation pattern used for import. After a reset, the app is
  equivalent to a fresh install: Home shows its empty state, and the
  first-launch prompt is re-armed so the user can choose to reload the sample
  data again.

## Scope

### In Scope
- A first-launch prompt (shown once per device) offering to generate the
  bundled sample routine, reusing the existing `generateExample` data-layer
  function.
- A device-local "already asked" flag, persisted like the existing
  font-size preference (not included in JSON backups), defaulted to
  already-set for devices that already have data when this ships.
- A new "Resetar app" action in the Backup settings screen that erases all
  registered data (all Dexie tables) after a typed-free but explicit
  confirm-with-warning step.
- Re-arming the first-launch prompt as part of the reset flow.

### Out of Scope
- Changing what the sample dataset contains (covered by the existing
  Generate Example Data requirement).
- Any change to export/import backup behavior.
- Resetting device-local **presentation** preferences (e.g. font size) as
  part of "Resetar app" — only registered app data is erased.
- A "soft" per-entity reset (e.g. wipe only exercises) — this is a full
  erase, same blast radius as import-replace's clear step.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | No schema change; reset clears existing tables via the existing `allTables` helper. |
| Data layer | Yes | Add a `resetAll` function (clears every table) alongside `generateExample`/`importBackupReplaceAll` in `portability.ts`. |
| State | Yes | A device-local, persisted "example prompt already shown" flag (mirrors `state/settings.ts`'s persistence pattern). |
| UI | Yes | A first-launch prompt shown from the app shell; a new "Resetar app" row + confirmation in `DataPage`. |
| Tests | Yes | New tests for `resetAll`, the first-launch prompt logic, and the reset confirmation flow. |
| i18n / copy | Yes | New PT-BR copy for the prompt and the reset row/confirmation, consistent with existing Settings copy. |

## Architecture Considerations

- **Reuses `generateExample`.** The first-launch prompt calls the exact same
  additive, id-remapped insertion already used by "Gerar exemplo" — no new
  data-generation logic.
- **Reuses the destructive-confirmation pattern.** `useConfirm` (with
  `danger: true`) already backs "Importar backup"'s overwrite warning; the
  reset action reuses the same primitive for its irreversible warning.
- **Reuses `allTables`.** `db.ts` already exposes `allTables()` for
  dependency-safe clearing (used by `importBackupReplaceAll`); `resetAll`
  clears the same set without re-inserting anything.
- **Device-local flag, not backup data.** The "already asked" flag follows
  the same local-only precedent as the font-scale setting (`state/settings.ts`,
  zustand + `persist`) — it must **not** be included in `exportBackup`/
  `importBackupReplaceAll`, consistent with the spec's existing "device-local
  data is not exported/restored" rule for history and sessions.
- **Migration safety.** Because the flag is new, a device with pre-existing
  data must not suddenly see the first-launch prompt when this ships; the
  flag's initial value must account for pre-existing data so only genuinely
  fresh installs are prompted.

## Success Criteria

- [ ] Opening the app for the very first time on a device (no data, never
      asked) shows a prompt to load the sample routine.
- [ ] Accepting the prompt generates the same bundled sample data as
      "Gerar exemplo"; declining leaves the app empty.
- [ ] The prompt is never shown again on that device after the first
      answer, and is not shown to devices that already had data before this
      feature shipped.
- [ ] Settings → Backup has a "Resetar app" action that, after an explicit
      irreversible-action confirmation, erases all registered data (gyms,
      categories, exercises, days, weights, weight history, sessions).
- [ ] After a reset, the app behaves like a fresh install, including
      re-offering the first-launch sample-data prompt.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass with new
      coverage for `resetAll`, the first-launch prompt, and the reset flow.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Existing users get unexpectedly prompted on upgrade | Med | Med | Initialize the "already asked" flag as set when the app already has data at first run of the new build. |
| User taps "Resetar app" by accident | Low | High | Explicit confirm sheet, danger styling, and an unambiguous "cannot be undone" message, matching the existing import-overwrite warning. |
| First-launch prompt blocks/annoys returning users across devices (no data sync) | Low | Low | Acceptable — the app is local-only per device by design; each device is prompted once, independently. |
| Reset accidentally clears device-local prefs (font size) | Low | Low | Scope `resetAll` to the Dexie tables only; leave `state/settings.ts` (zustand-persisted) untouched. |
