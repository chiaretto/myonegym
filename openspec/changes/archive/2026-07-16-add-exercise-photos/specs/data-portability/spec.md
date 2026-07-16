# Delta: data-portability

**Change ID:** `add-exercise-photos`
**Affects:** exercise photos join the **device-local** exclusions — not exported,
not restored, and erased by an import

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export the app's persistent data
(gyms, categories, exercises, days, the **current** per-gym weight for each
exercise, and the **per-gym exercise notes**) as a single versioned JSON file for
backup. **Device-local data MUST NOT be exported** — this includes the
**weight-change history log** (see weights spec), **workout sessions and their
entries**, and the per-gym exercise **photos** (see the `exercise-photos`
capability). The current weight value/unit per `(gymId, exerciseId)` and the note
text per `(gymId, exerciseId)` are exported; the weight history, sessions and
photos stay on the device.

Photos are excluded because they are **binary**: a JSON backup would have to
base64-encode them (+33%), turning a ~50 KB document into tens of megabytes and
making export and import on a phone slow and memory-hungry. The consequence is
real and MUST be **stated to the user on the Backup screen** — photos are the only
user-created content a restore cannot bring back.

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

#### Scenario: Photos are not exported
- GIVEN exercises in gym "A" have photos attached
- WHEN the user exports the full backup
- THEN the JSON contains no photo records or image bytes
- AND the backup's size is unaffected by how many photos exist

#### Scenario: The Backup screen states photos are excluded
- GIVEN the user opens Configurações → Backup
- WHEN they read the export section
- THEN it states plainly that photos are not included in the backup

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported **full-backup**
JSON. Import **replaces all existing local data** with the imported document.
Import MUST validate the document first and MUST NOT corrupt existing data on
failure. The user MUST be warned that current data will be overwritten. The
imported gyms, categories, exercises, days, current weights, and **exercise
notes** are restored. **Device-local data is NOT restored** — after import, the
weight-change history, the workout sessions, and the exercise **photos** are empty
(any `sessions` present in an older backup are ignored). Because import
**replaces all**, the photos on the device before the import are **erased** and
cannot be recovered from the backup file. A backup produced by an **older version without
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

#### Scenario: Import clears existing photos
- GIVEN the device has exercises with photos attached
- WHEN the user imports a valid backup and confirms the overwrite
- THEN the imported data is in place and no photos remain

---

## REMOVED Requirements

(None)
