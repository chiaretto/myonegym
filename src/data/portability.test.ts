import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACCENTS } from '../state/accents'
import { useSettings } from '../state/settings'
import { allTables, MyOneGymDB } from '../db/db'
import { GLOBAL_GYM_ID } from '../db/types'
import { storedPhotoFiles, withoutOpfs } from '../test/memoryOpfs'
import { officialCategories, officialExercises } from './officialCatalog'
import { EXAMPLE_DAYS, EXAMPLE_GYM, EXAMPLE_WEIGHTS } from './exampleRoutine'
import { removeImage } from './photoStore'
import {
  addPhoto,
  readPhotoBlob,
  completeSession,
  createDay,
  createExercise,
  createGym,
  deleteExercise,
  createCategory,
  getExercise,
  getNote,
  listCardioExercises,
  listDays,
  listExercises,
  listHistory,
  listSessionEntries,
  resolveWeight,
  saveNote,
  saveWeight,
  setAlternatives,
  setEntryDone,
  startCardioSession,
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
  const cat = await createCategory('Peitoral', d)
  const g = await createGym('A', d)
  const ex = await createExercise({ name: 'Supino', mediaUrl: 'https://x.com/s.gif', categoryIds: [cat] }, d)
  await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
  await saveWeight(g, ex, 40, 'KG', 'global', d)
  await saveWeight(g, ex, 42.5, 'KG', 'global', d) // creates history
  return { cat, g, ex }
}

describe('backup export/import', () => {
  it('exports the current weight AND its full history', async () => {
    const { ex } = await seed() // saveWeight twice → 2 history entries
    const doc = await exportBackup(d)
    expect(doc.weights).toHaveLength(1)
    // A global weight travels under the sentinel — it belongs to no gym.
    expect(doc.weights[0]).toMatchObject({
      gymId: GLOBAL_GYM_ID,
      exerciseId: ex,
      value: 42.5,
      unit: 'KG',
    })
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
    await createGym('B', d)
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
    const peitoral = await createCategory('Peitoral', d)
    const triceps = await createCategory('Tricípite', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peitoral, triceps] }, d)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    expect((await d.exercises.get(ex))?.categoryIds).toEqual([peitoral, triceps])
  })

  it('imports a pre-multi-category backup (singular categoryId + reserved bucket)', async () => {
    const peitoral = await createCategory('Peitoral', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peitoral] }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>

    // Rewrite the doc to look like an OLD backup: singular categoryId, a reserved
    // "Sem categoria" category, and an exercise pointing at it.
    const cats = doc.categories as Record<string, unknown>[]
    const reservedId = 19999
    cats.push({ id: reservedId, name: 'Sem categoria', reserved: true })
    const exs = doc.exercises as Record<string, unknown>[]
    exs[0] = { id: exs[0].id, name: 'Supino', categoryId: peitoral }
    exs.push({ id: 18888, name: 'Alongamento', categoryId: reservedId })

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    // Singular → one-element list; reserved category dropped, its ref emptied.
    expect((await d.exercises.get(ex))?.categoryIds).toEqual([peitoral])
    expect((await d.exercises.get(18888))?.categoryIds).toEqual([])
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
    const g = await createGym('A', d)
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
    // In the USER range: an id nothing can resolve, now or later.
    ;(doc.exercises as Record<string, unknown>[])[0].alternativeIds = [17777]

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    // Repaired, not rejected: a dangling id is not worth failing a restore over.
    expect((await d.exercises.get(ex))?.alternativeIds).toEqual([])
  })

  it('keeps a reference to the official catalog, which the document never carries', async () => {
    const ex = await createExercise({ name: 'Supino Caseiro' }, d)
    const official = officialExercises()[0].id!
    await setAlternatives(ex, [official], d)

    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    // The official exercise is not in the file — it never is — so the old rule
    // would have read this as dangling and deleted the link on every restore.
    expect((doc.exercises as Record<string, unknown>[]).some((e) => e.id === official)).toBe(false)

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect((await d.exercises.get(ex))?.alternativeIds).toEqual([official])
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

describe('exercise kind travels through a backup', () => {
  it('round-trips both kinds', async () => {
    await createExercise({ name: 'Supino' }, d)
    await createExercise({ name: 'Esteira', kind: 'cardio' }, d)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    const byName = new Map((await d.exercises.toArray()).map((e) => [e.name, e.kind]))
    expect(byName.get('Supino')).toBe('strength')
    expect(byName.get('Esteira')).toBe('cardio')
  })

  it('a cardio session keeps its kind through a round-trip', async () => {
    const g = await createGym('A', d)
    const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, d)
    const { sessionId: sid } = await startCardioSession(g, esteira, d)
    await completeSession(sid, d)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    const sessions = await d.sessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].kind).toBe('cardio')
    expect(sessions[0].dayName).toBe('Esteira')
  })

  it('a backup made before the kind existed imports as strength', async () => {
    await createExercise({ name: 'Supino' }, d)
    const g = await createGym('A', d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [] }, d)
    const sid = await startSession(g, day, d)
    await completeSession(sid, d)

    // Strip the field the way an older export simply would not have had it.
    const raw = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    for (const e of raw.exercises as Record<string, unknown>[]) delete e.kind
    for (const s of raw.sessions as Record<string, unknown>[]) delete s.kind

    const doc = parseBackup(JSON.stringify(raw))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    // Nothing rejected, and everything is what it actually was: strength.
    expect((await d.exercises.toArray()).every((e) => e.kind === 'strength')).toBe(true)
    expect((await d.sessions.toArray()).every((s) => s.kind === 'strength')).toBe(true)
  })

  it('leaves the Cardio tab populated, without seeding cardio itself', async () => {
    await generateExample(d)

    // CHANGED: the sample used to create two loose cardio exercises so the tab
    // would not open empty. The official catalog ships cardio now, so creating
    // more would only duplicate it — the guarantee holds without the sample.
    const cardio = (await listCardioExercises(d)).filter((e) => e.kind === 'cardio')
    expect(cardio.length).toBeGreaterThan(0)
    expect(await d.exercises.count()).toBe(0)

    // Still what the Cardio tab is for: outside every day, and with no weight.
    const inDays = new Set((await d.days.toArray()).flatMap((day) => day.exerciseIds))
    for (const e of cardio) {
      expect(inDays.has(e.id!)).toBe(false)
      expect(await d.weights.where('exerciseId').equals(e.id!).count()).toBe(0)
    }
  })
})

