import Dexie, { type Table } from 'dexie'
import type {
  Category,
  Day,
  Exercise,
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
  ]
}
