# Delta: data-portability

**Change ID:** `exercise-multi-category`
**Affects:** exercises are exported with a category **list**; older single-category
backups still import (mapped to a one-element list; reserved category dropped)

---

## ADDED Requirements

(None)

---

## MODIFIED Requirements

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

#### Scenario: A backup with single-category exercises imports
- GIVEN a backup produced before exercises had multiple categories (each exercise has a singular `categoryId`)
- WHEN the user imports it
- THEN each exercise is restored with that category as a one-element category list
- AND if the backup contains a reserved "Sem categoria" category, it is dropped and its references become uncategorized

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
