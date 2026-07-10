# Proposal: Simplify Backup Portability (remove exercises-share + exclude sessions)

**Change ID:** `remove-exercises-share`
**Created:** 2026-07-10
**Status:** Implementation Complete
**Completed:** 2026-07-10
**Implements:** GitHub issue #5 — "Remover funcionalidade de exportar exercícios"
**Also (direct follow-up):** the backup export/import no longer includes workout
sessions — they become device-local like the weight-change history.

---

## Problem Statement

- **What problem are we solving?** The Data screen has two exports — **Exportar
  backup (JSON)** (full backup) and **Exportar exercícios (JSON)** (share
  exercises + categories only). Issue #5 asks to **remove the exercises export**
  and keep **only Exportar Backup**.
- **Who is affected?** Anyone on **Configurações → Backup e compartilhamento**.
- **Current pain point?** The extra "share exercises" path adds surface area the
  user doesn't want. It is a **paired** feature: export a share file + import a
  share file (merge). Keeping only the import half would leave an inbound-only
  orphan the app can no longer produce.

## Proposed Solution

Remove the **exercises-share feature entirely** (export **and** its import-merge
path), leaving data portability as just: **generate example**, **export backup**,
and **import backup (replace all)**.

- **UI (`DataPage`)**: remove the **Exportar exercícios (JSON)** row/action;
  simplify import to **backup-only** (parse as a full backup; reject anything
  else with a clear message); update the import row copy accordingly.
- **Data layer (`portability.ts`)**: remove `exportExercisesShare`, `ShareDoc`,
  `parseShare`, and `importExercisesMerge`.
- **Spec**: remove the **Export Exercises JSON for Sharing** requirement;
  clarify **Import JSON (Replace All)** accepts only full backups.
- **Tests**: drop the "exercises share" test block.

## Scope

### In Scope
- Remove the export-exercises button + `exportExercisesShare`.
- Remove the share **import** path (`parseShare`, `importExercisesMerge`) and the
  `kind`-based routing — import handles **full backups only**.
- Remove `ShareDoc`.
- **Exclude workout sessions from the backup** (follow-up): `BackupDoc` drops
  `sessions`/`sessionEntries`; `exportBackup` no longer writes them; import no
  longer restores them (any present in an older backup are ignored). Sessions
  become **device-local**, like the weight-change history.
- Update the import row's helper copy (no more "lista de exercícios é adicionada").
- Update the data-portability spec + tests.

### Out of Scope
- **Export/import of full backups** — unchanged (still the only portability path).
- **Generate example** — unchanged.
- Any migration for previously exported share files (they simply won't import
  anymore; full backups still do).

### Decision to confirm
This removes the **whole** exercises-share feature (export + import), matching
"deixar apenas Exportar Backup". If you'd rather **keep the ability to import**
old share files (received elsewhere) while only removing the export button, say
so and I'll narrow the scope.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | No | — |
| Data layer | Yes | Remove `exportExercisesShare`, `ShareDoc`, `parseShare`, `importExercisesMerge` from `portability.ts`. |
| State | No | — |
| UI | Yes | `DataPage`: remove the export-exercises row; make import backup-only + update copy. |
| Tests | Yes | Remove the "exercises share" describe block; keep backup round-trip tests. |
| i18n / copy | Yes (small) | Import row helper text becomes backup-only. |

## Architecture Considerations

- **Fits the local-only model.** Backup export/import is the primary portability
  path; dropping the share feature simplifies the surface without touching the
  backup format (`SCHEMA_VERSION` and `BackupDoc` unchanged).
- **Simpler import.** With no share kind, `onImportFile` no longer peeks `kind`
  to route — it parses a backup and rejects non-backups (reusing the existing
  `parseBackup` validation and error message).
- **Removes one spec requirement.** `data-portability` loses "Export Exercises
  JSON for Sharing"; the remaining three requirements (example, backup export,
  backup import) stand.

## Success Criteria

- [ ] The Data screen shows **only** Exportar backup under Exportar (no export-
      exercises action).
- [ ] Importing a full backup still works (replace-all, with confirmation).
- [ ] Importing a non-backup file (incl. an old exercises-share file) is rejected
      with a clear message; existing data is untouched.
- [ ] `exportExercisesShare`/`ShareDoc`/`parseShare`/`importExercisesMerge` are
      gone; no dead references remain.
- [ ] `npm run build`, `npm run typecheck`, `npm test` pass (share tests removed;
      backup tests intact).

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A user has an old share file they wanted to import | Low | Low | Full backups still import; share was niche. Offer the "keep import only" variant if needed. |
| Removing import routing breaks backup import | Low | Med | Keep `parseBackup` + confirm + `importBackupReplaceAll`; covered by existing round-trip tests. |
| Leftover references to removed exports | Med | Low | Typecheck + a grep sweep for the removed symbols. |

---

## Archive Information

**Archived:** 2026-07-10
**Duration:** 0 days (created and completed 2026-07-10)
**Outcome:** Successfully implemented

### Files Modified
- `src/data/portability.ts` — removed `ShareDoc`/`exportExercisesShare`/`parseShare`/
  `importExercisesMerge`; **`BackupDoc` drops `sessions`/`sessionEntries`**;
  export/parse/import no longer handle sessions (device-local)
- `src/features/settings/DataPage.tsx` — removed the export-exercises row; import
  is backup-only; page renamed "Backup"
- `src/features/settings/SettingsPage.tsx`, `src/data/portability.test.ts`, `README.md`

### Specs Updated
- `openspec/specs/data-portability/spec.md` — modified **Export Full Backup JSON**
  (device-local exclusions incl. sessions) and **Import JSON (Replace All)**
  (backup-only, sessions not restored); **removed Export Exercises JSON for Sharing**

### Verification
- `npm run build`, `npm run typecheck`, `npm test` (62/62) — all pass
- Visual pass at 390px: Data screen shows only Gerar exemplo / Exportar backup /
  Importar backup; a backup export contains no `sessions`
