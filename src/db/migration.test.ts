import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import { USER_ID_BASE } from '../data/officialCatalog'
import {
  createCategory,
  createExercise,
  getExercise,
  migrateLegacyPhotos,
  readPhotoBlob,
  resolveWeight,
} from './repos'
import { GLOBAL_GYM_ID } from './types'

/**
 * The **v6, v7, v11 and v12** upgrades reshaped the exercise record
 * (`categoryIds`, `alternativeIds`, `warmupIds`, `videos`). None of them is
 * observable any more: v13 empties the catalog tables, so no row seeded before
 * it survives to be inspected. Their tests were removed rather than rewritten
 * to assert an empty table four times over — that assertion belongs to the v13
 * block below, where it is made once, against a full database.
 */
describe('v8 migration: photos survive the upgrade untouched', () => {
  let name: string
  beforeEach(() => {
    name = `mig8-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v7 — photos with bytes and no size. */
  async function openV7() {
    const db = new Dexie(name)
    db.version(1).stores({
      gyms: '++id, name, createdAt',
      categories: '++id, &name',
      exercises: '++id, name, categoryId',
      days: '++id, name',
      weights: '++id, &[gymId+exerciseId], gymId, exerciseId',
      weightHistory: '++id, [gymId+exerciseId], gymId, exerciseId, changedAt',
    })
    db.version(2).stores({
      sessions: '++id, gymId, dayId, status, startedAt, completedAt',
      sessionEntries: '++id, sessionId, exerciseId',
    })
    db.version(3).stores({ exerciseNotes: '++id, &[gymId+exerciseId], gymId, exerciseId' })
    db.version(4).stores({})
    db.version(5).stores({ exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt' })
    db.version(6).stores({ exercises: '++id, name, *categoryIds' })
    db.version(7).stores({})
    await db.open()
    return db
  }

  it('leaves the image in the record, readable, and moves it only afterwards', async () => {
    const v7 = await openV7()
    const bytes = new TextEncoder().encode('imagem antiga').buffer
    const id = (await v7.table('exercisePhotos').add({
      gymId: 1,
      exerciseId: 2,
      bytes,
      type: 'image/jpeg',
      width: 1600,
      height: 1200,
      createdAt: 1_000,
    })) as number
    v7.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      const photo = await db.exercisePhotos.get(id)
      expect(photo?.file).toBeUndefined()
      // Still readable: the upgrade moves no bytes anywhere.
      expect(await (await readPhotoBlob(photo!)).text()).toBe('imagem antiga')
      expect(photo).toMatchObject({ gymId: 1, exerciseId: 2, width: 1600, height: 1200 })

      // The move is the background pass's job, and it fills in the size.
      expect(await migrateLegacyPhotos(db)).toBe(1)
      const moved = await db.exercisePhotos.get(id)
      expect(moved?.file).toBeTruthy()
      expect(moved?.bytes).toBeUndefined()
      expect(moved?.size).toBe(13)
      expect(await (await readPhotoBlob(moved!)).text()).toBe('imagem antiga')
    } finally {
      db.close()
    }
  })
})

/**
 * v9: a weight becomes GLOBAL by default. Everything written before it is
 * per-gym, so the upgrade has to pick which gym speaks for each exercise — the
 * oldest one that has a weight for it — and move that gym's history along with
 * the weight. No row may be deleted or merged.
 */
describe('v9 migration: per-gym weights are promoted to global', () => {
  let name: string
  beforeEach(() => {
    name = `mig9-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v8 — every weight keyed to a real gym. */
  async function openV8() {
    const db = new Dexie(name)
    db.version(1).stores({
      gyms: '++id, name, createdAt',
      categories: '++id, &name',
      exercises: '++id, name, categoryId',
      days: '++id, name',
      weights: '++id, &[gymId+exerciseId], gymId, exerciseId',
      weightHistory: '++id, [gymId+exerciseId], gymId, exerciseId, changedAt',
    })
    db.version(2).stores({
      sessions: '++id, gymId, dayId, status, startedAt, completedAt',
      sessionEntries: '++id, sessionId, exerciseId',
    })
    db.version(3).stores({ exerciseNotes: '++id, &[gymId+exerciseId], gymId, exerciseId' })
    db.version(4).stores({})
    db.version(5).stores({ exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt' })
    db.version(6).stores({ exercises: '++id, name, *categoryIds' })
    db.version(7).stores({})
    db.version(8).stores({})
    await db.open()
    return db
  }

  /** Seed one weight + one history entry for a (gym, exercise) pair. */
  async function seedWeight(
    db: Dexie,
    gymId: number,
    exerciseId: number,
    value: number,
    unit = 'KG',
  ) {
    await db.table('weights').add({ gymId, exerciseId, value, unit })
    await db
      .table('weightHistory')
      .add({ gymId, exerciseId, value, unit, changedAt: value, kind: 'first' })
  }

  it('a single gym comes out fully global, with no exceptions', async () => {
    const v8 = await openV8()
    const a = (await v8.table('gyms').add({ name: 'A', createdAt: 1_000 })) as number
    const rosca = (await v8.table('exercises').add({ name: 'Rosca', categoryIds: [] })) as number
    const supino = (await v8.table('exercises').add({ name: 'Supino', categoryIds: [] })) as number
    await seedWeight(v8, a, rosca, 20)
    await seedWeight(v8, a, supino, 40)
    v8.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect(await db.weights.where('gymId').equals(a).count()).toBe(0)
      expect(await db.weightHistory.where('gymId').equals(a).count()).toBe(0)
      expect(await resolveWeight(a, rosca, db)).toMatchObject({
        scope: 'global',
        weight: { value: 20 },
      })
      expect(await resolveWeight(a, supino, db)).toMatchObject({
        scope: 'global',
        weight: { value: 40 },
      })
    } finally {
      db.close()
    }
  })

  it('promotes the oldest gym that has the exercise, per exercise', async () => {
    const v8 = await openV8()
    const a = (await v8.table('gyms').add({ name: 'A', createdAt: 1_000 })) as number
    const b = (await v8.table('gyms').add({ name: 'B', createdAt: 2_000 })) as number
    const rosca = (await v8.table('exercises').add({ name: 'Rosca', categoryIds: [] })) as number
    const supino = (await v8.table('exercises').add({ name: 'Supino', categoryIds: [] })) as number
    await seedWeight(v8, a, rosca, 20)
    await seedWeight(v8, b, rosca, 15, 'LB')
    // Only the NEWER gym has this one — it still has to end up global.
    await seedWeight(v8, b, supino, 40)
    v8.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      // Rosca: A wins the global slot, B keeps its row as an exception.
      expect(await resolveWeight(a, rosca, db)).toMatchObject({
        scope: 'global',
        weight: { value: 20, unit: 'KG' },
      })
      expect(await resolveWeight(b, rosca, db)).toMatchObject({
        scope: 'gym',
        weight: { value: 15, unit: 'LB' },
      })
      // Supino: nobody older had it, so B's row is the global one.
      expect(await resolveWeight(b, supino, db)).toMatchObject({
        scope: 'global',
        weight: { value: 40 },
      })
      expect(await resolveWeight(a, supino, db)).toMatchObject({ scope: 'global' })
    } finally {
      db.close()
    }
  })

  it('history travels with the promoted weight, and nothing is lost', async () => {
    const v8 = await openV8()
    const a = (await v8.table('gyms').add({ name: 'A', createdAt: 1_000 })) as number
    const b = (await v8.table('gyms').add({ name: 'B', createdAt: 2_000 })) as number
    const rosca = (await v8.table('exercises').add({ name: 'Rosca', categoryIds: [] })) as number
    await seedWeight(v8, a, rosca, 20)
    await v8
      .table('weightHistory')
      .add({ gymId: a, exerciseId: rosca, value: 22.5, unit: 'KG', changedAt: 30, kind: 'value' })
    await seedWeight(v8, b, rosca, 15)
    const weightsBefore = await v8.table('weights').count()
    const historyBefore = await v8.table('weightHistory').count()
    v8.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect(await db.weights.count()).toBe(weightsBefore)
      expect(await db.weightHistory.count()).toBe(historyBefore)
      // A's two entries are now the global timeline; B keeps its single one.
      expect(await db.weightHistory.where('gymId').equals(GLOBAL_GYM_ID).count()).toBe(2)
      expect(await db.weightHistory.where('gymId').equals(a).count()).toBe(0)
      expect(await db.weightHistory.where('gymId').equals(b).count()).toBe(1)
    } finally {
      db.close()
    }
  })

  it('a gym with no weights at all is left with nothing to promote', async () => {
    const v8 = await openV8()
    const a = (await v8.table('gyms').add({ name: 'A', createdAt: 1_000 })) as number
    const rosca = (await v8.table('exercises').add({ name: 'Rosca', categoryIds: [] })) as number
    v8.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect(await db.weights.count()).toBe(0)
      expect(await resolveWeight(a, rosca, db)).toMatchObject({ scope: 'global', weight: undefined })
    } finally {
      db.close()
    }
  })
})

