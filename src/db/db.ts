import Dexie, { type Table } from 'dexie'
import { GLOBAL_GYM_ID, UNCATEGORIZED } from './types'
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
    // v7 — exercises may be declared ALTERNATIVES of one another (same
    // stimulus, different equipment). Additive: every existing exercise starts
    // with no alternatives, which is exactly how the app behaved before.
    //
    // No index and no `.stores()` change: the relation is symmetric, so the
    // only question ever asked ("who are my alternatives?") is answered by the
    // record itself — nothing scans for referrers. Nothing else changes shape:
    // a day still lists the exercises the user put in it, and a session still
    // has one entry per exercise. See `Exercise.alternativeIds`.
    this.version(7)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('exercises')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            e.alternativeIds = []
          })
      })
    // v8 — a photo's image moves OUT of its record and into a file (OPFS); the
    // record keeps the metadata plus the file's name. Additive and unindexed:
    // nothing ever queries photos by file name, the record is always reached by
    // `(gymId, exerciseId)` first.
    //
    // Deliberately a no-op upgrade. Two things could have gone here and both are
    // wrong: moving the **binary** (OPFS I/O cannot join an IndexedDB
    // transaction, so awaiting it would hold the version-change transaction open
    // on a promise Dexie does not control), and backfilling `size` (a
    // read-modify-write of every photo row, i.e. rewriting every image on disk,
    // to compute a number nothing needs until the photo is touched anyway).
    //
    // Existing photos are therefore left exactly as they are — still readable —
    // and are moved afterwards, one at a time and idempotently, by
    // `migrateLegacyPhotos` in db/repos, which fills `size` as it goes.
    this.version(8).stores({})
    // v9 — a weight is GLOBAL by default (`gymId = GLOBAL_GYM_ID`) and a gym's
    // own weight is an exception. No index changes: the sentinel is just an id
    // the same compound keys already accept.
    //
    // Everything stored before this version is per-gym, so the upgrade has to
    // decide which of a user's gyms speaks for the exercise. It promotes, per
    // exercise, the OLDEST gym that has a weight for it — see
    // `promoteWeightsToGlobal`. Nothing is deleted and nothing is merged: the
    // other gyms' rows stay exactly as they are and simply become exceptions,
    // so a user with a single gym comes out fully global with no exceptions.
    this.version(9)
      .stores({})
      .upgrade(async (tx) => {
        await promoteWeightsToGlobal(
          tx.table('gyms') as Table<Gym, number>,
          tx.table('weights') as Table<Weight, number>,
          tx.table('weightHistory') as Table<WeightHistory, number>,
        )
      })
  }
}

/**
 * Give every exercise that has any weight a **global** one, by promoting the
 * row of the oldest gym that has it (creation order, ties by id) and moving
 * that gym's history for the pair along with it. Rows of other gyms are left
 * untouched and become exceptions.
 *
 * Runs on tables rather than on the database so the v9 upgrade and the restore
 * of a pre-v9 backup can share it — two paths that face the same data with the
 * same required outcome.
 *
 * **Idempotent**: an exercise that already has a global row is skipped, so
 * re-running promotes nothing and re-keys nothing. Returns how many exercises
 * were promoted.
 */
export async function promoteWeightsToGlobal(
  gyms: Table<Gym, number>,
  weights: Table<Weight, number>,
  history: Table<WeightHistory, number>,
): Promise<number> {
  const [allGyms, allWeights] = await Promise.all([gyms.toArray(), weights.toArray()])

  // Creation order decides who speaks for the exercise. A weight whose gym no
  // longer exists ranks after every real gym — it is a leftover, not a choice.
  const rank = new Map<number, number>()
  allGyms
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt || (a.id ?? 0) - (b.id ?? 0))
    .forEach((g, i) => {
      if (g.id != null) rank.set(g.id, i)
    })
  const rankOf = (gymId: number) => rank.get(gymId) ?? allGyms.length + gymId

  const alreadyGlobal = new Set(
    allWeights.filter((w) => w.gymId === GLOBAL_GYM_ID).map((w) => w.exerciseId),
  )
  const winners = new Map<number, Weight>()
  for (const w of allWeights) {
    if (w.gymId === GLOBAL_GYM_ID || alreadyGlobal.has(w.exerciseId)) continue
    const best = winners.get(w.exerciseId)
    if (!best || rankOf(w.gymId) < rankOf(best.gymId)) winners.set(w.exerciseId, w)
  }

  for (const [exerciseId, row] of winners) {
    if (row.id == null) continue
    // The entries move first: once the weight is re-keyed, its old gym id is
    // no longer readable from it, and a half-applied promotion would leave the
    // timeline stranded under a gym that no longer holds the weight.
    const entries = await history
      .where('[gymId+exerciseId]')
      .equals([row.gymId, exerciseId])
      .toArray()
    for (const entry of entries) {
      if (entry.id != null) await history.update(entry.id, { gymId: GLOBAL_GYM_ID })
    }
    await weights.update(row.id, { gymId: GLOBAL_GYM_ID })
  }
  return winners.size
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
    // Clearing the photo records is only half the job — their image files live
    // outside the database, so an import/reset must drop those too (see
    // `clearImages` in data/photoStore).
    database.exercisePhotos,
  ]
}
