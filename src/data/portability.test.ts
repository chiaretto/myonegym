import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from '../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  createCategory,
  listSessionEntries,
  saveWeight,
  setEntryDone,
  startSession,
} from '../db/repos'
import {
  exportBackup,
  exportExercisesShare,
  generateExample,
  importBackupReplaceAll,
  importExercisesMerge,
  parseBackup,
  PortabilityError,
} from './portability'

let d: MyOneGymDB
let n = 0
beforeEach(async () => {
  d = new MyOneGymDB(`ptest-${Date.now()}-${n++}`)
  await d.open()
})
afterEach(async () => {
  await d.delete()
})

async function seed() {
  const cat = await createCategory('Peito', d)
  const g = await createGym('A', undefined, d)
  const ex = await createExercise({ name: 'Supino', mediaUrl: 'https://x.com/s.gif', categoryId: cat }, d)
  await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
  await saveWeight(g, ex, 40, 'KG', d)
  await saveWeight(g, ex, 42.5, 'KG', d) // creates history
  return { cat, g, ex }
}

describe('backup export/import', () => {
  it('export excludes weight history but keeps current weight', async () => {
    const { g, ex } = await seed()
    const doc = await exportBackup(d)
    expect(doc.weights).toHaveLength(1)
    expect(doc.weights[0]).toMatchObject({ gymId: g, exerciseId: ex, value: 42.5, unit: 'KG' })
    // no history field of any kind in the document
    expect('weightHistory' in doc).toBe(false)
    expect(JSON.stringify(doc)).not.toContain('changedAt')
  })

  it('round-trip: export -> wipe -> import restores current data', async () => {
    await seed()
    const doc = await exportBackup(d)

    // wipe everything
    await Promise.all([d.gyms, d.categories, d.exercises, d.days, d.weights, d.weightHistory].map((t) => t.clear()))
    expect(await d.exercises.count()).toBe(0)

    await importBackupReplaceAll(doc, d)
    expect(await d.gyms.count()).toBe(1)
    expect(await d.exercises.count()).toBe(1)
    expect(await d.days.count()).toBe(1)
    expect((await d.weights.toArray())[0].value).toBe(42.5)
    // history starts empty on the imported side
    expect(await d.weightHistory.count()).toBe(0)
  })

  it('import replaces all existing data', async () => {
    await seed() // gym "A"
    const doc = await exportBackup(d)
    // mutate: add gym B
    await createGym('B', undefined, d)
    expect(await d.gyms.count()).toBe(2)
    // importing the old doc should replace, leaving only "A"
    await importBackupReplaceAll(doc, d)
    const gyms = await d.gyms.toArray()
    expect(gyms).toHaveLength(1)
    expect(gyms[0].name).toBe('A')
  })

  it('rejects malformed JSON without touching data', async () => {
    await seed()
    expect(() => parseBackup('not json')).toThrow(PortabilityError)
    expect(() => parseBackup('{"app":"other"}')).toThrow(PortabilityError)
    expect(await d.gyms.count()).toBe(1) // untouched
  })

  it('imports a legacy day that still carries categoryId (ignored)', async () => {
    await seed() // creates "Dia 1"
    const doc = await exportBackup(d)
    // simulate a pre-change day record with the removed manual category field
    const legacy = JSON.parse(JSON.stringify(doc))
    legacy.days[0].categoryId = 999
    await importBackupReplaceAll(parseBackup(JSON.stringify(legacy)), d)
    expect(await d.days.count()).toBe(1) // imports fine; categoryId is ignored
    expect((await d.days.toArray())[0].name).toBe('Dia 1')
  })
})

describe('exercises share', () => {
  it('share doc has no gyms or weights', async () => {
    await seed()
    const doc = await exportExercisesShare(d)
    expect(doc.kind).toBe('exercises')
    expect(doc.exercises).toHaveLength(1)
    expect(JSON.stringify(doc)).not.toContain('gymId')
    expect(JSON.stringify(doc)).not.toContain('"value"')
  })

  it('merge adds exercises+categories without touching gyms/weights', async () => {
    const { g } = await seed()
    const share = await exportExercisesShare(d)

    // fresh db as "another user" with an existing gym + weight
    const other = new MyOneGymDB(`ptest-other-${n++}`)
    await other.open()
    const og = await createGym('Casa', undefined, other)
    const oex = await createExercise({ name: 'Local' }, other)
    await saveWeight(og, oex, 10, 'KG', other)

    const added = await importExercisesMerge(share, other)
    expect(added).toBe(1)
    expect(await other.exercises.count()).toBe(2) // Local + Supino
    expect(await other.gyms.count()).toBe(1) // gyms untouched
    expect((await other.weights.toArray())[0].value).toBe(10) // weights untouched
    expect(g).toBeGreaterThan(0)
    await other.delete()
  })
})

describe('generate example', () => {
  it('creates a usable routine with days and a gym', async () => {
    await generateExample(d)
    expect(await d.categories.count()).toBeGreaterThanOrEqual(5)
    expect((await d.days.toArray()).length).toBe(3)
    expect(await d.gyms.count()).toBe(1)
    expect(await d.weights.count()).toBeGreaterThan(0)
  })
})

describe('backup includes workout sessions', () => {
  async function seedWithSession() {
    const { g, ex } = await seed()
    const day = (await d.days.toArray())[0].id!
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    await setEntryDone(entries[0].id!, true, d)
    await completeSession(sid, d)
    return { g, ex, sid }
  }

  it('exports sessions and their entries', async () => {
    await seedWithSession()
    const doc = await exportBackup(d)
    expect(doc.sessions).toHaveLength(1)
    expect(doc.sessionEntries).toHaveLength(1)
    expect(doc.sessions[0].status).toBe('completed')
    expect(doc.sessionEntries[0].done).toBe(true)
  })

  it('round-trips sessions through export -> wipe -> import', async () => {
    await seedWithSession()
    const doc = await exportBackup(d)
    await Promise.all(
      [d.gyms, d.categories, d.exercises, d.days, d.weights, d.weightHistory, d.sessions, d.sessionEntries].map(
        (t) => t.clear(),
      ),
    )
    await importBackupReplaceAll(doc, d)
    expect(await d.sessions.count()).toBe(1)
    expect(await d.sessionEntries.count()).toBe(1)
    expect((await d.sessions.toArray())[0].dayName).toBe('Dia 1')
  })

  it('imports an older backup (no sessions field) as zero sessions', async () => {
    await seed()
    const doc = await exportBackup(d)
    // simulate a pre-v2 document: strip the session fields entirely
    const legacy = JSON.parse(JSON.stringify(doc))
    delete legacy.sessions
    delete legacy.sessionEntries
    const parsed = parseBackup(JSON.stringify(legacy))
    expect(parsed.sessions).toEqual([])
    await importBackupReplaceAll(parsed, d)
    expect(await d.sessions.count()).toBe(0)
    expect(await d.gyms.count()).toBe(1) // rest still imports
  })
})
