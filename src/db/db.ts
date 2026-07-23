import Dexie, { type Table } from 'dexie'
import { UNCATEGORIZED } from './types'
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
} from './types'

export class MyOneGymDB extends Dexie {
  gyms!: Table<Gym, number>
  categories!: Table<Category, number>
  exercises!: Table<Exercise, number>
  days!: Table<Day, number>
  weights!: Table<Weight, number>
  weightHistory!: Table<WeightHistory, number>
  sessions!: Table<Session, number>
  sessionEntries!: Table<SessionEntry, number>
  exerciseNotes!: Table<ExerciseNote, number>
  exercisePhotos!: Table<ExercisePhoto, number>

  constructor(name = 'myonegym') {
    super(name)
    this.version(1).stores({
      gyms: '++id, name, createdAt',
      categories: '++id, &name',
      exercises: '++id, name, categoryId',
      days: '++id, name',
      // one current weight per (gym, exercise)
      weights: '++id, &[gymId+exerciseId], gymId, exerciseId',
      weightHistory: '++id, [gymId+exerciseId], gymId, exerciseId, changedAt',
    })
    // v2 — workout sessions. Additive: existing stores are carried over.
    this.version(2).stores({
      sessions: '++id, gymId, dayId, status, startedAt, completedAt',
      sessionEntries: '++id, sessionId, exerciseId',
    })
    // v3 — per-gym exercise notes. Additive: one note per (gym, exercise).
    this.version(3).stores({
      exerciseNotes: '++id, &[gymId+exerciseId], gymId, exerciseId',
    })
    // v4 — sessions carry no independent weight; strip the now-removed
    // usedValue/usedUnit from existing entries (weight is always the per-gym target).
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('sessionEntries')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            delete e.usedValue
            delete e.usedUnit
          })
      })
    // v5 — per-gym exercise photos. Additive. Note `[gymId+exerciseId]` is
    // NOT unique (unlike weights/exerciseNotes): a pair holds many photos.
    this.version(5).stores({
      exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt',
    })
    // v6 — an exercise carries MANY categories (categoryIds) instead of one
    // (categoryId). `*categoryIds` is a multiEntry index, so "exercises in
    // category X" stays an indexed query. The upgrade converts each exercise
    // (reserved-bucket or unset → []) and deletes the reserved "Sem categoria"
    // category — uncategorized is now an empty list, not a record.
    this.version(6)
      .stores({ exercises: '++id, name, *categoryIds' })
      .upgrade(async (tx) => {
        const reserved = await tx
          .table('categories')
          .filter((c: { name?: string }) => c.name === UNCATEGORIZED)
          .first()
        const reservedId = reserved?.id
        await tx
          .table('exercises')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            const old = e.categoryId as number | undefined
            e.categoryIds = old != null && old !== reservedId ? [old] : []
            delete e.categoryId
          })
        if (reservedId != null) await tx.table('categories').delete(reservedId)
      })
  }
}

export const db = new MyOneGymDB()

/** All persisted tables in dependency-safe order (used by import/reset). */
export function allTables(database: MyOneGymDB = db) {
  return [
    database.gyms,
    database.categories,
    database.exercises,
    database.days,
    database.weights,
    database.weightHistory,
    database.sessions,
    database.sessionEntries,
    database.exerciseNotes,
    // Device-local, like sessions: an import/reset clears photos (they are not
    // in the backup, so there is nothing to restore them from).
    database.exercisePhotos,
  ]
}
