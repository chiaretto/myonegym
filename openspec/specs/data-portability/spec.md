# data-portability Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements
### Requirement: Generate Example Data

From Settings, the user MUST be able to **generate a realistic sample routine**
to explore the app quickly. The sample is a **bundled dataset** (a predefined
gym, muscle **categories**, **exercises** with media, several named **training
days**, and per-gym **weights**). Generation MUST be **additive and safe** —
inserted with **remapped ids** so existing data is never overwritten and
references (exercise→category, day→exercises, weight→gym+exercise) stay intact.
Day categories are **derived from the day's exercises** (the dataset's per-day
category is ignored). The example **gym and its weights** MUST be seeded **only
when no gym exists yet**; the categories/exercises/days are always added.

#### Scenario: Generate the sample routine
- GIVEN the app has little or no data
- WHEN the user taps "Gerar exemplo"
- THEN the bundled categories, exercises (with media), and named training days are created and visible

#### Scenario: Fresh app also gets a gym and weights
- GIVEN no gym exists yet
- WHEN the user taps "Gerar exemplo"
- THEN the example gym is created with per-gym weights for the sample exercises
- AND the exercises' current weights are visible on Home

#### Scenario: Days show derived categories
- GIVEN the sample was generated
- WHEN the user views Home
- THEN each day shows the categories derived from its exercises (not a stored day category)

#### Scenario: Additive and safe with existing data
- GIVEN the user already has some categories and a gym
- WHEN the user taps "Gerar exemplo"
- THEN the sample content is added without overwriting existing data
- AND references remain valid (no id collisions)

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

