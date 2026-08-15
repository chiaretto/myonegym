import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import { migrateLegacyPhotos, readPhotoBlob, resolveWeight } from './repos'
import { GLOBAL_GYM_ID } from './types'

/**
 * v6 migration: an exercise's single `categoryId` becomes a `categoryIds` list,
 * and the reserved "Sem categoria" category is deleted (uncategorized is now an
 * empty list). Seeds a **v5** database with the old shape, then opens the real
 * (v6) schema on the same name so the upgrade runs, and checks the result.
 */
describe('v6 migration: categoryId → categoryIds, retire reserved', () => {
  let name: string
  beforeEach(() => {
    name = `mig-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v5, with the OLD exercise schema. */
  async function openV5() {
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
    await db.open()
    return db
  }

  it('converts each exercise and deletes the reserved category', async () => {
    const v5 = await openV5()
    const peito = (await v5.table('categories').add({ name: 'Peito' })) as number
    const reserved = (await v5
      .table('categories')
      .add({ name: 'Sem categoria', reserved: true })) as number
    const categorized = (await v5
      .table('exercises')
      .add({ name: 'Supino', categoryId: peito })) as number
    const onReserved = (await v5
      .table('exercises')
      .add({ name: 'Alongamento', categoryId: reserved })) as number
    const unset = (await v5.table('exercises').add({ name: 'Prancha' })) as number
    v5.close()

    // Open the real schema (v6) on the same DB → the upgrade runs.
    const db = new MyOneGymDB(name)
    await db.open()
    try {
      const cat = await db.exercises.get(categorized)
      const res = await db.exercises.get(onReserved)
      const un = await db.exercises.get(unset)

      expect(cat?.categoryIds).toEqual([peito]) // real category preserved
      expect(res?.categoryIds).toEqual([]) // reserved bucket → uncategorized
      expect(un?.categoryIds).toEqual([]) // never-set → uncategorized
      // Old field is gone on every exercise.
      for (const e of [cat, res, un]) expect('categoryId' in (e as object)).toBe(false)

      // The reserved category record is deleted; the real one remains.
      expect(await db.categories.get(reserved)).toBeUndefined()
      expect(await db.categories.get(peito)).toBeDefined()
    } finally {
      db.close()
    }
  })

  it('the multiEntry index answers "exercises in category X"', async () => {
    const v5 = await openV5()
    const peito = (await v5.table('categories').add({ name: 'Peito' })) as number
    await v5.table('exercises').add({ name: 'Supino', categoryId: peito })
    v5.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      // Add a compound exercise post-migration and query by the indexed path.
      const triceps = await db.categories.add({ name: 'Tríceps' })
      await db.exercises.add({ name: 'Mergulho', categoryIds: [peito, triceps], alternativeIds: [] })
      const inPeito = await db.exercises.where('categoryIds').equals(peito).toArray()
      expect(inPeito.map((e) => e.name).sort()).toEqual(['Mergulho', 'Supino'])
    } finally {
      db.close()
    }
  })
})

/**
 * v7 migration: every exercise gains an empty `alternativeIds`. Additive — a
 * database that predates alternatives must come out behaving exactly as before,
 * with the field present so nothing has to guess at read time.
 */
describe('v7 migration: exercises gain alternativeIds', () => {
  let name: string
  beforeEach(() => {
    name = `mig7-${Date.now()}-${Math.floor(performance.now())}`
  })
  afterEach(async () => {
    await Dexie.delete(name)
  })

  /** Open a Dexie declaring only up to v6 — exercises with no alternatives. */
  async function openV6() {
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
    await db.open()
    return db
  }

  it('gives every existing exercise an empty set', async () => {
    const v6 = await openV6()
    const supino = (await v6.table('exercises').add({ name: 'Supino', categoryIds: [1] })) as number
    const rosca = (await v6.table('exercises').add({ name: 'Rosca', categoryIds: [] })) as number
    v6.close()

    const db = new MyOneGymDB(name)
    await db.open()
    try {
      expect((await db.exercises.get(supino))?.alternativeIds).toEqual([])
      expect((await db.exercises.get(rosca))?.alternativeIds).toEqual([])
      // Nothing else about the exercise moved.
      expect((await db.exercises.get(supino))?.categoryIds).toEqual([1])
    } finally {
      db.close()
    }
  })
})

/**
 * v8: a photo's image moves out of its record and into a file. The upgrade
 * itself must do **nothing** to existing photos — OPFS cannot join an IndexedDB
 * transaction — so they have to come through it untouched and still readable,
 * and only then be moved by `migrateLegacyPhotos`.
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
