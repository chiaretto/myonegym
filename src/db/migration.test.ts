import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'

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
      await db.exercises.add({ name: 'Mergulho', categoryIds: [peito, triceps] })
      const inPeito = await db.exercises.where('categoryIds').equals(peito).toArray()
      expect(inPeito.map((e) => e.name).sort()).toEqual(['Mergulho', 'Supino'])
    } finally {
      db.close()
    }
  })
})
