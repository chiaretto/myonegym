# Delta: data-portability

**Change ID:** `add-workout-session-log`
**Affects:** full-backup export and import — sessions become part of the backup

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export the app's persistent data
(gyms, categories, exercises, days, the **current** per-gym weight for each
exercise, and **completed workout sessions with their entries**) as a single
versioned JSON file for backup. The **weight change history log** (per-entry
change trail, see weights spec) MUST NOT be included in the exported document —
only the current weight value and unit per `(gymId, exerciseId)` is exported.
**Workout sessions ARE included** because they are durable training history
(distinct from the device-local weight change log). The backup document version
MUST be bumped so importers can distinguish formats.

#### Scenario: Export backup
- GIVEN the user has gyms, exercises, days, weights, and completed sessions
- WHEN the user taps "Export JSON"
- THEN a versioned JSON document containing all entities, including sessions and their entries, is produced/downloaded

#### Scenario: Weight history is not exported
- GIVEN "Rosca Direta" in gym "A" has 5 history entries and a current weight of 25 KG
- WHEN the user exports the full backup
- THEN the JSON contains the current weight `(A, Rosca Direta) = 25 KG`
- AND the JSON contains no `weight_history` (or equivalent) entries

#### Scenario: Sessions are exported
- GIVEN gym "A" has 2 completed sessions with entries
- WHEN the user exports the full backup
- THEN the JSON contains both sessions and their entries (day name, date, per-entry used weight and done state)

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported full-backup
JSON. Import **replaces all existing local data** with the imported document,
including **workout sessions and their entries**. Import MUST validate the
document first and MUST NOT corrupt existing data on failure. The user MUST be
warned that current data will be overwritten. A backup document that predates
sessions (no `sessions` field) MUST import successfully with **zero sessions**
(backward compatible).

#### Scenario: Import replaces existing data
- GIVEN the user currently has gym "A" with exercises, weights, and sessions
- WHEN the user imports a valid backup that contains gym "B"
- THEN after confirming the overwrite, local data contains only the imported content (gym "B" and its sessions)
- AND the previous gym "A" and its data are no longer present

#### Scenario: Round-trip restore includes sessions
- GIVEN the user exported a full backup (with sessions) and then cleared local storage
- WHEN the user imports that backup JSON
- THEN all gyms, categories, exercises, days, current weights, and sessions with entries are restored identically
- AND the weight history is empty on the imported side (history is device-local by design)

#### Scenario: Older backup without sessions
- GIVEN a valid full-backup JSON produced before sessions existed (no `sessions` field)
- WHEN the user imports it
- THEN the import succeeds and local data has zero workout sessions

#### Scenario: Reject malformed JSON
- GIVEN a file that is not valid MyOneGym JSON
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

---

## ADDED Requirements

(None)

---

## REMOVED Requirements

(None)
