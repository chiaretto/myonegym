# Delta: data-portability

**Change ID:** `full-backup-restore`
**Affects:** the backup becomes a **complete** snapshot (all data, including
sessions, weight history and photos) and import becomes a full **restore** —
reversing the earlier device-local exclusions

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export **the entire database** as a single
versioned JSON file, so that the export can serve as a true **backup** against the
loss of the PWA's local storage. The export MUST include **all** persistent user
data:

- gyms, categories, exercises, training days;
- the current per-gym **weight** for each exercise, and the full per-gym
  **weight-change history**;
- the per-gym exercise **notes**;
- every **workout session** and its **entries** (with their done states);
- every per-gym exercise **photo**, with its image bytes.

Because a JSON document cannot carry binary directly, photo image bytes MUST be
**base64-encoded** into the document. The file is therefore self-contained and
restorable with no special tool, at the cost of size — a backup with many photos
may be several megabytes, which is acceptable for a safety-net backup.

Device-local **UI preferences** — the font-size setting and the first-launch
"already asked" flag — are NOT user data and MUST remain outside the backup.

#### Scenario: Export the whole database
- GIVEN the user has gyms, exercises, days, weights, weight history, notes, workout sessions, and photos
- WHEN the user taps "Exportar backup"
- THEN a single versioned JSON document is produced containing all of them

#### Scenario: Weight history IS exported
- GIVEN "Rosca Direta" in gym "A" has 5 weight-history entries and a current weight of 25 KG
- WHEN the user exports the backup
- THEN the JSON contains the current weight AND all 5 history entries

#### Scenario: Sessions ARE exported
- GIVEN gym "A" has a completed workout session with entries and their done states
- WHEN the user exports the backup
- THEN the JSON contains the session and its entries, done states preserved

#### Scenario: Photos ARE exported, as base64
- GIVEN an exercise in gym "A" has a photo attached
- WHEN the user exports the backup
- THEN the JSON contains the photo record with its image bytes base64-encoded and its mime type

#### Scenario: The Backup screen states the backup is complete
- GIVEN the user opens Configurações → Backup
- WHEN they read the export section
- THEN it states the backup includes everything (weights, notes, sessions, history, and photos)
- AND it no longer claims photos are excluded

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported backup JSON,
performing a full **restore**. Import **replaces all existing local data** with
the document's contents — after a successful import, the device holds **exactly**
what the backup contained and nothing else. Import MUST validate the document
first and MUST NOT corrupt existing data on failure. The user MUST be warned,
with a destructive-action confirmation, that **all** current data — **including
photos** — will be overwritten.

The restore MUST reproduce the source faithfully: gyms, categories, exercises,
days, weights, **weight history**, **workout sessions and entries**, notes, and
**photos** are all restored, with their **original identifiers preserved** so that
every cross-reference (a session's entries, a photo's exercise, a weight's gym)
remains valid. Base64 photo bytes MUST be decoded back to their original binary
form, **byte-for-byte**.

A backup produced by an **older version** that lacks some arrays (e.g. no
`sessions`, `exercisePhotos`, or `weightHistory`) MUST import cleanly, restoring
**zero** rows for the missing tables and everything else normally. Only genuine
backup documents MUST be accepted — any other file (malformed, or not a MyOneGym
backup) MUST be rejected with a clear message **before** any data is touched.

#### Scenario: Full round-trip restore
- GIVEN the user exported a complete backup and then cleared local storage
- WHEN the user imports that backup
- THEN all gyms, categories, exercises, days, weights, weight history, notes, sessions and entries, and photos are restored identically
- AND a restored photo displays correctly (its bytes and mime type are intact)

#### Scenario: Restore replaces existing data, including photos
- GIVEN the device currently has gym "A" with its own exercises and photos
- WHEN the user imports a backup containing gym "B" and confirms the overwrite
- THEN local data contains only the imported content (gym "B" and its photos)
- AND gym "A", its data, and its photos are gone

#### Scenario: References survive the restore
- GIVEN a backup with a completed session whose entries reference exercises, and photos attached to those exercises
- WHEN the user imports it
- THEN opening the restored session shows its entries
- AND opening the restored exercises shows their photos (ids line up)

#### Scenario: Older backup without the new tables imports cleanly
- GIVEN a backup JSON produced before sessions/history/photos were exported (those keys absent)
- WHEN the user imports it
- THEN the import succeeds, those tables are empty, and gyms/exercises/days/weights/notes are restored

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym backup (malformed, or some other document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

---

## REMOVED Requirements

(None)