/**
 * Warm-ups were removed from the app, so the document no longer carries them —
 * and a file that still does has to import anyway. Rejecting a field the app
 * stopped using would make every backup taken until now unrestorable, which is
 * the one thing a backup cannot be.
 */
describe('a backup that still carries warm-ups', () => {
  it('is not part of what this version exports', async () => {
    await createExercise({ name: 'Supino' }, d)
    const doc = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>

    expect(doc.warmups).toBeUndefined()
    expect((doc.exercises as Record<string, unknown>[])[0].warmupIds).toBeUndefined()
  })

  it('imports clean, ignoring them', async () => {
    const ex = await createExercise({ name: 'Supino' }, d)
    const raw = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    // Put back exactly what an older export wrote.
    raw.warmups = [{ id: 1, name: 'Rotação', url: 'https://x.com/a.png' }]
    ;(raw.exercises as Record<string, unknown>[])[0].warmupIds = [1]

    await resetAll(d)
    await importBackupReplaceAll(parseBackup(JSON.stringify(raw)), d)

    expect((await d.exercises.get(ex))?.name).toBe('Supino')
    expect(Object.keys((await d.exercises.get(ex))!)).not.toContain('warmupIds')
  })

  it('does not bump the document version for the removal', async () => {
    const doc = await exportBackup(d)
    expect(doc.version).toBe(SCHEMA_VERSION)
  })
})

describe('device-local UI preferences stay out of the backup', () => {
  it('does not carry the accent colour', async () => {
    const g = await createGym('Academia A', d)
    const cat = await createCategory('Peitoral', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [cat] }, d)
    await saveWeight(g, ex, 40, 'KG', 'global', d)
    useSettings.getState().setAccent('green')

    const json = JSON.stringify(await exportBackup(d))

    // The choice describes how THIS device paints the app, not what the user
    // recorded in it: restoring must never repaint a device that was already
    // set up the way its owner wanted.
    const green = ACCENTS.find((a) => a.id === 'green')!
    expect(json).not.toContain('accent')
    expect(json).not.toContain(green.accent)
    expect(json).not.toContain('green')
    useSettings.getState().reset()
  })
})

