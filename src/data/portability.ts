import { allTables, db, promoteWeightsToGlobal, type MyOneGymDB } from '../db/db'
import { GLOBAL_GYM_ID, UNCATEGORIZED } from '../db/types'
import type {
  Category,
  Day,
  Exercise,
  ExerciseKind,
  ExerciseNote,
  ExercisePhoto,
  Gym,
  Session,
  SessionEntry,
  Unit,
  Weight,
  WeightHistory,
} from '../db/types'
import { mirrorSymmetric } from './alternativesRepair'
import { base64ToBytes, bytesToBase64 } from './base64'
import { clearImages, readImage, removeImage, writeImage, type StoredImage } from './photoStore'
import exampleBackup from './example-data.json'

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
export const SCHEMA_VERSION = 6

/**
 * First document version whose weights are already global. A file older than
 * this carries only per-gym weights, and restoring it as-is would put the
 * device back on the model the app left behind — so the restore promotes them.
 */
export const GLOBAL_WEIGHTS_VERSION = 6

/** Bundled sample routine (issue #4) used by "Gerar exemplo". */
const EXAMPLE_DATA = exampleBackup as unknown as {
  gyms: { id?: number; name: string }[]
  categories: { id?: number; name: string }[]
  exercises: { id?: number; name: string; mediaUrl?: string; categoryId?: number; kind?: ExerciseKind }[]
  days: { id?: number; name: string; exerciseIds?: number[] }[]
  weights: { gymId: number; exerciseId: number; value: number; unit: Unit }[]
}

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
  normalizeCategories(obj)
  normalizeKinds(obj)
  normalizeAlternatives(obj)
  return obj as unknown as BackupDoc
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

  const repaired = mirrorSymmetric(
    exercises
      // No id, so nothing can point at it — and it cannot point at anything.
      .filter((ex) => typeof ex.id === 'number')
      .map((ex) => ({
        key: ex.id as number,
        peers: Array.isArray(ex.alternativeIds) ? (ex.alternativeIds as number[]) : [],
      })),
    (a, b) => a - b,
  )

  for (const ex of exercises) {
    const peers = typeof ex.id === 'number' ? repaired.get(ex.id) : undefined
    ex.alternativeIds = peers ?? []
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

async function getOrCreateCategory(name: string, d: MyOneGymDB): Promise<number> {
  const existing = await d.categories.where('name').equalsIgnoreCase(name).first()
  if (existing?.id != null) return existing.id
  return d.categories.add({ name })
}

/**
 * Populate a realistic sample routine from the bundled dataset (issue #4).
 * Inserted additively with remapped ids so existing data is never overwritten
 * and references stay intact. The example gym + weights are seeded only when no
 * gym exists yet; the day's own category (from the dataset) is ignored — day
 * categories are derived from the day's exercises.
 */
export async function generateExample(d: MyOneGymDB = db): Promise<void> {
  const catRemap = new Map<number, number>() // dataset categoryId -> local id
  for (const c of EXAMPLE_DATA.categories) {
    const id = await getOrCreateCategory(c.name, d)
    if (c.id != null) catRemap.set(c.id, id)
  }

  const exRemap = new Map<number, number>() // dataset exerciseId -> local id
  for (const e of EXAMPLE_DATA.exercises) {
    const mapped = e.categoryId != null ? catRemap.get(e.categoryId) : undefined
    const categoryIds = mapped != null ? [mapped] : []
    // The sample routine declares no alternatives — it is a starting point, not
    // a showcase of every feature.
    const id = await d.exercises.add({
      name: e.name,
      kind: e.kind ?? 'strength',
      mediaUrl: e.mediaUrl,
      categoryIds,
      alternativeIds: [],
    })
    if (e.id != null) exRemap.set(e.id, id)
  }

  for (const day of EXAMPLE_DATA.days) {
    const exerciseIds = (day.exerciseIds ?? [])
      .map((exId) => exRemap.get(exId))
      .filter((x): x is number => x != null)
    await d.days.add({ name: day.name, exerciseIds })
  }

  // Seed the example gym + the sample weights (with a history entry) only when
  // no gym exists yet — don't add a second gym over the user's own. The weights
  // are **global**: they belong to the exercises, not to the example gym, and a
  // second gym created later shows them without copying anything.
  const gymCount = await d.gyms.count()
  if (gymCount === 0 && EXAMPLE_DATA.gyms.length) {
    await d.gyms.add({ name: EXAMPLE_DATA.gyms[0].name, createdAt: Date.now() })
    for (const w of EXAMPLE_DATA.weights) {
      const exerciseId = exRemap.get(w.exerciseId)
      if (exerciseId == null) continue
      await d.weights.add({ gymId: GLOBAL_GYM_ID, exerciseId, value: w.value, unit: w.unit })
      await d.weightHistory.add({
        gymId: GLOBAL_GYM_ID,
        exerciseId,
        value: w.value,
        unit: w.unit,
        changedAt: Date.now(),
        kind: 'first',
      })
    }
  }
}
