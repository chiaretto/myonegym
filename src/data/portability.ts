import { USER_ID_BASE, isOfficialId, officialExercise } from './officialCatalog'
import { EXAMPLE_DAYS, EXAMPLE_GYM, EXAMPLE_WEIGHTS } from './exampleRoutine'
import { allTables, db, promoteWeightsToGlobal, type MyOneGymDB } from '../db/db'
import { GLOBAL_GYM_ID, UNCATEGORIZED } from '../db/types'
import type {
  Category,
  Day,
  Exercise,
  ExerciseNote,
  ExercisePhoto,
  Gym,
  Session,
  SessionEntry,
  Weight,
  WeightHistory,
} from '../db/types'
import { mirrorSymmetric } from './alternativesRepair'
import { base64ToBytes, bytesToBase64 } from './base64'
import { clearImages, readImage, removeImage, writeImage, type StoredImage } from './photoStore'

export const APP_TAG = 'myonegym'
// v6: a weight is GLOBAL by default — its `gymId` is `GLOBAL_GYM_ID`, which
// matches no gym in the document on purpose — and a row keyed to a real gym is
// that gym's exception. Older files have no global row at all, so restoring one
// promotes their weights the same way the v9 database upgrade does; see
// `GLOBAL_WEIGHTS_VERSION`.
//
// v5: exercises carry their ALTERNATIVES (`alternativeIds`) and a session entry
// that stands for a set carries its members. Nothing was removed, so a v4 file
// still imports — see `normalizeAlternatives`.
//
// v4: the backup carries the WHOLE database — weight history, sessions and photos
// included (photos base64-encoded). Older backups (v3 and earlier) omit some of
// these arrays and still import (missing tables restore empty).
// The **warm-ups** were removed from the app, so the document no longer carries
// them. The version is deliberately NOT bumped: neither direction misreads the
// other. A new file has no `warmups` key, which an older app already treats as
// "none" (it is how it reads a backup predating warm-ups); an older file has the
// key, which this version ignores. Bumping would only make old files look
// unrestorable when they are not.
export const SCHEMA_VERSION = 6

/**
 * First document version whose weights are already global. A file older than
 * this carries only per-gym weights, and restoring it as-is would put the
 * device back on the model the app left behind — so the restore promotes them.
 */
export const GLOBAL_WEIGHTS_VERSION = 6


export class PortabilityError extends Error {}

/**
 * On-disk form of a photo: the record's metadata plus its image, base64-encoded
 * into `bytes` because JSON cannot carry binary. Rebuilt into an
 * `ExercisePhoto` on import.
 *
 * `file` is dropped: a file name inside *this* device's private file system
 * means nothing anywhere else, and the point of the document is that a photo
 * looks the same in it whether the image was stored as a file or in the record.
 * The shape is therefore exactly what previous versions wrote and read.
 */
export type SerializedPhoto = Omit<ExercisePhoto, 'bytes' | 'file' | 'size'> & {
  bytes: string
  /** Absent in backups written before photos knew their own size. */
  size?: number
}

/**
 * Full backup document — a **complete** snapshot of the database, so an import can
 * fully restore a device after its local storage is lost. Carries every table:
 * catalog, weights AND their history, workout sessions AND entries, notes, and
 * photos (base64-encoded). Device-local **UI preferences** (font size, the
 * first-launch flag) are not user data and are intentionally NOT part of this.
 *
 * `weights` and `weightHistory` hold **both scopes** in one list: the exercise's
 * global row, keyed by `GLOBAL_GYM_ID`, alongside the per-gym exceptions. A
 * global row therefore names a gym the document does not contain — that is its
 * shape, not corruption, and the import must never read it as a dangling
 * reference.
 */
export interface BackupDoc {
  app: typeof APP_TAG
  kind: 'backup'
  version: number
  exportedAt: number
  gyms: Gym[]
  categories: Category[]
  exercises: Exercise[]
  days: Day[]
  weights: Weight[]
  weightHistory: WeightHistory[]
  sessions: Session[]
  sessionEntries: SessionEntry[]
  exerciseNotes: ExerciseNote[]
  exercisePhotos: SerializedPhoto[]
}

