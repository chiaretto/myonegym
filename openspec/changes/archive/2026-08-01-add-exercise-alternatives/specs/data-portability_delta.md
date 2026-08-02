# Delta: data-portability

**Change ID:** `add-exercise-alternatives`
**Affects:** conteúdo do backup, normalização na importação

---

## MODIFIED

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

Device-local **UI preferences** — the font-size setting and the first-launch
"already asked" flag — are NOT user data and MUST remain outside the backup.

#### Scenario: Alternativas SÃO exportadas
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário exporta o backup
- THEN o JSON registra a relação nos dois exercícios

#### Scenario: A troca feita na sessão É exportada
- GIVEN uma sessão concluída em que a linha começou como "Supino Reto" e o
  usuário registrou que fez "Supino Máquina" no lugar
- WHEN o usuário exporta o backup
- THEN o JSON contém a entrada registrando "Supino Máquina"

#### Scenario: Export the whole database
- GIVEN the user has gyms, exercises, days, weights, weight history, notes, workout sessions, and photos
- WHEN the user taps "Exportar backup"
- THEN a single versioned JSON document is produced containing all of them

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

A restauração MUST deixar as **alternativas em estado íntegro**, porque a relação
é simétrica e uma importação não pode produzir um banco que o app não saberia
manter. A importação MUST NOT, porém, **fechar transitivamente** o que o arquivo
traz: unir A–B e A–C num trio inventaria um tipo de variação que o usuário nunca
declarou. As reparações são apenas:

- um exercício **sem** o campo (backup anterior a esta mudança) MUST ser
  restaurado **sem alternativas**;
- uma referência **pendente** — apontando para um exercício que não está no
  backup — MUST ser descartada;
- um vínculo **de um lado só** MUST ser restaurado nos **dois** sentidos.

Nenhum desses casos MUST rejeitar o arquivo: a importação corrige e segue.

A backup produced by an **older version** that lacks some arrays (e.g. no
`sessions`, `exercisePhotos`, or `weightHistory`) MUST import cleanly, restoring
**zero** rows for the missing tables and everything else normally. Only genuine
backup documents MUST be accepted — any other file (malformed, or not a MyOneGym
backup) MUST be rejected with a clear message **before** any data is touched.

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

#### Scenario: Full round-trip restore
- GIVEN the user exported a complete backup and then cleared local storage
- WHEN the user imports that backup
- THEN all gyms, categories, exercises, days, weights, weight history, notes, sessions and entries, and photos are restored identically
- AND a restored photo displays correctly (its bytes and mime type are intact)

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym backup (malformed, or some other document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

---

## ADDED

(None)

---

## REMOVED

(None)
