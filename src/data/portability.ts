import { allTables, db, type MyOneGymDB } from '../db/db'
import type { Category, Day, Exercise, Gym, Session, SessionEntry, Unit, Weight } from '../db/types'
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
 * Full backup document — current weights only, NO weight-change history log.
 * Workout sessions ARE included (durable training history). `sessions`/
 * `sessionEntries` were added in schema v2; older documents omit them.
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
  sessions: Session[]
  sessionEntries: SessionEntry[]
}

/** Share document — exercises + categories only (no gyms, weights, history). */
export interface ShareDoc {
  app: typeof APP_TAG
  kind: 'exercises'
  version: number
  exportedAt: number
  categories: Pick<Category, 'id' | 'name'>[]
  exercises: Pick<Exercise, 'name' | 'mediaUrl' | 'categoryId'>[]
}

/* ------------------------------------------------------------------ export */

export async function exportBackup(d: MyOneGymDB = db): Promise<BackupDoc> {
  const [gyms, categories, exercises, days, weights, sessions, sessionEntries] = await Promise.all([
    d.gyms.toArray(),
    d.categories.toArray(),
    d.exercises.toArray(),
    d.days.toArray(),
    d.weights.toArray(), // current weights only; weightHistory is intentionally excluded
    d.sessions.toArray(),
    d.sessionEntries.toArray(),
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
    sessions,
    sessionEntries,
  }
}

export async function exportExercisesShare(d: MyOneGymDB = db): Promise<ShareDoc> {
  const [categories, exercises] = await Promise.all([d.categories.toArray(), d.exercises.toArray()])
  return {
    app: APP_TAG,
    kind: 'exercises',
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    exercises: exercises.map((e) => ({ name: e.name, mediaUrl: e.mediaUrl, categoryId: e.categoryId })),
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
  // sessions arrived in v2 — treat older backups (without them) as empty.
  if (!Array.isArray(obj.sessions)) obj.sessions = []
  if (!Array.isArray(obj.sessionEntries)) obj.sessionEntries = []
  return obj as unknown as BackupDoc
}

export function parseShare(json: string): ShareDoc {
  const obj = parse(json)
  if (!isRecord(obj) || obj.app !== APP_TAG || obj.kind !== 'exercises') {
    throw new PortabilityError('Este arquivo não é uma lista de exercícios do MyOneGym.')
  }
  assertArrays(obj, ['categories', 'exercises'])
  return obj as unknown as ShareDoc
}

/* ------------------------------------------------------------------ import */

/**
 * Replace ALL local data with the backup. Validates first; on any failure the
 * store is left untouched. The imported side starts with an empty history log.
 */
export async function importBackupReplaceAll(doc: BackupDoc, d: MyOneGymDB = db): Promise<void> {
  await d.transaction('rw', allTables(d), async () => {
    await Promise.all(allTables(d).map((t) => t.clear()))
    await d.gyms.bulkAdd(doc.gyms)
    await d.categories.bulkAdd(doc.categories)
    await d.exercises.bulkAdd(doc.exercises)
    await d.days.bulkAdd(doc.days)
    await d.weights.bulkAdd(doc.weights)
    if (doc.sessions.length) await d.sessions.bulkAdd(doc.sessions)
    if (doc.sessionEntries.length) await d.sessionEntries.bulkAdd(doc.sessionEntries)
    // weightHistory stays empty by design
  })
}

/**
 * Merge shared exercises + categories into the current data WITHOUT touching
 * gyms or weights. Categories are matched by name (created if missing);
 * exercises are appended with remapped category references.
 */
export async function importExercisesMerge(doc: ShareDoc, d: MyOneGymDB = db): Promise<number> {
  return d.transaction('rw', d.categories, d.exercises, async () => {
    const remap = new Map<number, number>() // old categoryId -> new categoryId
    for (const c of doc.categories) {
      const existing = await d.categories.where('name').equalsIgnoreCase(c.name).first()
      const newId = existing?.id ?? (await d.categories.add({ name: c.name }))
      if (c.id != null) remap.set(c.id, newId)
    }
    let added = 0
    for (const e of doc.exercises) {
      const categoryId = e.categoryId != null ? remap.get(e.categoryId) : undefined
      await d.exercises.add({ name: e.name, mediaUrl: e.mediaUrl, categoryId })
      added++
    }
    return added
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
