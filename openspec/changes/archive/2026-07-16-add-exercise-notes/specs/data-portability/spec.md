# Delta: data-portability

**Change ID:** `add-exercise-notes`
**Affects:** `data-portability` (full-backup export/import); references `exercise-notes`.

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export the app's persistent data
(gyms, categories, exercises, days, the **current** per-gym weight for each
exercise, and the **per-gym exercise notes**) as a single versioned JSON file for
backup. **Device-local data MUST NOT be exported** — this includes both the
**weight-change history log** (see weights spec) and **workout sessions and their
entries**. The current weight value/unit per `(gymId, exerciseId)` and the note
text per `(gymId, exerciseId)` are exported; the weight history and sessions stay
on the device.

#### Scenario: Export backup
- GIVEN the user has gyms, exercises, days, weights, notes, and completed sessions
- WHEN the user taps "Exportar backup"
- THEN a versioned JSON document with gyms, categories, exercises, days, current weights, and exercise notes is produced/downloaded

#### Scenario: Weight history is not exported
- GIVEN "Rosca Direta" in gym "A" has 5 history entries and a current weight of 25 KG
- WHEN the user exports the full backup
- THEN the JSON contains the current weight `(A, Rosca Direta) = 25 KG`
- AND the JSON contains no `weight_history` (or equivalent) entries

#### Scenario: Exercise notes are exported
- GIVEN "Rosca Direta" in gym "A" has the note "manter cotovelo fixo"
- WHEN the user exports the full backup
- THEN the JSON contains the note `(A, Rosca Direta) = "manter cotovelo fixo"`

#### Scenario: Sessions are not exported
- GIVEN gym "A" has completed workout sessions with entries
- WHEN the user exports the full backup
- THEN the JSON contains no `sessions` or `sessionEntries` (they are device-local)

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported **full-backup**
JSON. Import **replaces all existing local data** with the imported document.
Import MUST validate the document first and MUST NOT corrupt existing data on
failure. The user MUST be warned that current data will be overwritten. The
imported gyms, categories, exercises, days, current weights, and **exercise
notes** are restored. **Device-local data is NOT restored** — after import, the
weight-change history and the workout sessions are empty (any `sessions` present
in an older backup are ignored). A backup produced by an **older version without
`exerciseNotes`** MUST import cleanly, restoring **zero notes**. Only **full-backup**
documents are accepted — any other file (including a legacy exercises-share
document) MUST be rejected with a clear message and MUST NOT change existing data.

#### Scenario: Import replaces existing data
- GIVEN the user currently has gym "A" with exercises and weights
- WHEN the user imports a valid backup that contains gym "B"
- THEN after confirming the overwrite, local data contains only the imported content (gym "B")
- AND the previous gym "A" and its data are no longer present

#### Scenario: Round-trip restore (weights and notes, no sessions)
- GIVEN the user exported a full backup and then cleared local storage
- WHEN the user imports that backup JSON
- THEN all gyms, categories, exercises, days, current weights, and exercise notes are restored identically
- AND the weight history and workout sessions are empty on the imported side (device-local by design)

#### Scenario: Older backup without notes imports as zero notes
- GIVEN a backup JSON produced before exercise notes existed (no `exerciseNotes` field)
- WHEN the user imports it
- THEN the import succeeds and local data has zero exercise notes

#### Scenario: Sessions in an older backup are ignored
- GIVEN a backup JSON that happens to contain `sessions`/`sessionEntries` (produced by an older version)
- WHEN the user imports it
- THEN the import succeeds and local data has zero workout sessions

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym full backup (malformed, or a legacy exercises-share document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

### Requirement: Reset App (Erase All Data)

From Settings, the user MUST be able to **reset the app**, erasing **all
registered data** from the device: gyms, categories, exercises, training
days, weights, weight history, **exercise notes**, and workout sessions/entries
— the same full set already cleared as the first step of "Importar backup". The
action MUST require an explicit confirmation, and the confirmation MUST clearly
state that the action **cannot be undone** before anything is erased. On confirm,
all local data is erased immediately; declining or dismissing the confirmation
MUST leave all existing data unchanged. After a reset, the app MUST behave like a
fresh install — including re-arming the first-launch sample-data prompt (see
app-foundation) so the user may choose to reload the sample data again. Device-
local **presentation** preferences (e.g. the font-size setting) are unaffected by
a reset.

#### Scenario: Reset requires confirmation and warns it is irreversible
- GIVEN the user has gyms, exercises, days, and weights registered
- WHEN the user taps "Resetar app" in Settings → Backup
- THEN a confirmation is shown stating that all data will be erased and the action cannot be undone

#### Scenario: Confirming erases all registered data
- GIVEN the reset confirmation is shown
- WHEN the user confirms
- THEN all gyms, categories, exercises, days, weights, weight history, exercise notes, and workout sessions are erased
- AND Home and Settings reflect an empty app (equivalent to a fresh install)

#### Scenario: Declining keeps data intact
- GIVEN the reset confirmation is shown
- WHEN the user cancels/dismisses it
- THEN no data is erased and the app is unchanged

---

## REMOVED Requirements

(None)