describe('full backup is a complete snapshot', () => {
  /** Seed one of everything, then export/JSON/parse/wipe/import and compare. */
  async function seedEverything() {
    const g = await createGym('Academia A', d)
    const cat = await createCategory('Peitoral', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [cat] }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 40, 'KG', 'global', d)
    await saveWeight(g, ex, 42.5, 'KG', 'global', d) // history
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
  it('creates four days, a gym and some weights — and no catalog of its own', async () => {
    await generateExample(d)

    expect(await d.days.count()).toBe(EXAMPLE_DAYS.length)
    expect(await d.days.count()).toBe(4)
    expect(await d.gyms.count()).toBe(1)
    expect((await d.gyms.toArray())[0].name).toBe(EXAMPLE_GYM)
    expect(await d.weights.count()).toBe(EXAMPLE_WEIGHTS.length)
    expect(await d.weightHistory.count()).toBe(EXAMPLE_WEIGHTS.length)

    // The point of the change: the sample no longer brings a second catalog.
    expect(await d.exercises.count()).toBe(0)
    expect(await d.categories.count()).toBe(0)
  })

  it('fills its days with the official exercises, in the order given', async () => {
    await generateExample(d)

    const days = await listDays(d)
    expect(days.map((x) => x.name)).toEqual(EXAMPLE_DAYS.map((x) => x.name))
    for (const [i, day] of days.entries()) {
      expect(day.exerciseIds).toEqual(EXAMPLE_DAYS[i].exerciseIds)
      // And each one resolves — through the catalog, not through a row.
      for (const id of day.exerciseIds) {
        expect(await getExercise(id, d), String(id)).toBeDefined()
      }
    }
  })

  it('seeds the weights globally, so a gym created later already has them', async () => {
    await generateExample(d)

    const weights = await d.weights.toArray()
    expect(weights.every((w) => w.gymId === GLOBAL_GYM_ID)).toBe(true)
    const other = await createGym('Outra', d)
    const first = EXAMPLE_WEIGHTS[0]
    expect(await resolveWeight(other, first.exerciseId, d)).toMatchObject({
      scope: 'global',
      weight: { value: first.value },
    })
  })

  it('is additive: it does not add a second gym over the user\'s own', async () => {
    await createGym('Casa', d)
    await generateExample(d)

    expect(await d.gyms.count()).toBe(1)
    expect((await d.gyms.toArray())[0].name).toBe('Casa')
    // No gym seeded means no sample weights either — they came with it.
    expect(await d.weights.count()).toBe(0)
    // The days are still written: they are the routine, which is the sample.
    expect(await d.days.count()).toBe(4)
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
    expect(await d.days.count()).toBe(EXAMPLE_DAYS.length)
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

describe('weight scopes travel through a backup', () => {
  /** A global weight plus one gym exception, in two gyms. */
  async function seedScopes() {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const rosca = await createExercise({ name: 'Rosca' }, d)
    const supino = await createExercise({ name: 'Supino' }, d)
    await saveWeight(a, rosca, 20, 'KG', 'global', d)
    await saveWeight(a, supino, 40, 'KG', 'global', d)
    await saveWeight(b, supino, 30, 'KG', 'gym', d)
    return { a, b, rosca, supino }
  }

  it('round-trips global weights and exceptions unchanged', async () => {
    const { a, b, rosca, supino } = await seedScopes()

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    expect(await resolveWeight(a, rosca, d)).toMatchObject({ scope: 'global', weight: { value: 20 } })
    expect(await resolveWeight(b, supino, d)).toMatchObject({ scope: 'gym', weight: { value: 30 } })
    expect(await resolveWeight(a, supino, d)).toMatchObject({ scope: 'global', weight: { value: 40 } })
    // Each scope keeps its own timeline.
    expect(await listHistory(b, supino, d)).toHaveLength(1)
    expect(await listHistory(a, supino, d)).toHaveLength(1)
  })

  it('a weight naming no gym is not rejected as a dangling reference', async () => {
    await seedScopes()
    const json = JSON.stringify(await exportBackup(d))
    const doc = parseBackup(json)
    expect(doc.weights.some((w) => w.gymId === GLOBAL_GYM_ID)).toBe(true)
    await expect(importBackupReplaceAll(doc, d)).resolves.not.toThrow()
  })

  it('promotes the weights of a backup written before they were global', async () => {
    const { a, b, rosca, supino } = await seedScopes()
    // Rewrite the export the way the old format looked: no global rows, every
    // weight keyed to a gym. "A" is the older gym, so it owns them.
    const legacy = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    legacy.version = 5
    for (const table of ['weights', 'weightHistory'] as const) {
      for (const row of legacy[table] as { gymId: number }[]) {
        if (row.gymId === GLOBAL_GYM_ID) row.gymId = a
      }
    }
    await resetAll(d)

    await importBackupReplaceAll(parseBackup(JSON.stringify(legacy)), d)

    // A's rows became the global ones; B's stayed an exception.
    expect(await resolveWeight(a, rosca, d)).toMatchObject({ scope: 'global', weight: { value: 20 } })
    expect(await resolveWeight(b, rosca, d)).toMatchObject({ scope: 'global', weight: { value: 20 } })
    expect(await resolveWeight(b, supino, d)).toMatchObject({ scope: 'gym', weight: { value: 30 } })
    expect(await d.weights.where('gymId').equals(a).count()).toBe(0)
  })

  it('leaves a current backup exactly as it is', async () => {
    const { a, b, supino } = await seedScopes()
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)

    await importBackupReplaceAll(doc, d)

    // B's exception was NOT promoted over A's global weight.
    expect(await resolveWeight(a, supino, d)).toMatchObject({ scope: 'global', weight: { value: 40 } })
    expect(await d.weights.where('gymId').equals(b).count()).toBe(1)
  })

  it('seeds the sample routine with GLOBAL weights, shared by a later gym', async () => {
    await generateExample(d)

    expect(await d.weights.where('gymId').equals(GLOBAL_GYM_ID).count()).toBe(
      EXAMPLE_WEIGHTS.length,
    )
    const nova = await createGym('Nova', d)
    const withWeight = (await d.weights.toArray())[0].exerciseId
    expect(await resolveWeight(nova, withWeight, d)).toMatchObject({ scope: 'global' })
  })
})

describe('exercise videos travel through a backup', () => {
  const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  const ig = 'https://www.instagram.com/reel/Cabc123/'

  it('round-trips the videos, in order, with label and range', async () => {
    await createExercise(
      {
        name: 'Supino',
        videos: [
          { url: yt, title: 'pegada fechada', startSec: 130, endSec: 165 },
          { url: ig },
        ],
      },
      d,
    )
    await createExercise({ name: 'Rosca' }, d)

    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    const byName = new Map((await d.exercises.toArray()).map((e) => [e.name, e.videos]))
    // Order is the paging order, not a storage detail.
    expect(byName.get('Supino')?.map((v) => v.url)).toEqual([yt, ig])
    expect(byName.get('Supino')?.[0]).toMatchObject({
      title: 'pegada fechada',
      startSec: 130,
      endSec: 165,
    })
    expect(byName.get('Rosca')).toEqual([])
  })

  it('a backup made before videos existed imports as none', async () => {
    await createExercise({ name: 'Supino' }, d)

    // Strip what an older export simply would not have had.
    const raw = JSON.parse(JSON.stringify(await exportBackup(d))) as Record<string, unknown>
    for (const e of raw.exercises as Record<string, unknown>[]) delete e.videos

    await resetAll(d)
    await importBackupReplaceAll(parseBackup(JSON.stringify(raw)), d)

    expect((await d.exercises.toArray()).every((e) => e.videos.length === 0)).toBe(true)
  })

  it('leaves nothing behind once the exercise is gone', async () => {
    // No orphan is possible: the videos live inside the record, which is the
    // whole point of them not being a table.
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }] }, d)
    const doc = parseBackup(JSON.stringify(await exportBackup(d)))
    await resetAll(d)
    await importBackupReplaceAll(doc, d)

    const restored = (await d.exercises.toArray()).find((e) => e.name === 'Supino')!
    await deleteExercise(restored.id!, d)
    expect((await d.exercises.toArray()).flatMap((e) => e.videos)).toEqual([])
    expect(id).toBeGreaterThan(0)
  })
})