/* ------------------------------------------------------------------ export */

export async function exportBackup(d: MyOneGymDB = db): Promise<BackupDoc> {
  const [
    gyms,
    categories,
    exercises,
    days,
    weights,
    weightHistory,
    sessions,
    sessionEntries,
    exerciseNotes,
    exercisePhotos,
  ] = await Promise.all([
    d.gyms.toArray(),
    d.categories.toArray(),
    d.exercises.toArray(),
    d.days.toArray(),
    d.weights.toArray(),
    d.weightHistory.toArray(),
    d.sessions.toArray(),
    d.sessionEntries.toArray(),
    d.exerciseNotes.toArray(),
    d.exercisePhotos.toArray(),
  ])
  return {
    app: APP_TAG,
    kind: 'backup',
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    gyms,
    categories,
    exercises,
    days,
    weights,
    weightHistory,
    sessions,
    sessionEntries,
    exerciseNotes,
    exercisePhotos: await serializePhotos(exercisePhotos),
  }
}

/**
 * Photo records → their on-disk form, reading each image from wherever it lives
 * and base64-encoding it so it survives JSON.
 *
 * A photo whose image cannot be read is **skipped**, not fatal: the rest of the
 * backup is worth far more than one lost image, and the caller reports how many
 * were left out by comparing counts (see the Backup screen).
 */
async function serializePhotos(photos: ExercisePhoto[]): Promise<SerializedPhoto[]> {
  const out: SerializedPhoto[] = []
  for (const photo of photos) {
    let bytes: ArrayBuffer
    try {
      bytes = await (await readImage(photo)).arrayBuffer()
    } catch {
      continue
    }
    const { file: _file, bytes: _bytes, ...meta } = photo
    out.push({ ...meta, size: meta.size ?? bytes.byteLength, bytes: bytesToBase64(bytes) })
  }
  return out
}

/* ------------------------------------------------------------------ parse */

function parse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    throw new PortabilityError('Arquivo não é um JSON válido.')
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function assertArrays(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    if (!Array.isArray(obj[k])) throw new PortabilityError(`Documento inválido: falta "${k}".`)
  }
}

/** Arrays that older backups may lack — default to [] rather than reject, so a
 *  pre-v4 file (no history/sessions/photos) still restores everything it has. */
const OPTIONAL_ARRAYS = [
  'weightHistory',
  'sessions',
  'sessionEntries',
  'exerciseNotes',
  'exercisePhotos',
] as const

export function parseBackup(json: string): BackupDoc {
  const obj = parse(json)
  if (!isRecord(obj) || obj.app !== APP_TAG || obj.kind !== 'backup') {
    throw new PortabilityError('Este arquivo não é um backup do MyOneGym.')
  }
  assertArrays(obj, ['gyms', 'categories', 'exercises', 'days', 'weights'])
  for (const k of OPTIONAL_ARRAYS) {
    if (obj[k] === undefined) obj[k] = []
    else if (!Array.isArray(obj[k])) {
      throw new PortabilityError(`Documento inválido: "${k}" deve ser uma lista.`)
    }
  }
  dropRemovedFields(obj)
  dropOfficialRecords(obj)
  normalizeCategories(obj)
  normalizeKinds(obj)
  normalizeVideos(obj)
  normalizeAlternatives(obj)
  return obj as unknown as BackupDoc
}

/**
 * Strip fields the app no longer has, so a restored record matches the shape
 * this version writes.
 *
 * Only `warmupIds` so far: warm-ups were removed, and every backup taken before
 * that carries the field. Nothing reads it, so leaving it would be harmless —
 * and permanent, since the v13 upgrade that cleaned the field out of the
 * database ran before this document arrived. A restore should not be the way
 * dead fields come back.
 */
