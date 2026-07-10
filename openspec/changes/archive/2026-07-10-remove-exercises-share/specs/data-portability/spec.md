# Delta: data-portability

**Change ID:** `remove-exercises-share`
**Affects:** removes the exercises-share export/import; excludes workout sessions
from the backup; import is backup-only
**Implements:** issue #5 (+ a follow-up: don't export workout sessions)

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export the app's persistent data
(gyms, categories, exercises, days, and the **current** per-gym weight for each
exercise) as a single versioned JSON file for backup. **Device-local data MUST
NOT be exported** — this includes both the **weight-change history log** (see
weights spec) and **workout sessions and their entries**. Only the current
weight value and unit per `(gymId, exerciseId)` is exported; sessions stay on the
device (like the history log).

#### Scenario: Export backup
- GIVEN the user has gyms, exercises, days, weights, and completed sessions
- WHEN the user taps "Exportar backup"
- THEN a versioned JSON document with gyms, categories, exercises, days, and current weights is produced/downloaded

#### Scenario: Weight history is not exported
- GIVEN "Rosca Direta" in gym "A" has 5 history entries and a current weight of 25 KG
- WHEN the user exports the full backup
- THEN the JSON contains the current weight `(A, Rosca Direta) = 25 KG`
- AND the JSON contains no `weight_history` (or equivalent) entries

#### Scenario: Sessions are not exported
- GIVEN gym "A" has completed workout sessions with entries
- WHEN the user exports the full backup
- THEN the JSON contains no `sessions` or `sessionEntries` (they are device-local)

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported **full-backup**
JSON. Import **replaces all existing local data** with the imported document.
Import MUST validate the document first and MUST NOT corrupt existing data on
failure. The user MUST be warned that current data will be overwritten. **Device-
local data is NOT restored** — after import, the weight-change history and the
workout sessions are empty (any `sessions` present in an older backup are
ignored). Only **full-backup** documents are accepted — any other file (including
a legacy exercises-share document) MUST be rejected with a clear message and MUST
NOT change existing data.

#### Scenario: Import replaces existing data
- GIVEN the user currently has gym "A" with exercises and weights
- WHEN the user imports a valid backup that contains gym "B"
- THEN after confirming the overwrite, local data contains only the imported content (gym "B")
- AND the previous gym "A" and its data are no longer present

#### Scenario: Round-trip restore (weights, no sessions)
- GIVEN the user exported a full backup and then cleared local storage
- WHEN the user imports that backup JSON
- THEN all gyms, categories, exercises, days, and current weights are restored identically
- AND the weight history and workout sessions are empty on the imported side (device-local by design)

#### Scenario: Sessions in an older backup are ignored
- GIVEN a backup JSON that happens to contain `sessions`/`sessionEntries` (produced by an older version)
- WHEN the user imports it
- THEN the import succeeds and local data has zero workout sessions

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym full backup (malformed, or a legacy exercises-share document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

---

## ADDED Requirements

(None)

---

## REMOVED Requirements

### Requirement: Export Exercises JSON for Sharing

Removed — the exercises-share feature (exporting an exercises+categories "share"
document and importing/merging one) is dropped. Data portability keeps only the
full-backup **export** and **import (replace-all)**; there is no exercises-only
export, and share documents are no longer produced or accepted.
