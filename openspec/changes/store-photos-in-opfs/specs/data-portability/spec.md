# Delta: data-portability

**Change ID:** `store-photos-in-opfs`
**Affects:** de onde o backup lê as fotos e para onde a importação as grava —
o **formato do arquivo não muda**

---

## MODIFIED Requirements

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export **the entire database** as a single
versioned JSON file, so that the export can serve as a true **backup** against the
loss of the PWA's local storage. The export MUST include **all** persistent user
data:

- gyms, categories, exercises (com suas **categorias** e suas **alternativas**),
  training days;
- the current per-gym **weight** for each exercise, and the full per-gym
  **weight-change history**;
- the per-gym exercise **notes**;
- every **workout session** and its **entries** (with their done states and the
  exercise each one ended up recording, swap included);
- every per-gym exercise **photo**, with its image bytes.

Because a JSON document cannot carry binary directly, photo image bytes MUST be
**base64-encoded** into the document. The file is therefore self-contained and
restorable with no special tool, at the cost of size — a backup with many photos
may be several megabytes, which is acceptable for a safety-net backup.

Photo bytes now live in a **file** rather than in the photo record (see the
`exercise-photos` spec), so the export MUST **read each photo's image** before
encoding it. Where the image lives MUST NOT change the document: the exported
JSON MUST have the **same shape as before** — each photo carrying its bytes
base64-encoded and its mime type — so that a backup taken by this version imports
into an older one, and a backup taken by an older version imports into this one.
The backup's schema version MUST NOT be bumped for this change.

A photo whose image file cannot be read MUST NOT abort the export: the rest of
the backup is far more valuable than one unreadable image, and the user MUST be
told how many photos could not be included.

Device-local **UI preferences** — the font-size setting and the first-launch
"already asked" flag — are NOT user data and MUST remain outside the backup.

#### Scenario: Photos ARE exported, as base64
- GIVEN an exercise in gym "A" has a photo attached
- WHEN the user exports the backup
- THEN the JSON contains the photo record with its image bytes base64-encoded and its mime type

#### Scenario: The document does not reveal where the image was stored
- GIVEN one photo whose image is a file and another whose bytes are in its record
- WHEN the user exports the backup
- THEN both appear identically in the JSON, each with base64 bytes and a mime type
- AND the document's schema version is unchanged from the previous release

#### Scenario: An unreadable photo does not abort the export
- GIVEN a photo whose image file is missing
- WHEN the user exports the backup
- THEN the backup is produced with all the other data and photos
- AND the user is told that one photo could not be included

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported backup JSON,
performing a full **restore**. Import **replaces all existing local data** with
the document's contents — after a successful import, the device holds **exactly**
what the backup contained and nothing else. Import MUST validate the document
first and MUST NOT corrupt existing data on failure. The user MUST be warned,
with a destructive-action confirmation, that **all** current data — **including
photos** — will be overwritten.

Replacing "all existing local data" MUST include the **image files** of the
photos being replaced: clearing the records alone would leave the previous
device's images occupying storage with nothing pointing at them.

The restore MUST reproduce the source faithfully: gyms, categories, exercises,
days, weights, **weight history**, **workout sessions and entries**, notes, and
**photos** are all restored, with their **original identifiers preserved** so that
every cross-reference (a session's entries, a photo's exercise, a weight's gym)
remains valid. Base64 photo bytes MUST be decoded back to their original binary
form, **byte-for-byte**, and written to the app's photo **file** storage, so that
an imported photo is indistinguishable from one attached on this device. On a
device without writable file storage, imported photos MUST fall back to the same
in-record storage used when attaching (see `exercise-photos`).

A restauração MUST deixar as **alternativas em estado íntegro**, porque a relação
é simétrica e uma importação não pode produzir um banco que o app não saberia
manter. A importação MUST NOT, porém, **fechar transitivamente** o que o arquivo
traz: unir A–B e A–C num trio inventaria um tipo de variação que o usuário nunca
declarou. As reparações são apenas:

- um exercício **sem** o campo (backup anterior às alternativas) MUST ser
  restaurado **sem alternativas**;
- uma referência **pendente** — apontando para um exercício que não está no
  backup — MUST ser descartada;
- uma **auto-referência** MUST ser ignorada;
- um vínculo **de um lado só** MUST ser restaurado nos **dois** sentidos.

Nenhum desses casos MUST rejeitar o arquivo: a importação corrige e segue.

A backup produced by an **older version** that lacks some arrays (e.g. no
`sessions`, `exercisePhotos`, or `weightHistory`) MUST import cleanly, restoring
**zero** rows for the missing tables and everything else normally. Only genuine
backup documents MUST be accepted — any other file (malformed, or not a MyOneGym
backup) MUST be rejected with a clear message **before** any data is touched.

#### Scenario: An imported photo lands in file storage
- GIVEN a backup containing a photo
- WHEN the user imports it
- THEN the photo's bytes are decoded and written as an image file
- AND its record references that file and carries no bytes of its own
- AND opening the exercise shows the photo, byte-for-byte identical to the source

#### Scenario: Restore replaces existing data, including photos
- GIVEN the device currently has gym "A" with its own exercises and photos
- WHEN the user imports a backup containing only gym "B"
- THEN local data contains only the imported content (gym "B" and its photos)
- AND gym "A", its data, and its photos are gone
- AND gym "A"'s image files are gone from storage as well

#### Scenario: A backup taken before this change imports cleanly
- GIVEN a backup exported by a previous version (photos as base64, no notion of files)
- WHEN the user imports it
- THEN every photo is restored and displays
- AND the restored photos live in file storage like any other

### Requirement: Reset App (Erase All Data)

From Settings, the user MUST be able to **reset the app**, erasing **all
registered data** from the device: gyms, categories, exercises, training
days, weights, weight history, **exercise notes**, workout sessions/entries, and
the photos **together with their image files** — the same full set already
cleared as the first step of "Importar backup". The action MUST
require an explicit confirmation, and the confirmation MUST clearly state
that the action **cannot be undone** before anything is erased. On confirm,
all local data is erased immediately; declining or dismissing the
confirmation MUST leave all existing data unchanged. After a reset, the app
MUST behave like a fresh install — including re-arming the first-launch
sample-data prompt (see app-foundation) so the user may choose to reload the
sample data again. Device-local **presentation** preferences (e.g. the
font-size setting) are unaffected by a reset.

#### Scenario: Confirming erases all registered data
- GIVEN the user has gyms, exercises, days, weights, notes, sessions and photos
- WHEN the user confirms the reset
- THEN all of it is erased, including the photos' image files
- AND the app behaves like a fresh install

---

## REMOVED

(None)
