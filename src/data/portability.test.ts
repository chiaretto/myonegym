import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from '../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  createCategory,
  getNote,
  listSessionEntries,
  saveNote,
  saveWeight,
  setEntryDone,
  startSession,
} from '../db/repos'
import {
  exportBackup,
  generateExample,
  importBackupReplaceAll,
  parseBackup,
  PortabilityError,
  resetAll,
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

describe('backup includes per-gym exercise notes', () => {
  it('exports notes and round-trips them (wipe -> import restores)', async () => {
    const { g, ex } = await seed()
    await saveNote(g, ex, 'manter cotovelo fixo', d)

    const doc = await exportBackup(d)
    expect(doc.exerciseNotes).toHaveLength(1)
    expect(doc.exerciseNotes[0]).toMatchObject({ gymId: g, exerciseId: ex, text: 'manter cotovelo fixo' })

    // wipe everything (incl. notes) then restore
    await Promise.all(
      [d.gyms, d.categories, d.exercises, d.days, d.weights, d.weightHistory, d.exerciseNotes].map((t) =>
        t.clear(),
      ),
    )
    expect(await d.exerciseNotes.count()).toBe(0)

    await importBackupReplaceAll(doc, d)
    expect((await getNote(g, ex, d))?.text).toBe('manter cotovelo fixo')
  })

  it('older backup without exerciseNotes imports as zero notes', async () => {
    const { g, ex } = await seed()
    await saveNote(g, ex, 'temporária', d)
    const doc = await exportBackup(d)

    // simulate a pre-notes backup: drop the field entirely
    const legacy = JSON.parse(JSON.stringify(doc))
    delete legacy.exerciseNotes
    const parsed = parseBackup(JSON.stringify(legacy))
    expect(parsed.exerciseNotes).toEqual([]) // defaulted, not rejected

    await importBackupReplaceAll(parsed, d)
    expect(await d.exerciseNotes.count()).toBe(0)
    expect(await d.gyms.count()).toBe(1) // the rest still imports fine
  })
})

describe('generate example', () => {
  it('creates the bundled sample routine (gym, categories, exercises, days, weights)', async () => {
    await generateExample(d)
    expect(await d.categories.count()).toBe(8)
    expect(await d.exercises.count()).toBe(27)
    expect(await d.days.count()).toBe(6)
    expect(await d.gyms.count()).toBe(1)
    expect((await d.gyms.toArray())[0].name).toBe('Fit Park')
    expect(await d.weights.count()).toBe(18)
    // exercises carry media; day categories are derived (day has no categoryId)
    expect((await d.exercises.toArray()).some((e) => e.mediaUrl)).toBe(true)
    expect((await d.days.toArray()).every((day) => !('categoryId' in day))).toBe(true)
  })

  it('is additive and reference-safe with existing data (remapped ids)', async () => {
    // Pre-existing category (shared name) + a gym, so the run must dedup + skip gym.
    await createCategory('Peito', d)
    await createGym('Casa', undefined, d)
    await generateExample(d)
    // "Peito" not duplicated; a fresh gym is NOT added (one already existed)
    expect((await d.categories.where('name').equalsIgnoreCase('Peito').count())).toBe(1)
    expect(await d.gyms.count()).toBe(1)
    // day → exercise references all resolve to real exercises
    const exIds = new Set((await d.exercises.toArray()).map((e) => e.id))
    for (const day of await d.days.toArray()) {
      for (const id of day.exerciseIds) expect(exIds.has(id)).toBe(true)
    }
  })
})

describe('device-local onboarding flag is never part of a backup', () => {
  it('exportBackup carries no trace of the first-launch prompt flag', async () => {
    await seed()
    const doc = await exportBackup(d)
    expect('hasSeenExamplePrompt' in doc).toBe(false)
    expect(JSON.stringify(doc)).not.toContain('hasSeenExamplePrompt')
  })

  it('importBackupReplaceAll ignores an unexpected onboarding field, same as sessions', async () => {
    await seed()
    const doc = await exportBackup(d)
    const legacy = JSON.parse(JSON.stringify(doc))
    legacy.hasSeenExamplePrompt = false
    await expect(
      importBackupReplaceAll(parseBackup(JSON.stringify(legacy)), d),
    ).resolves.not.toThrow()
    expect(await d.gyms.count()).toBe(1) // the rest still imports fine
  })
})

describe('resetAll', () => {
  it('empties every table (gyms, categories, exercises, days, weights, weightHistory, sessions, sessionEntries)', async () => {
    const { g } = await seed()
    const day = (await d.days.toArray())[0].id!
    const sid = await startSession(g, day, d)
    await setEntryDone((await listSessionEntries(sid, d))[0].id!, true, d)
    await completeSession(sid, d)
    expect(await d.gyms.count()).toBeGreaterThan(0)
    expect(await d.weightHistory.count()).toBeGreaterThan(0)
    expect(await d.sessions.count()).toBeGreaterThan(0)

    await resetAll(d)

    expect(await d.gyms.count()).toBe(0)
    expect(await d.categories.count()).toBe(0)
    expect(await d.exercises.count()).toBe(0)
    expect(await d.days.count()).toBe(0)
    expect(await d.weights.count()).toBe(0)
    expect(await d.weightHistory.count()).toBe(0)
    expect(await d.sessions.count()).toBe(0)
    expect(await d.sessionEntries.count()).toBe(0)
  })

  it('leaves the DB usable afterwards — generateExample runs again without error', async () => {
    await seed()
    await resetAll(d)
    await expect(generateExample(d)).resolves.not.toThrow()
    expect(await d.gyms.count()).toBe(1)
    expect(await d.categories.count()).toBe(8)
  })
})

describe('backup excludes workout sessions (device-local)', () => {
  async function seedWithSession() {
    const { g, ex } = await seed()
    const day = (await d.days.toArray())[0].id!
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    await setEntryDone(entries[0].id!, true, d)
    await completeSession(sid, d)
    return { g, ex, sid }
  }

  it('does not export sessions or entries', async () => {
    await seedWithSession()
    const doc = await exportBackup(d)
    expect('sessions' in doc).toBe(false)
    expect('sessionEntries' in doc).toBe(false)
    expect(JSON.stringify(doc)).not.toContain('sessionId')
    expect(JSON.stringify(doc)).not.toContain('startedAt')
  })

  it('import does not restore sessions (they stay device-local, like history)', async () => {
    // Even if an older backup happens to carry sessions, they are ignored.
    await seedWithSession()
    const doc = await exportBackup(d)
    const legacy = JSON.parse(JSON.stringify(doc))
    legacy.sessions = [{ id: 99, gymId: 1, dayName: 'X', startedAt: 1, status: 'completed' }]
    legacy.sessionEntries = [{ id: 99, sessionId: 99, exerciseName: 'Y', done: true }]

    await importBackupReplaceAll(parseBackup(JSON.stringify(legacy)), d)
    expect(await d.sessions.count()).toBe(0)
    expect(await d.sessionEntries.count()).toBe(0)
    expect(await d.gyms.count()).toBe(1) // the rest still imports
  })
})
