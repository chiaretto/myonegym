# Implementation Tasks: Remove the "Export Exercises" (Share) Feature

**Change ID:** `remove-exercises-share`

---

## Phase 1: Foundation (Data Layer)

- [x] 1.1 Removed `ShareDoc`, `exportExercisesShare`, `parseShare`,
      `importExercisesMerge` from `src/data/portability.ts` (backup + example intact) ✓
- [x] 1.2 **Excluded sessions from the backup**: `BackupDoc` drops
      `sessions`/`sessionEntries`; `exportBackup` no longer writes them;
      `parseBackup` drops the coercion; `importBackupReplaceAll` no longer
      restores them (device-local, like weight history) ✓
- [x] 1.3 Rewrote the sessions backup tests → assert sessions are NOT exported
      and NOT restored; removed the "exercises share" describe block ✓
- [x] 1.4 Grep sweep — no remaining references to the removed symbols ✓

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

- [x] 3.1 `DataPage`: removed the **Exportar exercícios (JSON)** row +
      `onExportShare`; dropped the share imports ✓
- [x] 3.2 `onImportFile` is **backup-only** — `parseBackup` (rejects non-backups)
      → confirm → `importBackupReplaceAll` ✓
- [x] 3.3 Import row → "Importar backup (JSON)" / "Substitui TODOS os dados deste
      dispositivo"; page renamed **"Backup"** (was "Backup e compartilhamento",
      now inaccurate) in `DataPage` + `SettingsPage` ✓

**Quality Gate:** PASSED
- [x] `npm run typecheck` passes
- [x] Import (backup) still works; non-backup rejected via `parseBackup`

---

## Phase 4: Integration & Polish

- [x] 4.1 `README.md` "Data" bullet — removed the exercises-share mention ✓
- [x] 4.2 Visual pass at 390px: Data screen shows only Gerar exemplo / Exportar
      backup (JSON) / Importar backup (JSON) — verified rows programmatically ✓
- [x] 4.3 `data-portability` spec merge is clean (requirement removed) — done at archive

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
