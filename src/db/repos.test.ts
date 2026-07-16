import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import {
  ValidationError,
  addPhoto,
  completeSession,
  createCategory,
  createDay,
  createExercise,
  createGym,
  deleteCategory,
  deleteExercise,
  deleteGym,
  deletePhoto,
  deleteSession,
  ensureUncategorized,
  getActiveSession,
  getNote,
  getSession,
  getSessionEntry,
  getWeight,
  hasAnyRegisteredData,
  listCategories,
  listDays,
  reorderDays,
  listHistory,
  listPhotos,
  listSessionEntries,
  listSessionSummaries,
  renameCategory,
  saveNote,
  saveWeight,
  setEntryDone,
  startSession,
  validateMediaUrl,
} from './repos'

let d: MyOneGymDB
let n = 0

/** Stand-in for an already-downscaled JPEG — this layer stores what it's given. */
const jpeg = (body = 'x') => new TextEncoder().encode(body).buffer as ArrayBuffer
const readBack = (bytes: ArrayBuffer) => new TextDecoder().decode(new Uint8Array(bytes))

beforeEach(async () => {
  d = new MyOneGymDB(`test-${Date.now()}-${n++}`)
  await d.open()
})
afterEach(async () => {
  await d.delete()
})

describe('gyms', () => {
  it('creates a gym and copies weights independently', async () => {
    const a = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca Direta' }, d)
    const ex2 = await createExercise({ name: 'Supino' }, d)
    await saveWeight(a, ex, 20, 'KG', d)
    await saveWeight(a, ex2, 40, 'KG', d)

    const b = await createGym('B', a, d)
    expect((await getWeight(b, ex, d))?.value).toBe(20)
    expect((await getWeight(b, ex2, d))?.value).toBe(40)

    // editing B does not affect A
    await saveWeight(b, ex, 99, 'KG', d)
    expect((await getWeight(a, ex, d))?.value).toBe(20)
    expect((await getWeight(b, ex, d))?.value).toBe(99)
  })

  it('creates a gym without copying when no source given', async () => {
    const a = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(a, ex, 20, 'KG', d)
    const b = await createGym('B', undefined, d)
    expect(await getWeight(b, ex, d)).toBeUndefined()
  })

  it('rejects an empty gym name', async () => {
    await expect(createGym('   ', undefined, d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('deleting a gym cascades to weights and history', async () => {
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(b, ex, 20, 'KG', d)
    await saveWeight(b, ex, 22.5, 'KG', d)
    await deleteGym(b, d)
    expect(await getWeight(b, ex, d)).toBeUndefined()
    expect(await listHistory(b, ex, d)).toHaveLength(0)
  })
})

describe('categories', () => {
  it('rejects duplicate names (case-insensitive)', async () => {
    await createCategory('Peito', d)
    await expect(createCategory('peito', d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('rename preserves the reference on exercises', async () => {
    const cat = await createCategory('Peito', d)
    const ex = await createExercise({ name: 'Supino', categoryId: cat }, d)
    await renameCategory(cat, 'Peitoral', d)
    expect((await d.exercises.get(ex))?.categoryId).toBe(cat)
    expect((await d.categories.get(cat))?.name).toBe('Peitoral')
  })

  it('delete reassigns exercises to "Sem categoria"', async () => {
    const bic = await createCategory('Bíceps', d)
    const ex = await createExercise({ name: 'Rosca Direta', categoryId: bic }, d)
    await deleteCategory(bic, d)
    const uncat = await ensureUncategorized(d)
    expect((await d.exercises.get(ex))?.categoryId).toBe(uncat)
    expect(await d.categories.get(bic)).toBeUndefined()
  })

  it('reserved "Sem categoria" cannot be deleted', async () => {
    const uncat = await ensureUncategorized(d)
    await expect(deleteCategory(uncat, d)).rejects.toBeInstanceOf(ValidationError)
    expect(await listCategories(d)).toHaveLength(1)
  })
})

describe('exercises', () => {
  it('media URL: accepts gif and image, rejects junk', () => {
    expect(validateMediaUrl('https://x.com/a.gif')).toBe('https://x.com/a.gif')
    expect(validateMediaUrl('https://x.com/a.png')).toBe('https://x.com/a.png')
    expect(validateMediaUrl('')).toBeUndefined()
    expect(() => validateMediaUrl('not-a-url')).toThrow(ValidationError)
    expect(() => validateMediaUrl('https://x.com/a.mp4')).toThrow(ValidationError)
  })

  it('delete removes from days and drops weights + history + notes + photos', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 20, 'KG', d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    await addPhoto(g, ex, jpeg(), 'image/jpeg', 800, 600, d)
    await deleteExercise(ex, d)
    expect((await d.days.get(day))?.exerciseIds).toEqual([])
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
    expect(await getNote(g, ex, d)).toBeUndefined()
    expect(await listPhotos(g, ex, d)).toHaveLength(0)
    expect(await d.exercises.get(ex)).toBeUndefined()
  })
})

describe('exercise notes', () => {
  it('upsert round-trip: save then read back the note', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    expect((await getNote(g, ex, d))?.text).toBe('manter cotovelo fixo')
  })

  it('editing replaces the text (still one record)', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    await saveNote(g, ex, 'usar pegada aberta', d)
    expect((await getNote(g, ex, d))?.text).toBe('usar pegada aberta')
    expect(await d.exerciseNotes.where('[gymId+exerciseId]').equals([g, ex]).count()).toBe(1)
  })

  it('trims and saving blank/whitespace text deletes the note', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, '  espaçado  ', d)
    expect((await getNote(g, ex, d))?.text).toBe('espaçado')
    await saveNote(g, ex, '   ', d)
    expect(await getNote(g, ex, d)).toBeUndefined()
  })

  it('is isolated per gym', async () => {
    const a = await createGym('A', undefined, d)
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(a, ex, 'nota da A', d)
    expect((await getNote(a, ex, d))?.text).toBe('nota da A')
    expect(await getNote(b, ex, d)).toBeUndefined()
  })

  it('deleting a gym removes its notes but leaves other gyms untouched', async () => {
    const a = await createGym('A', undefined, d)
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(a, ex, 'nota da A', d)
    await saveNote(b, ex, 'nota da B', d)
    await deleteGym(a, d)
    expect(await getNote(a, ex, d)).toBeUndefined()
    expect((await getNote(b, ex, d))?.text).toBe('nota da B')
  })
})

describe('exercise photos', () => {
  it('attaches a photo and reads the bytes back', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(g, ex, jpeg('abc'), 'image/jpeg', 1600, 1200, d)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo).toMatchObject({ gymId: g, exerciseId: ex, width: 1600, height: 1200 })
    expect(photo.type).toBe('image/jpeg')
    expect(photo.bytes.byteLength).toBe(3)
    expect(readBack(photo.bytes)).toBe('abc')
  })

  it('keeps many photos per (gym, exercise), newest first', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Leg Press' }, d)
    // Both land in the same millisecond here — the id tie-break is what makes
    // the order deterministic (fake timers would deadlock Dexie's scheduler).
    await addPhoto(g, ex, jpeg('old'), 'image/jpeg', 100, 100, d)
    await addPhoto(g, ex, jpeg('new'), 'image/jpeg', 100, 100, d)

    const photos = await listPhotos(g, ex, d)
    expect(photos).toHaveLength(2)
    expect(readBack(photos[0].bytes)).toBe('new')
    expect(readBack(photos[1].bytes)).toBe('old')
  })

  it('orders by createdAt when the timestamps differ', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Leg Press' }, d)
    // Inserted directly with explicit timestamps: `addPhoto` stamps Date.now(),
    // and this is asserting listPhotos' sort, not the insert. Note the older row
    // gets the LOWER id, so id order alone would put it first — createdAt wins.
    const row = (body: string, createdAt: number) => ({
      gymId: g,
      exerciseId: ex,
      bytes: jpeg(body),
      type: 'image/jpeg',
      width: 100,
      height: 100,
      createdAt,
    })
    await d.exercisePhotos.add(row('old', 1_000))
    await d.exercisePhotos.add(row('new', 9_000))

    const photos = await listPhotos(g, ex, d)
    expect(readBack(photos[0].bytes)).toBe('new')
    expect(readBack(photos[1].bytes)).toBe('old')
  })

  it('is isolated per gym', async () => {
    const a = await createGym('A', undefined, d)
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 'image/jpeg', 100, 100, d)
    expect(await listPhotos(a, ex, d)).toHaveLength(1)
    expect(await listPhotos(b, ex, d)).toHaveLength(0)
  })

  it('deletes a single photo without touching the others', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const first = await addPhoto(g, ex, jpeg('one'), 'image/jpeg', 100, 100, d)
    await addPhoto(g, ex, jpeg('two'), 'image/jpeg', 100, 100, d)
    await deletePhoto(first, d)

    const photos = await listPhotos(g, ex, d)
    expect(photos).toHaveLength(1)
    expect(readBack(photos[0].bytes)).toBe('two')
  })

  it('deleting a photo leaves the weight and note alone', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(g, ex, 20, 'KG', d)
    await saveNote(g, ex, 'cotovelo fixo', d)
    const id = await addPhoto(g, ex, jpeg(), 'image/jpeg', 100, 100, d)
    await deletePhoto(id, d)

    expect((await getWeight(g, ex, d))?.value).toBe(20)
    expect((await getNote(g, ex, d))?.text).toBe('cotovelo fixo')
  })

  it('deleting a gym removes its photos but leaves other gyms untouched', async () => {
    const a = await createGym('A', undefined, d)
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 'image/jpeg', 100, 100, d)
    await addPhoto(b, ex, jpeg(), 'image/jpeg', 100, 100, d)
    await deleteGym(a, d)

    expect(await listPhotos(a, ex, d)).toHaveLength(0)
    expect(await listPhotos(b, ex, d)).toHaveLength(1)
  })

  it('deleting an exercise removes its photos in every gym', async () => {
    const a = await createGym('A', undefined, d)
    const b = await createGym('B', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 'image/jpeg', 100, 100, d)
    await addPhoto(b, ex, jpeg(), 'image/jpeg', 100, 100, d)
    await deleteExercise(ex, d)

    expect(await d.exercisePhotos.count()).toBe(0)
  })
})

