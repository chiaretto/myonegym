import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { allTables, MyOneGymDB } from '../db/db'
import { storedPhotoFiles, withoutOpfs } from '../test/memoryOpfs'
import { removeImage } from './photoStore'
import {
  addPhoto,
  readPhotoBlob,
  completeSession,
  createDay,
  createExercise,
  createGym,
  createCategory,
  getNote,
  listSessionEntries,
  saveNote,
  saveWeight,
  setAlternatives,
  setEntryDone,
  startSession,
  swapEntryExercise,
} from '../db/repos'
import {
  exportBackup,
  generateExample,
  SCHEMA_VERSION,
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

describe('exercise alternatives survive a backup', () => {
  const setsOf = async (ids: number[]) =>
    Promise.all(ids.map(async (id) => (await d.exercises.get(id))?.alternativeIds))

  /** export → JSON → parse → wipe → import, the way a real restore goes. */
  async function roundTrip() {
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)
  }

  it('round-trips one exercise heading two unrelated variations', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const cruc = await createExercise({ name: 'Crucifixo' }, d)
    await setAlternatives(reto, [maq, cruc], d)

    await roundTrip()

    // The machine and the fly must NOT come back as alternatives of each other.
    expect(await setsOf([reto, maq, cruc])).toEqual([[maq, cruc], [reto], [reto]])
  })

  it("round-trips a session entry's swapped exercise", async () => {
    const g = await createGym('A', undefined, d)
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    await setAlternatives(reto, [maq], d)
    // Only the barbell is in the day; the machine is reached by swapping.
    const day = await createDay({ name: 'Dia 1', exerciseIds: [reto] }, d)
    const sid = await startSession(g, day, d)
    const [entry] = await listSessionEntries(sid, d)
    await swapEntryExercise(entry.id!, maq, d)
    await setEntryDone(entry.id!, true, d)
    await completeSession(sid, d)

    await roundTrip()

    const [restored] = await listSessionEntries(sid, d)
    expect(restored.exerciseId).toBe(maq)
    expect(restored.exerciseName).toBe('Supino Máquina')
    expect(restored.done).toBe(true)
  })

  it('imports a backup made before alternatives existed', async () => {
    const ex = await createExercise({ name: 'Supino' }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    for (const e of doc.exercises as Record<string, unknown>[]) delete e.alternativeIds

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect((await d.exercises.get(ex))?.alternativeIds).toEqual([])
  })

  it('drops a reference to an exercise the backup does not contain', async () => {
    const ex = await createExercise({ name: 'Supino' }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    ;(doc.exercises as Record<string, unknown>[])[0].alternativeIds = [7777]

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    // Repaired, not rejected: a dangling id is not worth failing a restore over.
    expect((await d.exercises.get(ex))?.alternativeIds).toEqual([])
  })

  it('mirrors a link that only points one way', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    const exs = doc.exercises as Record<string, unknown>[]
    exs.find((e) => e.id === reto)!.alternativeIds = [maq]
    exs.find((e) => e.id === maq)!.alternativeIds = []

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect(await setsOf([reto, maq])).toEqual([[maq], [reto]])
  })

  it('ignores an exercise listing itself', async () => {
    const ex = await createExercise({ name: 'Supino' }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    ;(doc.exercises as Record<string, unknown>[])[0].alternativeIds = [ex]

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect((await d.exercises.get(ex))?.alternativeIds).toEqual([])
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
    await addPhoto(g, ex, new Blob([new Uint8Array([9, 8, 7, 200, 255])], { type: 'image/jpeg' }), 100, 80, d)
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
  const PHOTO = [0, 1, 2, 253, 254, 255, 128, 7]
  const photo = (type = 'image/jpeg') => new Blob([new Uint8Array(PHOTO)], { type })

  it('exports photos base64-encoded', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 1600, 1200, d)

    const doc = await exportBackup(d)
    expect(doc.exercisePhotos).toHaveLength(1)
    const p = doc.exercisePhotos[0]
    expect(p).toMatchObject({ gymId: g, exerciseId: ex, type: 'image/jpeg', width: 1600, height: 1200 })
    expect(typeof p.bytes).toBe('string') // base64, not an ArrayBuffer
    expect(p.bytes.length).toBeGreaterThan(0)
  })

  it('round-trips a photo byte-for-byte through export -> wipe -> import', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo('image/png'), 800, 600, d)

    const doc = await exportBackup(d)
    // serialize + parse, so the base64 really goes through JSON like a real backup
    const restored = parseBackup(JSON.stringify(doc))
    await Promise.all([d.gyms, d.exercises, d.exercisePhotos].map((t) => t.clear()))
    await importBackupReplaceAll(restored, d)

    const [back] = await d.exercisePhotos.toArray()
    expect(back).toMatchObject({ gymId: g, exerciseId: ex, type: 'image/png', width: 800, height: 600 })
    expect([...new Uint8Array(await (await readPhotoBlob(back)).arrayBuffer())]).toEqual(PHOTO)
  })

  it('resetAll clears photos', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 1600, 1200, d)
    await resetAll(d)
    expect(await d.exercisePhotos.count()).toBe(0)
  })

  it('resetAll erases the image files too', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 1600, 1200, d)
    expect(await storedPhotoFiles()).toHaveLength(1)

    await resetAll(d)

    expect(await storedPhotoFiles()).toEqual([])
  })

  it('exports a photo the same way wherever its image is stored', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 100, 100, d)
    await withoutOpfs(() => addPhoto(g, ex, photo(), 100, 100, d))

    const doc = await exportBackup(d)

    expect(doc.exercisePhotos).toHaveLength(2)
    for (const p of doc.exercisePhotos) {
      expect(typeof p.bytes).toBe('string')
      expect(p).not.toHaveProperty('file')
    }
    // Same image on both paths → same base64.
    expect(doc.exercisePhotos[0].bytes).toBe(doc.exercisePhotos[1].bytes)
    expect(doc.version).toBe(SCHEMA_VERSION)
  })

  it('skips a photo whose image file is missing instead of failing the export', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 100, 100, d)
    const lost = await addPhoto(g, ex, photo(), 100, 100, d)
    // The record survives, the file does not — a user who cleared site storage.
    await removeImage((await d.exercisePhotos.get(lost))!)

    const doc = await exportBackup(d)

    expect(doc.exercisePhotos).toHaveLength(1)
    expect(doc.gyms).toHaveLength(1) // the rest of the backup is intact
    // The caller reports the gap by comparing counts (see the Backup screen).
    expect((await d.exercisePhotos.count()) - doc.exercisePhotos.length).toBe(1)
  })

  it('restores an imported photo into file storage', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 800, 600, d)
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)

    await importBackupReplaceAll(doc, d)

    const [back] = await d.exercisePhotos.toArray()
    expect(back.file).toBeTruthy()
    expect(back.bytes).toBeUndefined()
    expect(back.size).toBe(PHOTO.length)
    expect(await storedPhotoFiles()).toEqual([back.file])
    expect([...new Uint8Array(await (await readPhotoBlob(back)).arrayBuffer())]).toEqual(PHOTO)
  })

  it('an import replaces the previous device photos, files included', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 100, 100, d)
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    // A different photo now sits on the device — the import must not leave its
    // file behind, unreachable and taking up space.
    await resetAll(d)
    const { g: g2, ex: g2ex } = await seed()
    await addPhoto(g2, g2ex, new Blob(['outra'], { type: 'image/jpeg' }), 100, 100, d)

    await importBackupReplaceAll(doc, d)

    const [back] = await d.exercisePhotos.toArray()
    expect(await storedPhotoFiles()).toEqual([back.file])
    expect([...new Uint8Array(await (await readPhotoBlob(back)).arrayBuffer())]).toEqual(PHOTO)
  })

  it('imports a backup written before photos knew about files', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 100, 100, d)
    const legacy = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    // Exactly what an older version wrote: base64 bytes, no `size`.
    for (const p of legacy.exercisePhotos as Record<string, unknown>[]) delete p.size
    await resetAll(d)

    await importBackupReplaceAll(parseBackup(JSON.stringify(legacy)), d)

    const [back] = await d.exercisePhotos.toArray()
    expect(back.file).toBeTruthy()
    expect(back.size).toBe(PHOTO.length)
    expect([...new Uint8Array(await (await readPhotoBlob(back)).arrayBuffer())]).toEqual(PHOTO)
  })

  it('keeps imported photos in the record where there is no OPFS', async () => {
    const { g, ex } = await seed()
    await addPhoto(g, ex, photo(), 100, 100, d)
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)

    await withoutOpfs(() => importBackupReplaceAll(doc, d))

    const [back] = await d.exercisePhotos.toArray()
    expect(back.file).toBeUndefined()
    expect([...new Uint8Array(await (await readPhotoBlob(back)).arrayBuffer())]).toEqual(PHOTO)
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
