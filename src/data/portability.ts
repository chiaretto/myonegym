import { allTables, db, type MyOneGymDB } from '../db/db'
import type { Category, Day, Exercise, Gym, Session, SessionEntry, Weight } from '../db/types'

export const APP_TAG = 'myonegym'
export const SCHEMA_VERSION = 2

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

/** Populate a small demo routine so the app is usable immediately. */
export async function generateExample(d: MyOneGymDB = db): Promise<void> {
  const peito = await getOrCreateCategory('Peito', d)
  const costas = await getOrCreateCategory('Costas', d)
  const biceps = await getOrCreateCategory('Bíceps', d)
  const triceps = await getOrCreateCategory('Tríceps', d)
  const pernas = await getOrCreateCategory('Pernas', d)

  const mk = (name: string, categoryId: number) => d.exercises.add({ name, categoryId })
  const supino = await mk('Supino Reto', peito)
  const crucifixo = await mk('Crucifixo', peito)
  const tricepsCorda = await mk('Tríceps Corda', triceps)
  const puxada = await mk('Puxada Frontal', costas)
  const remada = await mk('Remada Curvada', costas)
  const rosca = await mk('Rosca Direta', biceps)
  const agachamento = await mk('Agachamento Livre', pernas)
  const legPress = await mk('Leg Press', pernas)

  await d.days.add({ name: 'Dia 1', categoryId: peito, exerciseIds: [supino, crucifixo, tricepsCorda] })
  await d.days.add({ name: 'Dia 2', categoryId: costas, exerciseIds: [puxada, remada, rosca] })
  await d.days.add({ name: 'Dia 3', categoryId: pernas, exerciseIds: [agachamento, legPress] })

  // Seed a demo gym with a few weights if none exists yet.
  const gymCount = await d.gyms.count()
  if (gymCount === 0) {
    const gymId = await d.gyms.add({ name: 'Minha Academia', createdAt: Date.now() })
    const seed: Array<[number, number]> = [
      [supino, 40],
      [crucifixo, 15],
      [puxada, 50],
      [rosca, 20],
      [agachamento, 60],
    ]
    for (const [exerciseId, value] of seed) {
      await d.weights.add({ gymId, exerciseId, value, unit: 'KG' })
      await d.weightHistory.add({ gymId, exerciseId, value, unit: 'KG', changedAt: Date.now(), kind: 'first' })
    }
  }
}