describe('v10 migration: every exercise and session becomes strength', () => {
  let name: string
  beforeEach(() => {
    name = `mig10-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v9 — nothing knows about `kind` yet. */
  async function openV9() {
    const db = new Dexie(name)
    db.version(1).stores({
      gyms: '++id, name, createdAt',
      categories: '++id, &name',
      exercises: '++id, name, categoryId',
      days: '++id, name',
      weights: '++id, &[gymId+exerciseId], gymId, exerciseId',
      weightHistory: '++id, [gymId+exerciseId], gymId, exerciseId, changedAt',
    })
    db.version(2).stores({
      sessions: '++id, gymId, dayId, status, startedAt, completedAt',
      sessionEntries: '++id, sessionId, exerciseId',
    })
    db.version(3).stores({ exerciseNotes: '++id, &[gymId+exerciseId], gymId, exerciseId' })
    db.version(4).stores({})
    db.version(5).stores({ exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt' })
    db.version(6).stores({ exercises: '++id, name, *categoryIds' })
    db.version(7).stores({})
    db.version(8).stores({})
    db.version(9).stores({})
    await db.open()
    return db
  }

  it('backfills strength on exercises and sessions, keeping every record', async () => {
    const v9 = await openV9()
    const gym = (await v9.table('gyms').add({ name: 'A', createdAt: 1_000 })) as number
    await v9.table('exercises').add({ name: 'Supino', categoryIds: [], alternativeIds: [], warmupIds: [] })
    await v9.table('exercises').add({ name: 'Rosca', categoryIds: [], alternativeIds: [], warmupIds: [] })
    await v9
      .table('sessions')
      .add({ gymId: gym, dayName: 'Dia 1', startedAt: 1, completedAt: 2, status: 'completed' })
    v9.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      const sessions = await db.sessions.toArray()
      // Nothing added, nothing dropped — only a field filled in.
      expect(sessions).toHaveLength(1)
      expect(sessions[0].kind).toBe('strength')
      // The exercises this upgrade also backfilled are gone by v13, which
      // empties the catalog. The session is what still carries the evidence —
      // and it is the half that mattered, because a session's kind is a
      // snapshot nothing can recompute later.
      expect(await db.exercises.count()).toBe(0)
    } finally {
      db.close()
    }
  })

  it('makes `kind` an indexed query path', async () => {
    // Seeded on the current schema rather than through the upgrade: v13 empties
    // the catalog, so a row written before it could not be queried afterwards.
    // The index is what is under test here, not the backfill.
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      await db.exercises.add({
        name: 'Supino',
        kind: 'strength',
        categoryIds: [],
        alternativeIds: [],
        videos: [],
      })
      await db.exercises.add({
        name: 'Esteira',
        kind: 'cardio',
        categoryIds: [],
        alternativeIds: [],
        videos: [],
      })
      // where('kind') only works if v10 actually added the index.
      const cardio = await db.exercises.where('kind').equals('cardio').toArray()
      const strength = await db.exercises.where('kind').equals('strength').toArray()
      expect(cardio.map((e) => e.name)).toEqual(['Esteira'])
      expect(strength.map((e) => e.name)).toEqual(['Supino'])
    } finally {
      db.close()
    }
  })

  it('leaves an already-migrated database alone', async () => {
    const db = new MyOneGymDB(name)
    await db.open()
    await db.exercises.add({
      name: 'Esteira',
      kind: 'cardio',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    db.close()

    // Reopening runs no upgrade, but the assertion is the point: a cardio
    // exercise must never be flipped back to strength by a re-run.
    const again = new MyOneGymDB(name)
    await again.open()
    try {
      expect((await again.exercises.toArray())[0].kind).toBe('cardio')
    } finally {
      again.close()
    }
  })
})

describe('v12 migration: exercises gain an empty video list', () => {
  let name: string
  beforeEach(() => {
    name = `mig-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })



  it('leaves videos already stored alone on a re-run', async () => {
    const db = new MyOneGymDB(name)
    await db.open()
    const video = { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', startSec: 130 }
    await db.exercises.add({
      name: 'Supino',
      kind: 'strength',
      categoryIds: [],
      alternativeIds: [],
      videos: [video],
    })
    db.close()

    const again = new MyOneGymDB(name)
    await again.open()
    try {
      expect((await again.exercises.toArray())[0].videos).toEqual([video])
    } finally {
      again.close()
    }
  })
})

/**
 * v13: the catalog moves out of the database and into the bundle.
 *
 * The upgrade empties `exercises` and `categories` and rewrites **nothing
 * else**, which is only safe because the bundled file is an export of this very
 * database: the ids it carries are the ids the device already holds. So the
 * test that matters is not "were the rows deleted" — it is that every record
 * pointing at those ids came through **untouched**, and still names the same
 * movement when read through the official catalog.
 */
describe('v13 migration: the catalog moves to the bundle', () => {
  let name: string
  beforeEach(() => {
    name = `mig13-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v12 — the catalog still lives in it. */
  async function openV12() {
    const db = new Dexie(name)
    db.version(1).stores({
      gyms: '++id, name, createdAt',
      categories: '++id, &name',
      exercises: '++id, name, categoryId',
      days: '++id, name',
      weights: '++id, &[gymId+exerciseId], gymId, exerciseId',
      weightHistory: '++id, [gymId+exerciseId], gymId, exerciseId, changedAt',
    })
    db.version(2).stores({
      sessions: '++id, gymId, dayId, status, startedAt, completedAt',
      sessionEntries: '++id, sessionId, exerciseId',
    })
    db.version(3).stores({ exerciseNotes: '++id, &[gymId+exerciseId], gymId, exerciseId' })
    db.version(4).stores({})
    db.version(5).stores({ exercisePhotos: '++id, [gymId+exerciseId], gymId, exerciseId, createdAt' })
    db.version(6).stores({ exercises: '++id, name, *categoryIds' })
    db.version(7).stores({})
    db.version(8).stores({})
    db.version(9).stores({})
    db.version(10).stores({ exercises: '++id, name, kind, *categoryIds' })
    db.version(11).stores({
      warmups: '++id, name',
      exercises: '++id, name, kind, *categoryIds, *warmupIds',
    })
    db.version(12).stores({})
    await db.open()
    return db
  }

  /**
   * A device mid-use, seeded with the ids the official file actually carries:
   * 1 = "Supino Reto com Barra", 14 = "Rosca Direta com Barra".
   */
  async function seedDeviceInUse() {
    const v12 = await openV12()
    const gym = (await v12.table('gyms').add({ name: 'Academia A', createdAt: 1 })) as number
    await v12.table('categories').add({ id: 1, name: 'Peito' })
    await v12.table('exercises').add({
      id: 1,
      name: 'Supino Reto com Barra',
      kind: 'strength',
      categoryIds: [1],
      alternativeIds: [],
      videos: [],
    })
    await v12.table('exercises').add({
      id: 14,
      name: 'Rosca Direta com Barra',
      kind: 'strength',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    const day = (await v12.table('days').add({ name: 'Dia 1', exerciseIds: [1, 14] })) as number
    await v12.table('weights').add({ gymId: GLOBAL_GYM_ID, exerciseId: 1, value: 60, unit: 'KG' })
    await v12.table('weights').add({ gymId: gym, exerciseId: 1, value: 57.5, unit: 'KG' })
    for (const value of [40, 50, 60]) {
      await v12.table('weightHistory').add({
        gymId: GLOBAL_GYM_ID,
        exerciseId: 1,
        value,
        unit: 'KG',
        changedAt: value,
        kind: 'value',
      })
    }
    await v12
      .table('exerciseNotes')
      .add({ gymId: gym, exerciseId: 1, text: 'banco no 4', updatedAt: 1 })
    await v12.table('exercisePhotos').add({
      gymId: gym,
      exerciseId: 14,
      bytes: new ArrayBuffer(4),
      type: 'image/jpeg',
      width: 2,
      height: 2,
      createdAt: 1,
    })
    const session = (await v12.table('sessions').add({
      gymId: gym,
      kind: 'strength',
      dayId: day,
      dayName: 'Dia 1',
      startedAt: 1,
      completedAt: 2,
      status: 'completed',
    })) as number
    await v12
      .table('sessionEntries')
      .add({ sessionId: session, exerciseId: 1, exerciseName: 'Supino Reto com Barra', done: true })
    v12.close()
    return { gym, day }
  }

  it('empties the catalog tables', async () => {
    await seedDeviceInUse()
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect(await db.exercises.count()).toBe(0)
      expect(await db.categories.count()).toBe(0)
    } finally {
      db.close()
    }
  })

  it('rewrites no reference at all', async () => {
    const { gym, day } = await seedDeviceInUse()
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect((await db.days.get(day))?.exerciseIds).toEqual([1, 14])

      const weights = await db.weights.toArray()
      expect(weights.map((w) => [w.gymId, w.exerciseId, w.value])).toEqual(
        expect.arrayContaining([
          [GLOBAL_GYM_ID, 1, 60],
          [gym, 1, 57.5],
        ]),
      )
      expect(await db.weightHistory.where('exerciseId').equals(1).count()).toBe(3)
      expect((await db.exerciseNotes.toArray())[0]).toMatchObject({ exerciseId: 1, text: 'banco no 4' })
      expect((await db.exercisePhotos.toArray())[0]).toMatchObject({ exerciseId: 14 })
      expect((await db.sessionEntries.toArray())[0]).toMatchObject({
        exerciseId: 1,
        exerciseName: 'Supino Reto com Barra',
      })
      expect(await db.gyms.count()).toBe(1)
      expect(await db.sessions.count()).toBe(1)
    } finally {
      db.close()
    }
  })

  it('still resolves every id, now against the bundled catalog', async () => {
    const { day } = await seedDeviceInUse()
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      const ids = (await db.days.get(day))!.exerciseIds
      const names = await Promise.all(ids.map(async (id) => (await getExercise(id, db))?.name))
      // The same movements the device had before the upgrade — read from the
      // bundle now instead of from a row.
      expect(names).toEqual(['Supino Reto com Barra', 'Rosca Direta com Barra'])
      expect((await resolveWeight(GLOBAL_GYM_ID, 1, db)).weight?.value).toBe(60)
    } finally {
      db.close()
    }
  })

  it('gives a newly created exercise an id above the official range', async () => {
    await seedDeviceInUse()
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      // The key generator is NOT reset by clearing a store, so without an
      // explicit assignment this would come back as 15 — inside the range a
      // future catalog entry could claim.
      const id = await createExercise({ name: 'Supino Caseiro' }, db)
      expect(id).toBeGreaterThan(USER_ID_BASE)
      expect(await createCategory('Antebraço', db)).toBeGreaterThan(USER_ID_BASE)
    } finally {
      db.close()
    }
  })

  it('leaves an exercise the catalog does not carry unresolvable, without deleting its data', async () => {
    const v12 = await openV12()
    const gym = (await v12.table('gyms').add({ name: 'A', createdAt: 1 })) as number
    // 9998 is inside the official range but is not in the file: an exercise the
    // user created back when the catalog was theirs.
    await v12.table('exercises').add({
      id: 9998,
      name: 'Invenção minha',
      kind: 'strength',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    await v12.table('weights').add({ gymId: gym, exerciseId: 9998, value: 30, unit: 'KG' })
    v12.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect(await getExercise(9998, db)).toBeUndefined()
      // The weight is NOT deleted: dropping a user's records over an id that
      // did not match is the one outcome here with no way back.
      expect(await db.weights.where('exerciseId').equals(9998).count()).toBe(1)
    } finally {
      db.close()
    }
  })
})