/**
 * The case that reaches **every backup ever produced by this app**: a document
 * exported while the catalog still lived in the database. It carries the
 * official exercises and categories with the very ids the app now serves from
 * the bundle, plus days, weights, history and sessions pointing at them.
 *
 * Restoring it must perform the same swap of source the v13 upgrade performs:
 * the catalog rows are dropped, everything that references them is restored
 * untouched, and the ids go on meaning the same movements.
 */
describe('restoring a backup made before the catalog moved to the bundle', () => {
  /** A document shaped like a pre-v13 export: the catalog inside it. */
  function legacyDoc(gymId: number) {
    const supino = officialExercises().find((e) => e.name === 'Supino Reto com Barra')!
    const rosca = officialExercises().find((e) => e.name === 'Rosca Direta com Barra')!
    const peito = officialCategories().find((c) => c.name === 'Peito')!
    return {
      app: 'myonegym',
      kind: 'backup',
      version: SCHEMA_VERSION,
      exportedAt: Date.now(),
      gyms: [{ id: gymId, name: 'Academia A', createdAt: 1 }],
      // Exactly what an old export carried: the catalog as database rows.
      categories: [{ id: peito.id, name: peito.name }],
      exercises: [
        {
          id: supino.id,
          name: supino.name,
          kind: 'strength',
          categoryIds: [peito.id],
          alternativeIds: [],
          videos: [],
        },
        {
          id: rosca.id,
          name: rosca.name,
          kind: 'strength',
          categoryIds: [],
          alternativeIds: [],
          videos: [],
        },
      ],
      days: [{ id: 1, name: 'Dia 1', exerciseIds: [supino.id, rosca.id] }],
      weights: [{ id: 1, gymId: GLOBAL_GYM_ID, exerciseId: supino.id, value: 60, unit: 'KG' }],
      weightHistory: [
        {
          id: 1,
          gymId: GLOBAL_GYM_ID,
          exerciseId: supino.id,
          value: 60,
          unit: 'KG',
          changedAt: 1,
          kind: 'first',
        },
      ],
      sessions: [
        {
          id: 1,
          gymId,
          kind: 'strength',
          dayId: 1,
          dayName: 'Dia 1',
          startedAt: 1,
          completedAt: 2,
          status: 'completed',
        },
      ],
      sessionEntries: [
        { id: 1, sessionId: 1, exerciseId: supino.id, exerciseName: supino.name, done: true },
      ],
      exerciseNotes: [{ id: 1, gymId, exerciseId: supino.id, text: 'banco no 4', updatedAt: 1 }],
      exercisePhotos: [],
      warmups: [],
      supino,
      rosca,
      peito,
    }
  }

  it('does not recreate the catalog in the database', async () => {
    const doc = legacyDoc(1)
    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect(await d.exercises.count()).toBe(0)
    expect(await d.categories.count()).toBe(0)
  })

  it('restores everything that pointed at the catalog, untouched', async () => {
    const doc = legacyDoc(1)
    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect((await d.days.toArray())[0].exerciseIds).toEqual([doc.supino.id, doc.rosca.id])
    expect((await d.weights.toArray())[0]).toMatchObject({
      exerciseId: doc.supino.id,
      value: 60,
    })
    expect(await d.weightHistory.count()).toBe(1)
    expect((await d.exerciseNotes.toArray())[0]).toMatchObject({
      exerciseId: doc.supino.id,
      text: 'banco no 4',
    })
    expect((await d.sessionEntries.toArray())[0]).toMatchObject({
      exerciseId: doc.supino.id,
      exerciseName: doc.supino.name,
    })
  })

  it('resolves those ids against the bundle, so the day reads the same as before', async () => {
    const doc = legacyDoc(1)
    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    const ids = (await d.days.toArray())[0].exerciseIds
    const names = await Promise.all(ids.map(async (id) => (await getExercise(id, d))?.name))
    expect(names).toEqual([doc.supino.name, doc.rosca.name])

    // And the merged listing shows the catalog once, not twice.
    const all = await listExercises(d)
    expect(all.filter((e) => e.name === doc.supino.name)).toHaveLength(1)
  })

  it('leaves an exercise the user created beyond the catalog unresolvable, without deleting its weight', async () => {
    const doc = legacyDoc(1) as unknown as Record<string, unknown>
    // Back when the catalog was theirs, a user exercise took the next free id —
    // one the bundled file does not carry.
    ;(doc.exercises as Record<string, unknown>[]).push({
      id: 9998,
      name: 'Invenção minha',
      kind: 'strength',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    ;(doc.weights as Record<string, unknown>[]).push({
      id: 2,
      gymId: GLOBAL_GYM_ID,
      exerciseId: 9998,
      value: 30,
      unit: 'KG',
    })

    await importBackupReplaceAll(parseBackup(JSON.stringify(doc)), d)

    expect(await getExercise(9998, d)).toBeUndefined()
    // The weight survives: deleting a user's record over an id that did not
    // match is the one outcome here with no way back.
    expect(await d.weights.where('exerciseId').equals(9998).count()).toBe(1)
  })
})