function dropRemovedFields(obj: Record<string, unknown>): void {
  for (const ex of (obj.exercises ?? []) as Record<string, unknown>[]) delete ex.warmupIds
  delete obj.warmups
}

/**
 * Drop the catalog rows a document carries inside the **official id range**.
 *
 * This is not an edge case — it is what **every backup made before the catalog
 * moved into the bundle** looks like. Those files were exported while the
 * catalog was still database rows, so they carry the official exercises and
 * categories with the very ids the app now serves from the file. Restoring them
 * as they are would recreate exactly the rows the v13 upgrade removed, and a
 * stale catalog would shadow the app's for good.
 *
 * Dropping them is the same swap of source the upgrade performs, applied to a
 * document, and it is safe for the same reason: the identity does not change.
 * The days, weights, history, notes, photos and sessions in the file keep
 * pointing at the same numbers, and those numbers keep meaning the same
 * movements — so the references are restored untouched (see
 * `normalizeAlternatives`, which had to learn the same thing).
 *
 * A record with **no** id is renumbered into the user range instead of dropped:
 * nothing can be referencing it (it had no id to reference), but letting Dexie's
 * key generator name it could land it in the reserved range.
 */
function dropOfficialRecords(obj: Record<string, unknown>): void {
  let next = USER_ID_BASE
  const clean = (rows: Record<string, unknown>[]) =>
    rows.filter((r) => {
      if (typeof r.id !== 'number') {
        r.id = ++next
        return true
      }
      return !isOfficialId(r.id)
    })
  obj.categories = clean(obj.categories as Record<string, unknown>[])
  obj.exercises = clean(obj.exercises as Record<string, unknown>[])
}

/**
 * Make the alternative sets importable, whatever the file says.
 *
 * The relation has to land symmetric and free of dangling ids, because that is
 * the invariant the app maintains and never re-checks at read time (see
 * `Exercise.alternativeIds`). A backup can violate it three ways — it predates
 * the field, it names an exercise it doesn't contain, or it was hand-edited —
 * and none of them is worth rejecting a whole restore over. So: drop what
 * cannot resolve, mirror what only points one way, and move on.
 *
 * Deliberately NOT transitively closed here: closing an asymmetric mess would
 * invent sets the user never declared. Mirroring is the smallest repair that
 * makes the data legal.
 *
 * The repair itself lives in `mirrorSymmetric` — shared with the assistant's
 * apply path, which faces the same problem with the same required outcome.
 */
function normalizeAlternatives(obj: Record<string, unknown>): void {
  const exercises = obj.exercises as Record<string, unknown>[]

  // A link to the OFFICIAL catalog is set aside first. It is not dangling — it
  // resolves against the bundle, which is where that id has always lived — and
  // it must not be mirrored, because the official record has no row to write a
  // back-link to. The read side unions the referrers back in instead (see
  // `lib/alternatives`). Dropping these here would quietly delete the
  // user→official links out of every restore.
  const officialPeers = new Map<number, number[]>()
  const entries = exercises
    // No id, so nothing can point at it — and it cannot point at anything.
    .filter((ex) => typeof ex.id === 'number')
    .map((ex) => {
      const all = Array.isArray(ex.alternativeIds) ? (ex.alternativeIds as number[]) : []
      officialPeers.set(ex.id as number, all.filter(isOfficialId))
      return { key: ex.id as number, peers: all.filter((p) => !isOfficialId(p)) }
    })

  const repaired = mirrorSymmetric(entries, (a, b) => a - b)

  for (const ex of exercises) {
    if (typeof ex.id !== 'number') {
      ex.alternativeIds = []
      continue
    }
    ex.alternativeIds = [...(officialPeers.get(ex.id) ?? []), ...(repaired.get(ex.id) ?? [])]
  }
}

