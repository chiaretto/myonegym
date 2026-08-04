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

#### Scenario: Alternativas SÃO exportadas
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário exporta o backup
- THEN o JSON registra a relação nos dois exercícios

#### Scenario: A troca feita na sessão É exportada
- GIVEN uma sessão concluída em que a linha começou como "Supino Reto" e o
  usuário registrou que fez "Supino Máquina" no lugar
- WHEN o usuário exporta o backup
- THEN o JSON contém a entrada registrando "Supino Máquina"

#### Scenario: The Backup screen states the backup is complete
- GIVEN the user opens Configurações → Backup
- WHEN they read the export section
- THEN it states the backup includes everything (weights, notes, sessions, history, and photos)
- AND it no longer claims photos are excluded

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

#### Scenario: Full round-trip restore
- GIVEN the user exported a complete backup and then cleared local storage
- WHEN the user imports that backup
- THEN all gyms, categories, exercises, days, weights, weight history, notes, sessions and entries, and photos are restored identically
- AND a restored photo displays correctly (its bytes and mime type are intact)

#### Scenario: Restore replaces existing data, including photos
- GIVEN the device currently has gym "A" with its own exercises and photos
- WHEN the user imports a backup containing only gym "B"
- THEN local data contains only the imported content (gym "B" and its photos)
- AND gym "A", its data, and its photos are gone
- AND gym "A"'s image files are gone from storage as well

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

#### Scenario: Round-trip preserva os tipos de variação separados
- GIVEN um backup em que "Supino Reto" tem "Supino Máquina" e "Crucifixo" como
  alternativas, e esses dois não são alternativas entre si
- WHEN o usuário importa esse backup
- THEN "Supino Reto" volta com as duas
- AND "Supino Máquina" e "Crucifixo" voltam listando apenas "Supino Reto"

#### Scenario: Backup anterior às alternativas
- GIVEN um backup produzido antes desta mudança (exercícios sem o campo)
- WHEN o usuário o importa
- THEN todos os exercícios são restaurados sem alternativas
- AND nada mais na importação é afetado

#### Scenario: Referência pendente é descartada
- GIVEN um backup em que "Supino Reto" lista como alternativa um exercício que
  não existe no documento
- WHEN o usuário o importa
- THEN "Supino Reto" é restaurado sem essa referência
- AND a importação não é rejeitada

#### Scenario: Vínculo de um lado só é corrigido
- GIVEN um backup em que "Supino Reto" lista "Supino Máquina", mas "Supino
  Máquina" não lista ninguém
- WHEN o usuário o importa
- THEN os dois ficam alternativas entre si

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym backup (malformed, or some other document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

#### Scenario: An imported photo lands in file storage
- GIVEN a backup containing a photo
- WHEN the user imports it
- THEN the photo's bytes are decoded and written as an image file
- AND its record references that file and carries no bytes of its own
- AND opening the exercise shows the photo, byte-for-byte identical to the source

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

#### Scenario: Reset requires confirmation and warns it is irreversible
- GIVEN the user has gyms, exercises, days, and weights registered
- WHEN the user taps "Resetar app" in Settings → Backup
- THEN a confirmation is shown stating that all data will be erased and the action cannot be undone

#### Scenario: Confirming erases all registered data
- GIVEN the user has gyms, exercises, days, weights, notes, sessions and photos
- WHEN the user confirms the reset
- THEN all of it is erased, including the photos' image files
- AND the app behaves like a fresh install


#### Scenario: Declining keeps data intact
- GIVEN the reset confirmation is shown
- WHEN the user cancels/dismisses it
- THEN no data is erased and the app is unchanged

#### Scenario: Reset re-arms the first-launch prompt
- GIVEN the user has already been asked about the sample data on this device (see app-foundation)
- WHEN the user resets the app
- THEN the first-launch sample-data prompt is shown again the next time the app loads

#### Scenario: Reset does not affect presentation preferences
- GIVEN the user has set a custom font size
- WHEN the user resets the app
- THEN the font-size preference is unchanged after the reset
