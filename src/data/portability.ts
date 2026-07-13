import { allTables, db, type MyOneGymDB } from '../db/db'
import type { Category, Day, Exercise, Gym, Unit, Weight } from '../db/types'
import exampleBackup from './example-data.json'

export const APP_TAG = 'myonegym'
export const SCHEMA_VERSION = 2

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
 * Full backup document — current weights only. Device-local data is NOT
 * exported: the weight-change history log AND workout sessions/entries stay on
 * the device (a backup carries no `sessions`).
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
}

/* ------------------------------------------------------------------ export */

export async function exportBackup(d: MyOneGymDB = db): Promise<BackupDoc> {
  const [gyms, categories, exercises, days, weights] = await Promise.all([
    d.gyms.toArray(),
    d.categories.toArray(),
    d.exercises.toArray(),
    d.days.toArray(),
    d.weights.toArray(), // current weights only; weightHistory + sessions are device-local
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

export function parseBackup(json: string): BackupDoc {
  const obj = parse(json)
  if (!isRecord(obj) || obj.app !== APP_TAG || obj.kind !== 'backup') {
    throw new PortabilityError('Este arquivo não é um backup do MyOneGym.')
  }
  assertArrays(obj, ['gyms', 'categories', 'exercises', 'days', 'weights'])
  // Any `sessions`/`sessionEntries` in an older backup are ignored (device-local).
  return obj as unknown as BackupDoc
}

/* ------------------------------------------------------------------ import */

/**
 * Replace ALL local data with the backup. Validates first; on any failure the
 * store is left untouched. Device-local data (weight history AND workout
 * sessions) is cleared and not restored — a backup never carries them.
 */
export async function importBackupReplaceAll(doc: BackupDoc, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', allTables(d), async () => {
    await Promise.all(allTables(d).map((t) => t.clear()))
    await d.gyms.bulkAdd(doc.gyms)
    await d.categories.bulkAdd(doc.categories)
    await d.exercises.bulkAdd(doc.exercises)
    await d.days.bulkAdd(doc.days)
    await d.weights.bulkAdd(doc.weights)
    // weightHistory + sessions/sessionEntries stay empty by design (device-local)
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