describe('days', () => {
  it('same exercise can appear in multiple days', async () => {
    const ex = await createExercise({ name: 'Rosca' }, d)
    await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await createDay({ name: 'Dia 3', exerciseIds: [ex] }, d)
    const days = await listDays(d)
    expect(days.filter((day) => day.exerciseIds.includes(ex))).toHaveLength(2)
  })

  it('lists in insertion order by default, and reorderDays persists a new order', async () => {
    const a = await createDay({ name: 'Dia 1' }, d)
    const b = await createDay({ name: 'Dia 2' }, d)
    const c = await createDay({ name: 'Dia 3' }, d)
    expect((await listDays(d)).map((x) => x.name)).toEqual(['Dia 1', 'Dia 2', 'Dia 3'])

    // Move "Dia 2" to the front.
    await reorderDays([b, a, c], d)
    expect((await listDays(d)).map((x) => x.name)).toEqual(['Dia 2', 'Dia 1', 'Dia 3'])

    // A newly created day appends after the ordered ones.
    await createDay({ name: 'Dia 4' }, d)
    expect((await listDays(d)).map((x) => x.name)).toEqual(['Dia 2', 'Dia 1', 'Dia 3', 'Dia 4'])
  })
})

describe('sessions', () => {
  async function seedDay() {
    const g = await createGym('A', undefined, d)
    const rosca = await createExercise({ name: 'Rosca Direta' }, d)
    const supino = await createExercise({ name: 'Supino' }, d)
    const agachamento = await createExercise({ name: 'Agachamento' }, d)
    await saveWeight(g, rosca, 20, 'KG', d)
    await saveWeight(g, supino, 40, 'KG', d)
    // agachamento intentionally has no weight
    const day = await createDay({ name: 'Dia 1', exerciseIds: [rosca, supino, agachamento] }, d)
    return { g, rosca, supino, agachamento, day }
  }

  it('start creates entries with names only — no stored weight', async () => {
    const { g, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    expect(entries.map((e) => e.exerciseName)).toEqual(['Rosca Direta', 'Supino', 'Agachamento'])
    expect(entries.every((e) => e.done === false)).toBe(true)
    // entries carry no weight — the weight is the exercise's per-gym target
    expect(entries.every((e) => !('usedValue' in e) && !('usedUnit' in e))).toBe(true)
  })

  it('the session weight is the live per-gym target (no snapshot)', async () => {
    const { g, rosca, day } = await seedDay()
    await startSession(g, day, d)
    // the target read for the session's gym is the current one, and it moves
    expect((await getWeight(g, rosca, d))?.value).toBe(20)
    await saveWeight(g, rosca, 25, 'KG', d)
    expect((await getWeight(g, rosca, d))?.value).toBe(25)
  })

  it('rejects a second active session for the same gym', async () => {
    const { g, day } = await seedDay()
    await startSession(g, day, d)
    await expect(startSession(g, day, d)).rejects.toBeInstanceOf(ValidationError)
    // still exactly one active session
    expect(await d.sessions.where('gymId').equals(g).count()).toBe(1)
  })

  it('active session is per gym', async () => {
    const { g, day } = await seedDay()
    await startSession(g, day, d)
    const b = await createGym('B', undefined, d)
    expect(await getActiveSession(b, d)).toBeUndefined()
    // gym B can start its own session for the same day
    const sidB = await startSession(b, day, d)
    expect((await getSession(sidB, d))?.gymId).toBe(b)
  })

  it('run: mark done; adjusting weight updates the per-gym target + history', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    const rEntry = entries.find((e) => e.exerciseName === 'Rosca Direta')!
    await setEntryDone(rEntry.id!, true, d)
    // editing the weight during a session goes through the target editor
    await saveWeight(g, rosca, 22.5, 'KG', d)
    const r2 = (await listSessionEntries(sid, d)).find((e) => e.id === rEntry.id)!
    expect(r2.done).toBe(true)
    // the exercise's target weight for the gym IS updated, with a history entry
    expect((await getWeight(g, rosca, d))?.value).toBe(22.5)
    expect((await listHistory(g, rosca, d))[0]?.value).toBe(22.5)
  })

  it('complete moves to completed and frees the gym to start again', async () => {
    const { g, day } = await seedDay()
    const sid = await startSession(g, day, d)
    await completeSession(sid, d)
    expect((await getSession(sid, d))?.status).toBe('completed')
    expect(await getActiveSession(g, d)).toBeUndefined()
    // can start a new one now
    await expect(startSession(g, day, d)).resolves.toBeGreaterThan(0)
  })

  it('history lists only completed sessions of the gym, newest first, with counts', async () => {
    const { g, day } = await seedDay()
    const b = await createGym('B', undefined, d)
    // one completed in A with 1/3 done
    const s1 = await startSession(g, day, d)
    const e1 = await listSessionEntries(s1, d)
    await setEntryDone(e1[0].id!, true, d)
    await completeSession(s1, d)
    // one completed in B
    const s2 = await startSession(b, day, d)
    await completeSession(s2, d)

    const histA = await listSessionSummaries(g, d)
    expect(histA).toHaveLength(1)
    expect(histA[0]).toMatchObject({ total: 3, done: 1 })
    expect(histA[0].session.dayName).toBe('Dia 1')

    const histB = await listSessionSummaries(b, d)
    expect(histB).toHaveLength(1)
  })

  it('delete removes the session and its entries, leaving other data intact', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    expect(await d.sessionEntries.where('sessionId').equals(sid).count()).toBe(3)
    await deleteSession(sid, d)
    expect(await getSession(sid, d)).toBeUndefined()
    expect(await d.sessionEntries.where('sessionId').equals(sid).count()).toBe(0)
    // exercises and target weights untouched
    expect((await getWeight(g, rosca, d))?.value).toBe(20)
    expect(await d.exercises.count()).toBe(3)
  })

  it('getSessionEntry returns a single entry (name snapshot, no weight)', async () => {
    const { day, g } = await seedDay()
    const sid = await startSession(g, day, d)
    const [first] = await listSessionEntries(sid, d)
    const fetched = await getSessionEntry(first.id!, d)
    expect(fetched?.exerciseName).toBe('Rosca Direta')
    expect(fetched && !('usedValue' in fetched)).toBe(true)
  })

  it('session detail survives deletion of the source exercise and day (name snapshot)', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    await deleteExercise(rosca, d)
    await d.days.delete(day)
    const entries = await listSessionEntries(sid, d)
    // the name snapshot remains so the recap still renders
    expect(entries.some((e) => e.exerciseName === 'Rosca Direta')).toBe(true)
    // the target weight is gone with the exercise (no per-session copy)
    expect(await getWeight(g, rosca, d)).toBeUndefined()
    expect((await getSession(sid, d))?.dayName).toBe('Dia 1')
  })
})

describe('hasAnyRegisteredData', () => {
  it('is false for an empty database', async () => {
    expect(await hasAnyRegisteredData(d)).toBe(false)
  })

  it('is true as soon as any gym, category, exercise, or day exists', async () => {
    await createGym('A', undefined, d)
    expect(await hasAnyRegisteredData(d)).toBe(true)
  })

  it('is true from a category alone (no gym yet)', async () => {
    await createCategory('Peito', d)
    expect(await hasAnyRegisteredData(d)).toBe(true)
  })
})
