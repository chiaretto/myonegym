# Delta: Data Portability (Example / Export / Import / Share)

**Change ID:** `bootstrap-myonegym`
**Affects:** Settings UI, Data layer (all entities), JSON schema

## ADDED Requirements

### Requirement: Generate Example Data

From Settings, the user MUST be able to generate a sample set of exercises (and
supporting categories) to explore the app quickly.

#### Scenario: Generate example
- GIVEN the app has little or no data
- WHEN the user taps "Generate example"
- THEN a set of sample categories and exercises is created and visible in Settings

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export the app's persistent data
(gyms, categories, exercises, days, and the **current** per-gym weight for
each exercise) as a single versioned JSON file for backup. The **weight change
history log** (per-entry change trail, see weights spec) MUST NOT be included
in the exported document — only the current weight value and unit per
`(gymId, exerciseId)` is exported.

#### Scenario: Export backup
- GIVEN the user has gyms, exercises, days, and weights
- WHEN the user taps "Export JSON"
- THEN a versioned JSON document containing all entities is produced/downloaded

#### Scenario: Weight history is not exported
- GIVEN "Rosca Direta" in gym "A" has 5 history entries and a current weight of 25 KG
- WHEN the user exports the full backup
- THEN the JSON contains the current weight `(A, Rosca Direta) = 25 KG`
- AND the JSON contains no `weight_history` (or equivalent) entries

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported full-backup
JSON. Import **replaces all existing local data** with the imported document.
Import MUST validate the document first and MUST NOT corrupt existing data on
failure. The user MUST be warned that current data will be overwritten.

#### Scenario: Import replaces existing data
- GIVEN the user currently has gym "A" with exercises and weights
- WHEN the user imports a valid backup that contains gym "B"
- THEN after confirming the overwrite, local data contains only the imported content (gym "B")
- AND the previous gym "A" and its data are no longer present

#### Scenario: Round-trip restore
- GIVEN the user exported a full backup and then cleared local storage
- WHEN the user imports that backup JSON
- THEN all gyms, categories, exercises, days, and **current** weights are restored identically
- AND the weight history is empty on the imported side (history is device-local by design)

#### Scenario: Reject malformed JSON
- GIVEN a file that is not valid MyOneGym JSON
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

### Requirement: Export Exercises JSON for Sharing

From Settings, the user MUST be able to export a **share** document containing
**exercises and their categories only** (no gyms, no weights), so another user
can import the routine without personal weight data.

#### Scenario: Export exercises to share
- GIVEN the user has exercises across several categories, plus gyms and weights
- WHEN the user taps "Export exercises (share)"
- THEN the produced JSON contains exercises and categories only
- AND contains no gyms and no weight values

#### Scenario: Another user imports shared exercises
- GIVEN a share JSON of exercises + categories
- WHEN a different user imports it
- THEN the exercises and categories are added to their app
- AND their existing gyms and weights are unaffected
