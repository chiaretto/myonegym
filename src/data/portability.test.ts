import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { allTables, MyOneGymDB } from '../db/db'
import {
  addPhoto,
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
  const ex = await createExercise({ name: 'Supino', mediaUrl: 'https://x.com/s.gif', categoryIds: [cat] }, d)
  await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
  await saveWeight(g, ex, 40, 'KG', d)
  await saveWeight(g, ex, 42.5, 'KG', d) // creates history
  return { cat, g, ex }
}

describe('backup export/import', () => {
  it('exports the current weight AND its full history', async () => {
    const { g, ex } = await seed() // saveWeight twice → 2 history entries
    const doc = await exportBackup(d)
    expect(doc.weights).toHaveLength(1)
    expect(doc.weights[0]).toMatchObject({ gymId: g, exerciseId: ex, value: 42.5, unit: 'KG' })
    expect(doc.weightHistory.length).toBe(await d.weightHistory.count())
    expect(doc.weightHistory.length).toBeGreaterThan(0)
    expect(JSON.stringify(doc)).toContain('changedAt')
  })

  it('round-trip: export -> wipe -> import restores current data AND history', async () => {
    await seed()
    const historyBefore = await d.weightHistory.count()
    const doc = await exportBackup(d)

    // wipe everything
    await Promise.all([d.gyms, d.categories, d.exercises, d.days, d.weights, d.weightHistory].map((t) => t.clear()))
    expect(await d.exercises.count()).toBe(0)

    await importBackupReplaceAll(doc, d)
    expect(await d.gyms.count()).toBe(1)
    expect(await d.exercises.count()).toBe(1)
    expect(await d.days.count()).toBe(1)
    expect((await d.weights.toArray())[0].value).toBe(42.5)
    // history is restored now, not dropped
    expect(await d.weightHistory.count()).toBe(historyBefore)
    expect(historyBefore).toBeGreaterThan(0)
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

describe('exercise categories: multi-category and back-compat', () => {
  it('round-trips an exercise with multiple categories', async () => {
    const peito = await createCategory('Peito', d)
    const triceps = await createCategory('Tríceps', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peito, triceps] }, d)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    expect((await d.exercises.get(ex))?.categoryIds).toEqual([peito, triceps])
  })

  it('imports a pre-multi-category backup (singular categoryId + reserved bucket)', async () => {
    const peito = await createCategory('Peito', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peito] }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>

    // Rewrite the doc to look like an OLD backup: singular categoryId, a reserved
    // "Sem categoria" category, and an exercise pointing at it.
    const cats = doc.categories as Record<string, unknown>[]
    const reservedId = 9999
    cats.push({ id: reservedId, name: 'Sem categoria', reserved: true })
    const exs = doc.exercises as Record<string, unknown>[]
    exs[0] = { id: exs[0].id, name: 'Supino', categoryId: peito }
    exs.push({ id: 8888, name: 'Alongamento', categoryId: reservedId })

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    // Singular → one-element list; reserved category dropped, its ref emptied.
    expect((await d.exercises.get(ex))?.categoryIds).toEqual([peito])
    expect((await d.exercises.get(8888))?.categoryIds).toEqual([])
    expect(await d.categories.get(reservedId)).toBeUndefined()
    expect((await d.categories.toArray()).some((c) => c.name === 'Sem categoria')).toBe(false)
  })
})

describe('full backup is a complete snapshot', () => {
  /** Seed one of everything, then export/JSON/parse/wipe/import and compare. */
  async function seedEverything() {
    const g = await createGym('Academia A', undefined, d)
    const cat = await createCategory('Peito', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [cat] }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 40, 'KG', d)
    await saveWeight(g, ex, 42.5, 'KG', d) // history
    await saveNote(g, ex, 'cotovelo fixo', d)
    await addPhoto(g, ex, new Uint8Array([9, 8, 7, 200, 255]).buffer as ArrayBuffer, 'image/jpeg', 100, 80, d)
    const sid = await startSession(g, day, d)
    await setEntryDone((await listSessionEntries(sid, d))[0].id!, true, d)
    await completeSession(sid, d)
    return { g, ex, day, sid }
  }

  const counts = async () =>
    Object.fromEntries(
      await Promise.all(
        allTables(d).map(async (t) => [t.name, await t.count()] as const),
      ),
    )

  it('restores every table identically after a JSON round-trip', async () => {
    await seedEverything()
    const before = await counts()
    // Every table has at least one row, or the test proves nothing.
    for (const [name, n] of Object.entries(before)) expect(n, name).toBeGreaterThan(0)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    expect(Object.values(await counts()).every((n) => n === 0)).toBe(true)

    await importBackupReplaceAll(doc, d)
    expect(await counts()).toEqual(before)
  })

  it("restores a photo's exercise reference (ids preserved)", async () => {
    const { ex } = await seedEverything()
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    const photo = (await d.exercisePhotos.toArray())[0]
    expect(photo.exerciseId).toBe(ex)
    expect(await d.exercises.get(ex)).toBeDefined() // the exercise it points at is really there
  })

  it('imports a pre-v4 backup (no history/sessions/photos keys) cleanly', async () => {
    await seedEverything()
    const doc = JSON.parse(JSON.stringify(await exportBackup(d)))
    // Simulate an old backup: strip the tables v4 added.
    delete doc.weightHistory
    delete doc.sessions
    delete doc.sessionEntries
    delete doc.exercisePhotos
    doc.version = 3

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)
    expect(await d.gyms.count()).toBe(1)
    expect(await d.exercises.count()).toBe(1)
    expect(await d.weights.count()).toBe(1)
    // The stripped tables restore empty, not with an error.
    expect(await d.weightHistory.count()).toBe(0)
    expect(await d.sessions.count()).toBe(0)
    expect(await d.exercisePhotos.count()).toBe(0)
  })
})