/**
 * Back-compat for backups made before an exercise had multiple categories:
 * - a reserved "Sem categoria" category is dropped (uncategorized is now an
 *   empty list, not a record);
 * - an exercise's singular `categoryId` becomes a one-element `categoryIds`
 *   (or `[]` when it was unset or pointed at the dropped reserved category);
 * - a reference to any dropped reserved category is removed from `categoryIds`.
 */
function normalizeCategories(obj: Record<string, unknown>): void {
  const categories = obj.categories as { id?: number; name?: string; reserved?: boolean }[]
  const reservedIds = new Set(
    categories.filter((c) => c.reserved || c.name === UNCATEGORIZED).map((c) => c.id),
  )
  if (reservedIds.size) {
    obj.categories = categories.filter((c) => !reservedIds.has(c.id))
  }
  for (const ex of obj.exercises as Record<string, unknown>[]) {
    const ids: number[] = Array.isArray(ex.categoryIds)
      ? (ex.categoryIds as number[])
      : ex.categoryId != null
        ? [ex.categoryId as number]
        : []
    ex.categoryIds = ids.filter((id) => !reservedIds.has(id))
    delete ex.categoryId
  }
}

/**
 * Back-compat for backups made before an exercise had a kind: everything the
 * app could model back then was strength, so that is what an absent field
 * means. Rejecting on a missing field would make every older backup
 * unrestorable — the whole point of a safety-net backup is that old files still
 * open.
 */

/**
 * Back-compat for backups made before an exercise carried videos: no `videos`
 * field means none, exactly as an older app had none.
 *
 * Unlike the warm-ups, there is no link to validate and no orphan possible: a
 * video lives INSIDE its exercise, so it arrives and leaves with it. That is a
 * direct consequence of it not being a record of its own.
 *
 * No document version bump, for the same reason the videos needed none: an
 * absent optional field that defaults to empty leaves every older file
 * restorable.
 */
function normalizeVideos(obj: Record<string, unknown>): void {
  for (const ex of (obj.exercises ?? []) as Record<string, unknown>[]) {
    if (!Array.isArray(ex.videos)) ex.videos = []
  }
}

function normalizeKinds(obj: Record<string, unknown>): void {
  for (const ex of (obj.exercises ?? []) as Record<string, unknown>[]) {
    if (ex.kind !== 'cardio') ex.kind = 'strength'
  }
  for (const s of (obj.sessions ?? []) as Record<string, unknown>[]) {
    if (s.kind !== 'cardio') s.kind = 'strength'
  }
}

/* ------------------------------------------------------------------ import */

/**
 * Full RESTORE: replace ALL local data with the backup. Validates first; on any
 * failure the store is left untouched. Every table is cleared and repopulated
 * **with the backup's original ids**, so cross-references (a session's entries, a
 * photo's exercise, a weight's gym) all line up and the device becomes an exact
 * copy of the source. Photo bytes are decoded from base64 back to binary and
 * written to image storage, so a restored photo is indistinguishable from one
 * taken on this device.
 *
 * The images are written **before** the database is touched: a failure there
 * must leave the device exactly as it was, and the files written so far are
 * removed on the way out. The replaced device's own images are dropped only
 * after the transaction commits — by name, never by clearing the directory,
 * which at that point also holds the incoming ones.
 *
 * The one thing not restored verbatim is a **pre-global** file's weights: they
 * are all per-gym, and dropping them in as-is would hand a migrated device the
 * model it left behind. They go through the same promotion the v9 upgrade
 * performs, in the same transaction, so the restore either lands entirely or
 * not at all.
 */
