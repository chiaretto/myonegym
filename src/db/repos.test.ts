import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import {
  ValidationError,
  completeSession,
  createCategory,
  createDay,
  createExercise,
  createGym,
  deleteCategory,
  deleteExercise,
  deleteGym,
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
  listSessionEntries,
  listSessionSummaries,
  renameCategory,
  saveNote,
  saveWeight,
  setEntryDone,
  setEntryWeight,
  startSession,
  validateMediaUrl,
} from './repos'

let d: MyOneGymDB
let n = 0

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

  it('delete removes from days and drops weights + history + notes', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 20, 'KG', d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    await deleteExercise(ex, d)
    expect((await d.days.get(day))?.exerciseIds).toEqual([])
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
    expect(await getNote(g, ex, d)).toBeUndefined()
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

  it('start snapshots current target weights into entries (empty when unset)', async () => {
    const { g, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    expect(entries.map((e) => [e.exerciseName, e.usedValue, e.usedUnit])).toEqual([
      ['Rosca Direta', 20, 'KG'],
      ['Supino', 40, 'KG'],
      ['Agachamento', undefined, undefined],
    ])
    expect(entries.every((e) => e.done === false)).toBe(true)
  })

  it('snapshot is independent of later target changes', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    await saveWeight(g, rosca, 25, 'KG', d) // change the target afterwards
    const entries = await listSessionEntries(sid, d)
    expect(entries.find((e) => e.exerciseName === 'Rosca Direta')?.usedValue).toBe(20)
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

  it('run: mark done and set used weight without touching the target', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    const rEntry = entries.find((e) => e.exerciseName === 'Rosca Direta')!
    await setEntryDone(rEntry.id!, true, d)
    await setEntryWeight(rEntry.id!, 22.5, 'KG', d)
    const after = await listSessionEntries(sid, d)
    const r2 = after.find((e) => e.id === rEntry.id)!
    expect(r2.done).toBe(true)
    expect(r2.usedValue).toBe(22.5)
    // the exercise's target weight for the gym is unchanged
    expect((await getWeight(g, rosca, d))?.value).toBe(20)
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

  it('getSessionEntry returns a single entry; used-weight edit leaves the target untouched', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const [first] = await listSessionEntries(sid, d)
    const fetched = await getSessionEntry(first.id!, d)
    expect(fetched?.exerciseName).toBe('Rosca Direta')
    await setEntryWeight(first.id!, 22.5, 'LB', d)
    expect((await getSessionEntry(first.id!, d))?.usedValue).toBe(22.5)
    expect((await getSessionEntry(first.id!, d))?.usedUnit).toBe('LB')
    // the exercise's target weight for the gym is unchanged
    expect((await getWeight(g, rosca, d))?.value).toBe(20)
    expect((await getWeight(g, rosca, d))?.unit).toBe('KG')
  })

  it('session detail survives deletion of the source exercise and day', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    await deleteExercise(rosca, d)
    await d.days.delete(day)
    const entries = await listSessionEntries(sid, d)
    // snapshot name + weight remain
    expect(entries.find((e) => e.exerciseName === 'Rosca Direta')?.usedValue).toBe(20)
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