describe('exercise photos are part of the backup', () => {
  /** Distinctive bytes so a round-trip can be checked exactly. */
  const photoBytes = () => new Uint8Array([0, 1, 2, 253, 254, 255, 128, 7]).buffer as ArrayBuffer

  it('exports photos base64-encoded', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photoBytes(), 'image/jpeg', 1600, 1200, d)

    const doc = await exportBackup(d)
    expect(doc.exercisePhotos).toHaveLength(1)
    const p = doc.exercisePhotos[0]
    expect(p).toMatchObject({ gymId: g, exerciseId: ex, type: 'image/jpeg', width: 1600, height: 1200 })
    expect(typeof p.bytes).toBe('string') // base64, not an ArrayBuffer
    expect(p.bytes.length).toBeGreaterThan(0)
  })

  it('round-trips a photo byte-for-byte through export -> wipe -> import', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photoBytes(), 'image/png', 800, 600, d)

    const doc = await exportBackup(d)
    // serialize + parse, so the base64 really goes through JSON like a real backup
    const restored = parseBackup(JSON.stringify(doc))
    await Promise.all([d.gyms, d.exercises, d.exercisePhotos].map((t) => t.clear()))
    await importBackupReplaceAll(restored, d)

    const [back] = await d.exercisePhotos.toArray()
    expect(back).toMatchObject({ gymId: g, exerciseId: ex, type: 'image/png', width: 800, height: 600 })
    expect([...new Uint8Array(back.bytes)]).toEqual([0, 1, 2, 253, 254, 255, 128, 7])
  })

  it('resetAll clears photos', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photoBytes(), 'image/jpeg', 1600, 1200, d)
    await resetAll(d)
    expect(await d.exercisePhotos.count()).toBe(0)
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

  it('exports sessions and their entries with done states', async () => {
    const { sid } = await seedWithSession()
    const doc = await exportBackup(d)
    expect(doc.sessions.map((s) => s.id)).toContain(sid)
    expect(doc.sessions[0].status).toBe('completed')
    expect(doc.sessionEntries.some((e) => e.sessionId === sid && e.done)).toBe(true)
  })

  it('round-trip restores sessions and keeps entry→session references valid', async () => {
    const { sid } = await seedWithSession()
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)

    await importBackupReplaceAll(doc, d)
    const session = await d.sessions.get(sid)
    expect(session?.status).toBe('completed')
    // The entry still points at the restored session (original ids preserved).
    const entries = await listSessionEntries(sid, d)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((e) => e.done)).toBe(true)
  })
})