export async function importBackupReplaceAll(doc: BackupDoc, d: MyOneGymDB = db): Promise<void> {
  const replaced: string[] = []
  await d.exercisePhotos.toCollection().each((p) => {
    if (p.file) replaced.push(p.file)
  })

  const written: StoredImage[] = []
  const photos: ExercisePhoto[] = []
  try {
    for (const p of doc.exercisePhotos ?? []) {
      const bytes = base64ToBytes(p.bytes)
      const stored = await writeImage(new Blob([bytes], { type: p.type }))
      written.push(stored)
      const { bytes: _encoded, size: _size, ...meta } = p
      photos.push({ ...meta, file: stored.file, bytes: stored.bytes, size: stored.size })
    }
  } catch (err) {
    for (const image of written) await removeImage(image)
    throw err
  }

  await d.transaction('rw', allTables(d), async () => {
    await Promise.all(allTables(d).map((t) => t.clear()))
    await d.gyms.bulkAdd(doc.gyms)
    await d.categories.bulkAdd(doc.categories)
    await d.exercises.bulkAdd(doc.exercises)
    await d.days.bulkAdd(doc.days)
    await d.weights.bulkAdd(doc.weights)
    if (doc.weightHistory?.length) await d.weightHistory.bulkAdd(doc.weightHistory)
    if (doc.sessions?.length) await d.sessions.bulkAdd(doc.sessions)
    if (doc.sessionEntries?.length) await d.sessionEntries.bulkAdd(doc.sessionEntries)
    if (doc.exerciseNotes?.length) await d.exerciseNotes.bulkAdd(doc.exerciseNotes)
    if (photos.length) await d.exercisePhotos.bulkAdd(photos)
    if ((doc.version ?? 0) < GLOBAL_WEIGHTS_VERSION) {
      await promoteWeightsToGlobal(d.gyms, d.weights, d.weightHistory)
    }
  })

  for (const file of replaced) await removeImage({ file })
}

/* ----------------------------------------------------------------- reset */

/**
 * Erase all registered data (every table from `allTables`) **and the photos'
 * image files**, leaving the app equivalent to a fresh install. Same clearing
 * step `importBackupReplaceAll` performs before restoring, without the
 * subsequent insert — and with the whole photo directory dropped, since here
 * nothing is coming back to reference it.
 */
export async function resetAll(d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', allTables(d), async () => {
    await Promise.all(allTables(d).map((t) => t.clear()))
  })
  await clearImages()
}

/* --------------------------------------------------------------- example */

/**
 * Write the sample routine (see `data/exampleRoutine`).
 *
 * CHANGED: it used to bring its own 8 categories and 29 exercises and insert
 * them with remapped ids. Now that the app **ships** a catalog, creating a
 * second "Supino Reto" beside the one already on screen made the starting point
 * start by duplicating the app — so the sample references the official ids
 * instead, and creates only what is genuinely the user's: four days, a gym and
 * a few weights.
 *
 * Additive and safe: nothing existing is overwritten, and the gym is seeded only
 * when there is none.
 */
export async function generateExample(d: MyOneGymDB = db): Promise<void> {
  // The days reference the OFFICIAL catalog — nothing is created for them. An id
  // the catalog no longer carries is dropped rather than written as a dangling
  // reference; `exampleRoutine.test.ts` is what makes that a build failure
  // instead of a day that quietly comes up short.
  for (const day of EXAMPLE_DAYS) {
    const exerciseIds = day.exerciseIds.filter((id) => officialExercise(id) != null)
    await d.days.add({ name: day.name, exerciseIds })
  }

  // The gym and the sample weights only when no gym exists yet — don't add a
  // second gym over the user's own. The weights are **global**: they belong to
  // the exercises, not to the example gym, and a second gym created later shows
  // them without copying anything.
  if ((await d.gyms.count()) === 0) {
    await d.gyms.add({ name: EXAMPLE_GYM, createdAt: Date.now() })
    for (const w of EXAMPLE_WEIGHTS) {
      if (!officialExercise(w.exerciseId)) continue
      await d.weights.add({
        gymId: GLOBAL_GYM_ID,
        exerciseId: w.exerciseId,
        value: w.value,
        unit: w.unit,
      })
      await d.weightHistory.add({
        gymId: GLOBAL_GYM_ID,
        exerciseId: w.exerciseId,
        value: w.value,
        unit: w.unit,
        changedAt: Date.now(),
        kind: 'first',
      })
    }
  }
}
