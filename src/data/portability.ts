import { allTables, db, type MyOneGymDB } from '../db/db'
import type {
  Category,
  Day,
  Exercise,
  ExerciseNote,
  ExercisePhoto,
  Gym,
  Session,
  SessionEntry,
  Unit,
  Weight,
  WeightHistory,
} from '../db/types'
import { base64ToBytes, bytesToBase64 } from './base64'
import exampleBackup from './example-data.json'

export const APP_TAG = 'myonegym'
// v4: the backup carries the WHOLE database — weight history, sessions and photos
// included (photos base64-encoded). Older backups (v3 and earlier) omit some of
// these arrays and still import (missing tables restore empty).
export const SCHEMA_VERSION = 4

/** Bundled sample routine (issue #4) used by "Gerar exemplo". */
const EXAMPLE_DATA = exampleBackup as unknown as {
  gyms: { id?: number; name: string }[]
  categories: { id?: number; name: string }[]
  exercises: { id?: number; name: string; mediaUrl?: string; categoryId?: number }[]
  days: { id?: number; name: string; exerciseIds?: number[] }[]
  weights: { gymId: number; exerciseId: number; value: number; unit: Unit }[]
}

export class PortabilityError extends Error {}

/**
 * On-disk form of a photo: identical to `ExercisePhoto` except the binary
 * `bytes` (`ArrayBuffer`) is base64-encoded to a string, since JSON can't carry
 * binary. Rebuilt into an `ExercisePhoto` on import.
 */
export type SerializedPhoto = Omit<ExercisePhoto, 'bytes'> & { bytes: string }

/**
 * Full backup document — a **complete** snapshot of the database, so an import can
 * fully restore a device after its local storage is lost. Carries every table:
 * catalog, weights AND their history, workout sessions AND entries, notes, and
 * photos (base64-encoded). Device-local **UI preferences** (font size, the
 * first-launch flag) are not user data and are intentionally NOT part of this.
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
    // Photo bytes → base64 so they survive JSON. Everything else verbatim.
    exercisePhotos: exercisePhotos.map((p) => ({ ...p, bytes: bytesToBase64(p.bytes) })),
  }
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
  return obj as unknown as BackupDoc
}

/* ------------------------------------------------------------------ import */

/**
 * Full RESTORE: replace ALL local data with the backup. Validates first; on any
 * failure the store is left untouched. Every table is cleared and repopulated
 * **with the backup's original ids**, so cross-references (a session's entries, a
 * photo's exercise, a weight's gym) all line up and the device becomes an exact
 * copy of the source. Photo bytes are decoded from base64 back to binary.
 */
export async function importBackupReplaceAll(doc: BackupDoc, d: MyOneGymDB = db): Promise<void> {
  const photos: ExercisePhoto[] = (doc.exercisePhotos ?? []).map((p) => ({
    ...p,
    bytes: base64ToBytes(p.bytes),
  }))
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
  })
}

/* ----------------------------------------------------------------- reset */

/**
 * Erase all registered data (every table from `allTables`), leaving the app
 * equivalent to a fresh install. Same clearing step `importBackupReplaceAll`
 * performs before restoring, without the subsequent insert.
 */
export async function resetAll(d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', allTables(d), async () => {
    await Promise.all(allTables(d).map((t) => t.clear()))
  })
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
    const categoryId = e.categoryId != null ? catRemap.get(e.categoryId) : undefined
    const id = await d.exercises.add({ name: e.name, mediaUrl: e.mediaUrl, categoryId })
    if (e.id != null) exRemap.set(e.id, id)
  }

  for (const day of EXAMPLE_DATA.days) {
    const exerciseIds = (day.exerciseIds ?? [])
      .map((exId) => exRemap.get(exId))
      .filter((x): x is number => x != null)
    await d.days.add({ name: day.name, exerciseIds })
  }

  // Seed the example gym + per-gym weights (with a history entry) only when no
  // gym exists yet — don't add a second gym over the user's own.
  const gymCount = await d.gyms.count()
  if (gymCount === 0 && EXAMPLE_DATA.gyms.length) {
    const gymId = await d.gyms.add({ name: EXAMPLE_DATA.gyms[0].name, createdAt: Date.now() })
    for (const w of EXAMPLE_DATA.weights) {
      const exerciseId = exRemap.get(w.exerciseId)
      if (exerciseId == null) continue
      await d.weights.add({ gymId, exerciseId, value: w.value, unit: w.unit })
      await d.weightHistory.add({
        gymId,
        exerciseId,
        value: w.value,
        unit: w.unit,
        changedAt: Date.now(),
        kind: 'first',
      })
    }
  }
}
