import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { storedPhotoFiles, withoutOpfs } from '../test/memoryOpfs'
import { MyOneGymDB } from './db'
import type { ExercisePhoto } from './types'
import {
  ValidationError,
  addPhoto,
  completeSession,
  createCategory,
  createDay,
  createExercise,
  updateWarmup,
  listWarmups,
  exercisesUsingWarmup,
  deleteWarmup,
  createWarmup,
  daysContaining,
  createGym,
  deleteCategory,
  deleteExercise,
  deleteGym,
  deletePhoto,
  deleteSession,
  getActiveSession,
  getNote,
  getSession,
  getSessionEntry,
  getWeight,
  hasAnyRegisteredData,
  listCategories,
  listDays,
  reorderDays,
  listCardioExercises,
  listHistory,
  listPhotos,
  listSessionEntries,
  listSessionSummaries,
  maintainPhotoStorage,
  migrateLegacyPhotos,
  readPhotoBlob,
  renameCategory,
  saveNote,
  saveWeight,
  setAlternatives,
  setEntryDone,
  startCardioSession,
  startSession,
  swapEntryExercise,
  sweepPhotoOrphans,
  updateExercise,
  validateMediaUrl,
} from './repos'

let d: MyOneGymDB
let n = 0

/** Stand-in for an already-downscaled JPEG — this layer stores what it's given. */
const jpeg = (body = 'x') => new Blob([body], { type: 'image/jpeg' })
const readBack = async (photo: ExercisePhoto) => (await readPhotoBlob(photo)).text()

beforeEach(async () => {
  d = new MyOneGymDB(`test-${Date.now()}-${n++}`)
  await d.open()
})
afterEach(async () => {
  await d.delete()
})

describe('gyms', () => {
  it('a new gym inherits the global weights, with no rows of its own', async () => {
    const a = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca Direta' }, d)
    const ex2 = await createExercise({ name: 'Supino' }, d)
    await saveWeight(a, ex, 20, 'KG', 'global', d)
    await saveWeight(a, ex2, 40, 'KG', 'global', d)

    const b = await createGym('B', d)
    expect((await getWeight(b, ex, d))?.value).toBe(20)
    expect((await getWeight(b, ex2, d))?.value).toBe(40)
    // Inherited, not copied: nothing is keyed to B.
    expect(await d.weights.where('gymId').equals(b).count()).toBe(0)

    // And editing from B moves the same global weight, in both gyms.
    await saveWeight(b, ex, 25, 'KG', 'global', d)
    expect((await getWeight(a, ex, d))?.value).toBe(25)
    expect((await getWeight(b, ex, d))?.value).toBe(25)
  })

  it('rejects an empty gym name', async () => {
    await expect(createGym('   ', d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('deleting a gym cascades to its exceptions, never to the global weights', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(a, ex, 20, 'KG', 'global', d)
    await saveWeight(b, ex, 15, 'KG', 'gym', d)
    await saveWeight(b, ex, 17.5, 'KG', 'gym', d)

    await deleteGym(b, d)

    expect(await d.weights.where('gymId').equals(b).count()).toBe(0)
    expect(await d.weightHistory.where('gymId').equals(b).count()).toBe(0)
    // The global weight and its history are somebody else's business.
    expect((await getWeight(a, ex, d))?.value).toBe(20)
    expect(await listHistory(a, ex, d)).toHaveLength(1)
  })

  it('deleting the last gym keeps the global weights', async () => {
    const a = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(a, ex, 20, 'KG', 'global', d)

    await deleteGym(a, d)
    const b = await createGym('B', d)

    expect((await getWeight(b, ex, d))?.value).toBe(20)
  })
})

describe('categories', () => {
  it('rejects duplicate names (case-insensitive)', async () => {
    await createCategory('Peito', d)
    await expect(createCategory('peito', d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('rename preserves the reference on exercises', async () => {
    const cat = await createCategory('Peito', d)
    const ex = await createExercise({ name: 'Supino', categoryIds: [cat] }, d)
    await renameCategory(cat, 'Peitoral', d)
    expect((await d.exercises.get(ex))?.categoryIds).toEqual([cat])
    expect((await d.categories.get(cat))?.name).toBe('Peitoral')
  })

  it('delete removes the category from exercises (no reserved bucket)', async () => {
    const bic = await createCategory('Bíceps', d)
    const ante = await createCategory('Antebraço', d)
    const compound = await createExercise({ name: 'Rosca Direta', categoryIds: [bic, ante] }, d)
    const only = await createExercise({ name: 'Rosca Scott', categoryIds: [bic] }, d)

    await deleteCategory(bic, d)

    expect(await d.categories.get(bic)).toBeUndefined()
    // Bíceps is gone from both; the compound keeps Antebraço, the other is now empty.
    expect((await d.exercises.get(compound))?.categoryIds).toEqual([ante])
    expect((await d.exercises.get(only))?.categoryIds).toEqual([])
    // No reserved category was created.
    expect((await listCategories(d)).some((c) => c.name === 'Sem categoria')).toBe(false)
  })

  it('any category can be deleted (nothing reserved)', async () => {
    const c = await createCategory('Qualquer', d)
    await expect(deleteCategory(c, d)).resolves.not.toThrow()
    expect(await listCategories(d)).toHaveLength(0)
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
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    await addPhoto(g, ex, jpeg(), 800, 600, d)
    await deleteExercise(ex, d)
    expect((await d.days.get(day))?.exerciseIds).toEqual([])
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
    expect(await getNote(g, ex, d)).toBeUndefined()
    expect(await listPhotos(g, ex, d)).toHaveLength(0)
    expect(await d.exercises.get(ex)).toBeUndefined()
  })
})

describe('exercise kind', () => {
  it('defaults to strength', async () => {
    const ex = await createExercise({ name: 'Rosca' }, d)
    expect((await d.exercises.get(ex))?.kind).toBe('strength')
  })

  it('creates a cardio exercise when asked', async () => {
    const ex = await createExercise({ name: 'Esteira', kind: 'cardio' }, d)
    expect((await d.exercises.get(ex))?.kind).toBe('cardio')
  })

  it('listCardioExercises returns only cardio, by name', async () => {
    await createExercise({ name: 'Supino' }, d)
    await createExercise({ name: 'Esteira', kind: 'cardio' }, d)
    await createExercise({ name: 'Bicicleta', kind: 'cardio' }, d)
    expect((await listCardioExercises(d)).map((e) => e.name)).toEqual(['Bicicleta', 'Esteira'])
  })

  it('turning an exercise into cardio takes it out of every day', async () => {
    const ex = await createExercise({ name: 'Esteira' }, d)
    const other = await createExercise({ name: 'Supino' }, d)
    const d2 = await createDay({ name: 'Dia 2', exerciseIds: [ex, other] }, d)
    const d4 = await createDay({ name: 'Dia 4', exerciseIds: [ex] }, d)

    const left = await updateExercise(ex, { name: 'Esteira', kind: 'cardio' }, d)

    // The caller gets the days back so it can name them in the confirmation.
    expect(left.map((day) => day.name).sort()).toEqual(['Dia 2', 'Dia 4'])
    expect((await d.days.get(d2))?.exerciseIds).toEqual([other])
    expect((await d.days.get(d4))?.exerciseIds).toEqual([])
  })

  it('daysContaining names the days before the change is made', async () => {
    const ex = await createExercise({ name: 'Esteira' }, d)
    await createDay({ name: 'Dia 2', exerciseIds: [ex] }, d)
    expect((await daysContaining(ex, d)).map((day) => day.name)).toEqual(['Dia 2'])
    // Asking does not change anything.
    expect((await d.exercises.get(ex))?.kind).toBe('strength')
  })

  it('staying strength leaves the days alone', async () => {
    const ex = await createExercise({ name: 'Supino' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    const left = await updateExercise(ex, { name: 'Supino Reto' }, d)
    expect(left).toEqual([])
    expect((await d.days.get(day))?.exerciseIds).toEqual([ex])
  })

  it('the weight survives a trip to cardio and back', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Esteira' }, d)
    await saveWeight(g, ex, 5, 'KG', 'global', d)

    await updateExercise(ex, { name: 'Esteira', kind: 'cardio' }, d)
    // Deliberately NOT deleted — hidden by the UI, not destroyed by the repo.
    expect((await getWeight(g, ex, d))?.value).toBe(5)

    await updateExercise(ex, { name: 'Esteira', kind: 'strength' }, d)
    expect((await getWeight(g, ex, d))?.value).toBe(5)
    expect(await listHistory(g, ex, d)).toHaveLength(1)
  })
})

describe('warmups', () => {
  it('creates, lists by name and updates', async () => {
    await createWarmup({ name: 'Rotação de ombro', url: 'https://x.com/b.gif' }, d)
    const a = await createWarmup({ name: 'Alongamento', url: 'https://x.com/a.png' }, d)
    expect((await listWarmups(d)).map((w) => w.name)).toEqual(['Alongamento', 'Rotação de ombro'])

    await updateWarmup(a, { name: 'Alongamento de peito', url: 'https://x.com/a2.png' }, d)
    expect((await d.warmups.get(a))?.name).toBe('Alongamento de peito')
    expect((await d.warmups.get(a))?.url).toBe('https://x.com/a2.png')
  })

  it('requires a name and an http(s) url', async () => {
    await expect(createWarmup({ name: '', url: 'https://x.com/a.png' }, d)).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(createWarmup({ name: 'A', url: '' }, d)).rejects.toBeInstanceOf(ValidationError)
    await expect(createWarmup({ name: 'A', url: 'x.com/a.png' }, d)).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('accepts a page URL, not just media — the viewer decides how to show it', async () => {
    const id = await createWarmup({ name: 'Vídeo', url: 'https://youtube.com/watch?v=a' }, d)
    expect((await d.warmups.get(id))?.url).toBe('https://youtube.com/watch?v=a')
  })

  it('links the same warmup to several exercises, keeping one record', async () => {
    const w = await createWarmup({ name: 'Rotação', url: 'https://x.com/a.png' }, d)
    const supino = await createExercise({ name: 'Supino', warmupIds: [w] }, d)
    const desenv = await createExercise({ name: 'Desenvolvimento', warmupIds: [w] }, d)

    expect((await d.exercises.get(supino))?.warmupIds).toEqual([w])
    expect((await d.exercises.get(desenv))?.warmupIds).toEqual([w])
    expect(await d.warmups.count()).toBe(1)
    expect((await exercisesUsingWarmup(w, d)).map((e) => e.name).sort()).toEqual([
      'Desenvolvimento',
      'Supino',
    ])
  })

  it('preserves the order they were linked in — it is the paging order', async () => {
    const a = await createWarmup({ name: 'A', url: 'https://x.com/a.png' }, d)
    const b = await createWarmup({ name: 'B', url: 'https://x.com/b.png' }, d)
    const c = await createWarmup({ name: 'C', url: 'https://x.com/c.png' }, d)
    const ex = await createExercise({ name: 'Supino', warmupIds: [c, a, b] }, d)
    expect((await d.exercises.get(ex))?.warmupIds).toEqual([c, a, b])

    await updateExercise(ex, { name: 'Supino', warmupIds: [b, c] }, d)
    expect((await d.exercises.get(ex))?.warmupIds).toEqual([b, c])
  })

  it('defaults to no warmups, and an update that omits them leaves them alone', async () => {
    const w = await createWarmup({ name: 'A', url: 'https://x.com/a.png' }, d)
    const plain = await createExercise({ name: 'Rosca' }, d)
    expect((await d.exercises.get(plain))?.warmupIds).toEqual([])

    const ex = await createExercise({ name: 'Supino', warmupIds: [w] }, d)
    // No `warmupIds` key: this caller is not editing them.
    await updateExercise(ex, { name: 'Supino Reto' }, d)
    expect((await d.exercises.get(ex))?.warmupIds).toEqual([w])
  })

  it('deleting a warmup unlinks it from every exercise instead of blocking', async () => {
    const w = await createWarmup({ name: 'Rotação', url: 'https://x.com/a.png' }, d)
    const other = await createWarmup({ name: 'Outro', url: 'https://x.com/b.png' }, d)
    const supino = await createExercise({ name: 'Supino', warmupIds: [w, other] }, d)
    const desenv = await createExercise({ name: 'Desenvolvimento', warmupIds: [w] }, d)

    await deleteWarmup(w, d)

    expect(await d.warmups.get(w)).toBeUndefined()
    // The other link survives, and nothing points at the deleted record.
    expect((await d.exercises.get(supino))?.warmupIds).toEqual([other])
    expect((await d.exercises.get(desenv))?.warmupIds).toEqual([])
  })

  it('deleting an exercise leaves the warmup for the others', async () => {
    const w = await createWarmup({ name: 'Rotação', url: 'https://x.com/a.png' }, d)
    const supino = await createExercise({ name: 'Supino', warmupIds: [w] }, d)
    const desenv = await createExercise({ name: 'Desenvolvimento', warmupIds: [w] }, d)

    await deleteExercise(supino, d)

    expect(await d.warmups.get(w)).toBeDefined()
    expect((await d.exercises.get(desenv))?.warmupIds).toEqual([w])
  })
})

describe('exercise alternatives', () => {
  /** What each of `ids` lists as its own alternatives. */
  const setsOf = async (ids: number[]) =>
    Promise.all(ids.map(async (id) => (await d.exercises.get(id))?.alternativeIds))

  it('creates the link on BOTH exercises', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    await setAlternatives(reto, [maq], d)
    expect(await setsOf([reto, maq])).toEqual([[maq], [reto]])
  })

  it('accepts alternatives at creation time', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina', alternativeIds: [reto] }, d)
    expect(await setsOf([reto, maq])).toEqual([[maq], [reto]])
  })

  it('one exercise heads SEVERAL unrelated kinds of variation', async () => {
    // The point of the whole design: the bench press swaps for the machine
    // (same movement) and for the fly (same muscle), and those two must not
    // become alternatives of each other by association.
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const cruc = await createExercise({ name: 'Crucifixo' }, d)
    await setAlternatives(reto, [maq, cruc], d)
    expect(await setsOf([reto, maq, cruc])).toEqual([[maq, cruc], [reto], [reto]])
  })

  it('picking a peer that already has alternatives does not absorb them', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const halter = await createExercise({ name: 'Supino Halter' }, d)
    await setAlternatives(reto, [maq], d)
    await setAlternatives(halter, [maq], d)
    // The machine now answers to both, but the barbell and the dumbbell were
    // never declared alternatives of each other.
    expect(await setsOf([reto, maq, halter])).toEqual([[maq], [reto, halter], [maq]])
  })

  it('removing one alternative leaves the others alone', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const cruc = await createExercise({ name: 'Crucifixo' }, d)
    await setAlternatives(reto, [maq, cruc], d)
    await setAlternatives(reto, [maq], d)
    expect(await setsOf([reto, maq, cruc])).toEqual([[maq], [reto], []])
  })

  it("an edit never touches a peer's OTHER alternatives", async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const halter = await createExercise({ name: 'Supino Halter' }, d)
    await setAlternatives(maq, [halter], d) // machine ↔ dumbbell
    await setAlternatives(reto, [maq], d) // barbell ↔ machine
    await setAlternatives(reto, [], d) // …and undone
    // The machine keeps the dumbbell throughout: it was none of that edit's business.
    expect(await setsOf([reto, maq, halter])).toEqual([[], [halter], [maq]])
  })

  it('clearing the list dissolves the pair', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    await setAlternatives(reto, [maq], d)
    await updateExercise(reto, { name: 'Supino Reto', alternativeIds: [] }, d)
    expect(await setsOf([reto, maq])).toEqual([[], []])
  })

  it('updateExercise without the field leaves the alternatives untouched', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    await setAlternatives(reto, [maq], d)
    await updateExercise(reto, { name: 'Supino Reto (barra)' }, d)
    expect(await setsOf([reto, maq])).toEqual([[maq], [reto]])
  })

  it('ignores an id that no longer exists', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    await setAlternatives(reto, [999], d)
    expect(await setsOf([reto])).toEqual([[]])
  })

  it('ignores the exercise itself', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    await setAlternatives(reto, [reto], d)
    expect(await setsOf([reto])).toEqual([[]])
  })

  it('deleting an exercise unlinks it from its peers', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const cruc = await createExercise({ name: 'Crucifixo' }, d)
    await setAlternatives(reto, [maq, cruc], d)
    await deleteExercise(cruc, d)
    expect(await setsOf([reto, maq])).toEqual([[maq], [reto]])
  })

  it('alternatives keep their own per-gym weight and history', async () => {
    const g = await createGym('A', d)
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    await setAlternatives(reto, [maq], d)
    await saveWeight(g, reto, 60, 'KG', 'global', d)
    await saveWeight(g, maq, 45, 'KG', 'global', d)
    await saveWeight(g, reto, 62.5, 'KG', 'global', d)
    expect((await getWeight(g, reto, d))?.value).toBe(62.5)
    expect((await getWeight(g, maq, d))?.value).toBe(45)
    expect(await listHistory(g, maq, d)).toHaveLength(1)
  })

  it('rejects setting alternatives on a missing exercise', async () => {
    await expect(setAlternatives(999, [], d)).rejects.toThrow(ValidationError)
  })
})

describe('exercise notes', () => {
  it('upsert round-trip: save then read back the note', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    expect((await getNote(g, ex, d))?.text).toBe('manter cotovelo fixo')
  })

  it('editing replaces the text (still one record)', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, 'manter cotovelo fixo', d)
    await saveNote(g, ex, 'usar pegada aberta', d)
    expect((await getNote(g, ex, d))?.text).toBe('usar pegada aberta')
    expect(await d.exerciseNotes.where('[gymId+exerciseId]').equals([g, ex]).count()).toBe(1)
  })

  it('trims and saving blank/whitespace text deletes the note', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(g, ex, '  espaçado  ', d)
    expect((await getNote(g, ex, d))?.text).toBe('espaçado')
    await saveNote(g, ex, '   ', d)
    expect(await getNote(g, ex, d)).toBeUndefined()
  })

  it('is isolated per gym', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(a, ex, 'nota da A', d)
    expect((await getNote(a, ex, d))?.text).toBe('nota da A')
    expect(await getNote(b, ex, d)).toBeUndefined()
  })

  it('deleting a gym removes its notes but leaves other gyms untouched', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveNote(a, ex, 'nota da A', d)
    await saveNote(b, ex, 'nota da B', d)
    await deleteGym(a, d)
    expect(await getNote(a, ex, d)).toBeUndefined()
    expect((await getNote(b, ex, d))?.text).toBe('nota da B')
  })
})

describe('exercise photos', () => {
  it('attaches a photo and reads the image back', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(g, ex, jpeg('abc'), 1600, 1200, d)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo).toMatchObject({ gymId: g, exerciseId: ex, width: 1600, height: 1200 })
    expect(photo.type).toBe('image/jpeg')
    expect(photo.size).toBe(3)
    expect(await readBack(photo)).toBe('abc')
  })

  it('stores the image as a file and keeps it out of the record', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(g, ex, jpeg('abc'), 1600, 1200, d)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo.file).toBeTruthy()
    expect(photo.bytes).toBeUndefined()
    expect(await storedPhotoFiles()).toEqual([photo.file])
  })

  it('keeps the image in the record where there is no OPFS', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await withoutOpfs(() => addPhoto(g, ex, jpeg('abc'), 100, 100, d))

    const [photo] = await listPhotos(g, ex, d)
    expect(photo.file).toBeUndefined()
    expect(photo.bytes).toBeDefined()
    expect(await readBack(photo)).toBe('abc')
  })

  it('reads both kinds of record side by side', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(g, ex, jpeg('as-file'), 100, 100, d)
    await withoutOpfs(() => addPhoto(g, ex, jpeg('in-record'), 100, 100, d))

    const photos = await listPhotos(g, ex, d)
    expect(await Promise.all(photos.map(readBack))).toEqual(['in-record', 'as-file'])
  })

  it('leaves no file behind when the record cannot be written', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    // A database whose insert fails: the file is written first, so this is the
    // moment an orphan would be created.
    const failing = {
      exercisePhotos: { add: () => Promise.reject(new Error('nope')) },
    } as unknown as MyOneGymDB

    await expect(addPhoto(g, ex, jpeg('abc'), 100, 100, failing)).rejects.toThrow('nope')
    expect(await storedPhotoFiles()).toEqual([])
  })

  it('keeps many photos per (gym, exercise), newest first', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Leg Press' }, d)
    // Both land in the same millisecond here — the id tie-break is what makes
    // the order deterministic (fake timers would deadlock Dexie's scheduler).
    await addPhoto(g, ex, jpeg('old'), 100, 100, d)
    await addPhoto(g, ex, jpeg('new'), 100, 100, d)

    const photos = await listPhotos(g, ex, d)
    expect(photos).toHaveLength(2)
    expect(await readBack(photos[0])).toBe('new')
    expect(await readBack(photos[1])).toBe('old')
  })

  it('orders by createdAt when the timestamps differ', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Leg Press' }, d)
    // Inserted directly with explicit timestamps: `addPhoto` stamps Date.now(),
    // and this is asserting listPhotos' sort, not the insert. Note the older row
    // gets the LOWER id, so id order alone would put it first — createdAt wins.
    const row = (body: string, createdAt: number) => ({
      gymId: g,
      exerciseId: ex,
      bytes: new TextEncoder().encode(body).buffer as ArrayBuffer,
      type: 'image/jpeg',
      width: 100,
      height: 100,
      size: body.length,
      createdAt,
    })
    await d.exercisePhotos.add(row('old', 1_000))
    await d.exercisePhotos.add(row('new', 9_000))

    const photos = await listPhotos(g, ex, d)
    expect(await readBack(photos[0])).toBe('new')
    expect(await readBack(photos[1])).toBe('old')
  })

  it('is isolated per gym', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 100, 100, d)
    expect(await listPhotos(a, ex, d)).toHaveLength(1)
    expect(await listPhotos(b, ex, d)).toHaveLength(0)
  })

  it('deletes a single photo without touching the others', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const first = await addPhoto(g, ex, jpeg('one'), 100, 100, d)
    await addPhoto(g, ex, jpeg('two'), 100, 100, d)
    await deletePhoto(first, d)

    const photos = await listPhotos(g, ex, d)
    expect(photos).toHaveLength(1)
    expect(await readBack(photos[0])).toBe('two')
  })

  it('deleting a photo leaves the weight and note alone', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await saveWeight(g, ex, 20, 'KG', 'global', d)
    await saveNote(g, ex, 'cotovelo fixo', d)
    const id = await addPhoto(g, ex, jpeg(), 100, 100, d)
    await deletePhoto(id, d)

    expect((await getWeight(g, ex, d))?.value).toBe(20)
    expect((await getNote(g, ex, d))?.text).toBe('cotovelo fixo')
  })

  it('deleting a gym removes its photos but leaves other gyms untouched', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 100, 100, d)
    await addPhoto(b, ex, jpeg(), 100, 100, d)
    await deleteGym(a, d)

    expect(await listPhotos(a, ex, d)).toHaveLength(0)
    expect(await listPhotos(b, ex, d)).toHaveLength(1)
  })

  it('deleting an exercise removes its photos in every gym', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg(), 100, 100, d)
    await addPhoto(b, ex, jpeg(), 100, 100, d)
    await deleteExercise(ex, d)

    expect(await d.exercisePhotos.count()).toBe(0)
  })
})

describe('photo image files', () => {
  it('deleting a photo frees its file and leaves the others alone', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const first = await addPhoto(g, ex, jpeg('one'), 100, 100, d)
    await addPhoto(g, ex, jpeg('two'), 100, 100, d)

    await deletePhoto(first, d)

    const [kept] = await listPhotos(g, ex, d)
    expect(await storedPhotoFiles()).toEqual([kept.file])
  })

  it('deleting a gym frees its files and leaves the other gym intact', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(a, ex, jpeg('a1'), 100, 100, d)
    await addPhoto(a, ex, jpeg('a2'), 100, 100, d)
    await addPhoto(b, ex, jpeg('b1'), 100, 100, d)

    await deleteGym(a, d)

    const [kept] = await listPhotos(b, ex, d)
    expect(await storedPhotoFiles()).toEqual([kept.file])
    expect(await readBack(kept)).toBe('b1')
  })

  it('deleting an exercise frees its files in every gym', async () => {
    const a = await createGym('A', d)
    const b = await createGym('B', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const other = await createExercise({ name: 'Supino' }, d)
    await addPhoto(a, ex, jpeg('a'), 100, 100, d)
    await addPhoto(b, ex, jpeg('b'), 100, 100, d)
    await addPhoto(a, other, jpeg('keep'), 100, 100, d)

    await deleteExercise(ex, d)

    const [kept] = await listPhotos(a, other, d)
    expect(await storedPhotoFiles()).toEqual([kept.file])
  })

  it('sweeps a file no record points at', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const id = await addPhoto(g, ex, jpeg('orphan'), 100, 100, d)
    await addPhoto(g, ex, jpeg('kept'), 100, 100, d)
    // Exactly the state a crash between the two deletion steps leaves behind.
    await d.exercisePhotos.delete(id)

    expect(await sweepPhotoOrphans(d)).toBe(1)

    const [kept] = await listPhotos(g, ex, d)
    expect(await storedPhotoFiles()).toEqual([kept.file])
  })

  it('never sweeps a file a record still points at', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await addPhoto(g, ex, jpeg('a'), 100, 100, d)
    await addPhoto(g, ex, jpeg('b'), 100, 100, d)

    expect(await sweepPhotoOrphans(d)).toBe(0)
    expect(await d.exercisePhotos.count()).toBe(2)
    expect(await storedPhotoFiles()).toHaveLength(2)
  })
})

describe('migrating photos that predate file storage', () => {
  /** A record in the pre-OPFS shape: the image lives in the row itself. */
  const legacy = async (gymId: number, exerciseId: number, body: string) =>
    d.exercisePhotos.add({
      gymId,
      exerciseId,
      bytes: new TextEncoder().encode(body).buffer as ArrayBuffer,
      type: 'image/jpeg',
      width: 100,
      height: 100,
      size: body.length,
      createdAt: Date.now(),
    })

  it('moves the image to a file and drops it from the record', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'antiga')

    expect(await migrateLegacyPhotos(d)).toBe(1)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo.file).toBeTruthy()
    expect(photo.bytes).toBeUndefined()
    expect(photo.size).toBe(6)
    expect(await readBack(photo)).toBe('antiga')
  })

  it('displays a legacy photo even before it is migrated', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'antiga')

    expect(await readBack((await listPhotos(g, ex, d))[0])).toBe('antiga')
  })

  it('is idempotent and leaves migrated photos alone', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'uma')
    await legacy(g, ex, 'outra')

    expect(await migrateLegacyPhotos(d)).toBe(2)
    expect(await migrateLegacyPhotos(d)).toBe(0)

    const photos = await listPhotos(g, ex, d)
    expect(await Promise.all(photos.map(readBack))).toEqual(['outra', 'uma'])
    expect(await storedPhotoFiles()).toHaveLength(2)
  })

  it('picks up where it stopped when it was interrupted', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'uma')
    await withoutOpfs(() => migrateLegacyPhotos(d)) // interrupted: nothing moved
    await legacy(g, ex, 'outra')

    expect(await migrateLegacyPhotos(d)).toBe(2)
    expect((await listPhotos(g, ex, d)).every((p) => p.file && !p.bytes)).toBe(true)
  })

  it('keeps a legacy record readable when there is nowhere to move it', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'antiga')

    expect(await withoutOpfs(() => migrateLegacyPhotos(d))).toBe(0)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo.bytes).toBeDefined()
    expect(await readBack(photo)).toBe('antiga')
  })

  it('migrates and sweeps in one pass at launch', async () => {
    const g = await createGym('A', d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    await legacy(g, ex, 'antiga')
    const orphan = await addPhoto(g, ex, jpeg('orphan'), 100, 100, d)
    await d.exercisePhotos.delete(orphan)

    await maintainPhotoStorage(d)

    const [photo] = await listPhotos(g, ex, d)
    expect(photo.file).toBeTruthy()
    // The migrated file survives the sweep that runs right after it.
    expect(await storedPhotoFiles()).toEqual([photo.file])
    expect(await readBack(photo)).toBe('antiga')
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
    const g = await createGym('A', d)
    const rosca = await createExercise({ name: 'Rosca Direta' }, d)
    const supino = await createExercise({ name: 'Supino' }, d)
    const agachamento = await createExercise({ name: 'Agachamento' }, d)
    await saveWeight(g, rosca, 20, 'KG', 'global', d)
    await saveWeight(g, supino, 40, 'KG', 'global', d)
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
    await saveWeight(g, rosca, 25, 'KG', 'global', d)
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
    const b = await createGym('B', d)
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
    await saveWeight(g, rosca, 22.5, 'KG', 'global', d)
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

  it('history lists completed sessions of every gym, newest first, with counts', async () => {
    const { g, day } = await seedDay()
    const b = await createGym('B', d)
    // one completed in A with 1/3 done
    const s1 = await startSession(g, day, d)
    const e1 = await listSessionEntries(s1, d)
    await setEntryDone(e1[0].id!, true, d)
    await completeSession(s1, d)
    // one completed in B, later
    const s2 = await startSession(b, day, d)
    await completeSession(s2, d)

    // One list, both gyms — the active gym is not a filter on the past.
    const hist = await listSessionSummaries(d)
    expect(hist).toHaveLength(2)
    expect(hist.map((h) => h.gymName)).toEqual(['B', 'A'])
    expect(hist[1]).toMatchObject({ total: 3, done: 1, gymName: 'A' })
    expect(hist[1].session.dayName).toBe('Dia 1')
  })

  it('history is ordered by completion across gyms, not grouped by gym', async () => {
    const { g, day } = await seedDay()
    const b = await createGym('B', d)

    // Interleave: A, then B, then A again. Stamp completedAt directly so the
    // order under test is the data's, not the clock's resolution.
    const ids: number[] = []
    for (const gym of [g, b, g]) {
      const s = await startSession(gym, day, d)
      await completeSession(s, d)
      ids.push(s)
    }
    await d.sessions.update(ids[0], { completedAt: 1_000 })
    await d.sessions.update(ids[1], { completedAt: 2_000 })
    await d.sessions.update(ids[2], { completedAt: 3_000 })

    const hist = await listSessionSummaries(d)
    expect(hist.map((h) => h.session.id)).toEqual([ids[2], ids[1], ids[0]])
    expect(hist.map((h) => h.gymName)).toEqual(['A', 'B', 'A'])
  })

  it('keeps sessions of a deleted gym, reporting a null gym name', async () => {
    // deleteGym does not cascade to sessions. Those workouts happened, so they
    // stay in the history — but with no name to resolve, hence null rather than
    // a blank that a screen would render as a defect.
    const { g, day } = await seedDay()
    const s = await startSession(g, day, d)
    await completeSession(s, d)

    await deleteGym(g, d)

    const hist = await listSessionSummaries(d)
    expect(hist).toHaveLength(1)
    expect(hist[0].gymName).toBeNull()
    expect(hist[0].session.dayName).toBe('Dia 1')
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

describe('cardio sessions', () => {
  async function seedCardio() {
    const g = await createGym('A', d)
    const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, d)
    const supino = await createExercise({ name: 'Supino' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, d)
    return { g, esteira, supino, day }
  }

  it('starts a one-entry session that records its own kind and name', async () => {
    const { g, esteira } = await seedCardio()
    const { sessionId: sid, entryId } = await startCardioSession(g, esteira, d)

    const session = await getSession(sid, d)
    expect(session?.kind).toBe('cardio')
    expect(session?.dayName).toBe('Esteira') // the history has to show something
    expect(session?.dayId).toBeUndefined() // cardio has no day
    const entries = await listSessionEntries(sid, d)
    expect(entries.map((e) => e.exerciseName)).toEqual(['Esteira'])
    // The caller opens this entry directly, so the id it got back must be it.
    expect(entries[0].id).toBe(entryId)
  })

  it('refuses a strength exercise', async () => {
    const { g, supino } = await seedCardio()
    await expect(startCardioSession(g, supino, d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('refuses an exercise that does not exist', async () => {
    const { g } = await seedCardio()
    await expect(startCardioSession(g, 9999, d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('one active session per gym holds across the two kinds', async () => {
    const { g, esteira, day } = await seedCardio()
    await startSession(g, day, d)
    // A cardio cannot start on top of a strength workout...
    await expect(startCardioSession(g, esteira, d)).rejects.toBeInstanceOf(ValidationError)
    expect(await d.sessions.count()).toBe(1)
  })

  it('a strength workout cannot start on top of a cardio either', async () => {
    const { g, esteira, day } = await seedCardio()
    await startCardioSession(g, esteira, d)
    await expect(startSession(g, day, d)).rejects.toBeInstanceOf(ValidationError)
  })

  it('completing marks the single entry done — no ticking first', async () => {
    const { g, esteira } = await seedCardio()
    const { sessionId: sid } = await startCardioSession(g, esteira, d)
    await completeSession(sid, d)

    const session = await getSession(sid, d)
    expect(session?.status).toBe('completed')
    expect(session?.completedAt).toBeGreaterThan(0)
    expect((await listSessionEntries(sid, d)).every((e) => e.done)).toBe(true)
  })

  it('completing a strength session does NOT tick its entries', async () => {
    const { g, day } = await seedCardio()
    const sid = await startSession(g, day, d)
    await completeSession(sid, d)
    // The runner governs which entries are done; completion must not decide.
    expect((await listSessionEntries(sid, d)).every((e) => !e.done)).toBe(true)
  })

  it('frees the gym once completed', async () => {
    const { g, esteira } = await seedCardio()
    const { sessionId: first } = await startCardioSession(g, esteira, d)
    await completeSession(first, d)
    await expect(startCardioSession(g, esteira, d)).resolves.toMatchObject({
      sessionId: expect.any(Number),
      entryId: expect.any(Number),
    })
  })
})

describe('sessions with alternatives', () => {
  /** Dia 1 = Rosca, Supino Reto (alternates with Máquina, which is NOT in the
   *  day), Tríceps. The alternative deliberately stays out of the day. */
  async function seedDay() {
    const g = await createGym('A', d)
    const rosca = await createExercise({ name: 'Rosca Direta' }, d)
    const reto = await createExercise({ name: 'Supino Reto' }, d)
    const maq = await createExercise({ name: 'Supino Máquina' }, d)
    const triceps = await createExercise({ name: 'Tríceps Corda' }, d)
    await setAlternatives(reto, [maq], d)
    await saveWeight(g, reto, 60, 'KG', 'global', d)
    await saveWeight(g, maq, 45, 'KG', 'global', d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [rosca, reto, triceps] }, d)
    return { g, rosca, reto, maq, triceps, day }
  }

  it('an alternative does not add itself to the session', async () => {
    const { g, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    // Exactly the day's three exercises — the machine press is not one of them.
    expect(entries.map((e) => e.exerciseName)).toEqual([
      'Rosca Direta',
      'Supino Reto',
      'Tríceps Corda',
    ])
  })

  it('swap rewrites the exercise and its name snapshot', async () => {
    const { g, maq, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[1]
    await swapEntryExercise(entry.id!, maq, d)
    const after = await getSessionEntry(entry.id!, d)
    expect(after?.exerciseId).toBe(maq)
    expect(after?.exerciseName).toBe('Supino Máquina')
  })

  it('swap preserves the done state and the entry count', async () => {
    const { g, maq, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[1]
    await setEntryDone(entry.id!, true, d)
    await swapEntryExercise(entry.id!, maq, d)
    const after = await getSessionEntry(entry.id!, d)
    expect(after?.done).toBe(true)
    expect(await listSessionEntries(sid, d)).toHaveLength(3)
  })

  it('the swapped-in exercise can be swapped back (the link is symmetric)', async () => {
    const { g, reto, maq, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[1]
    await swapEntryExercise(entry.id!, maq, d)
    await swapEntryExercise(entry.id!, reto, d)
    expect((await getSessionEntry(entry.id!, d))?.exerciseName).toBe('Supino Reto')
  })

  it('the session counts the same lines the day has', async () => {
    const { g, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entries = await listSessionEntries(sid, d)
    for (const e of entries) await setEntryDone(e.id!, true, d)
    await completeSession(sid, d)
    const [summary] = await listSessionSummaries(d)
    expect(summary.total).toBe(3)
    expect(summary.done).toBe(3)
  })

  it('rejects swapping to an exercise that is not an alternative', async () => {
    const { g, rosca, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[1] // Supino Reto
    await expect(swapEntryExercise(entry.id!, rosca, d)).rejects.toThrow(ValidationError)
  })

  it('rejects swapping from an exercise that has no alternatives', async () => {
    const { g, maq, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[0] // Rosca
    await expect(swapEntryExercise(entry.id!, maq, d)).rejects.toThrow(ValidationError)
  })

  it('rejects swapping once the session is completed', async () => {
    const { g, maq, day } = await seedDay()
    const sid = await startSession(g, day, d)
    const entry = (await listSessionEntries(sid, d))[1]
    await setEntryDone(entry.id!, true, d)
    await completeSession(sid, d)
    await expect(swapEntryExercise(entry.id!, maq, d)).rejects.toThrow(ValidationError)
  })
})

describe('hasAnyRegisteredData', () => {
  it('is false for an empty database', async () => {
    expect(await hasAnyRegisteredData(d)).toBe(false)
  })

  it('is true as soon as any gym, category, exercise, or day exists', async () => {
    await createGym('A', d)
    expect(await hasAnyRegisteredData(d)).toBe(true)
  })

  it('is true from a category alone (no gym yet)', async () => {
    await createCategory('Peito', d)
    expect(await hasAnyRegisteredData(d)).toBe(true)
  })
})

describe('exercise videos', () => {
  const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  const ig = 'https://www.instagram.com/reel/Cabc123/'

  it('stores several videos on one exercise, in the order given', async () => {
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: yt, title: 'pegada fechada' }, { url: ig }] },
      d,
    )
    const ex = await d.exercises.get(id)
    expect(ex?.videos.map((v) => v.url)).toEqual([yt, ig])
    expect(ex?.videos[0].title).toBe('pegada fechada')
  })

  it('keeps the order across an update — it is the paging order', async () => {
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }, { url: ig }] }, d)
    await updateExercise(id, { name: 'Supino', videos: [{ url: ig }, { url: yt }] }, d)
    expect((await d.exercises.get(id))?.videos.map((v) => v.url)).toEqual([ig, yt])
  })

  it('defaults to none, and an update that omits them leaves them alone', async () => {
    const plain = await createExercise({ name: 'Rosca' }, d)
    expect((await d.exercises.get(plain))?.videos).toEqual([])

    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }] }, d)
    // No `videos` key: this caller is not editing them.
    await updateExercise(id, { name: 'Supino Reto' }, d)
    expect((await d.exercises.get(id))?.videos.map((v) => v.url)).toEqual([yt])
  })

  it('stores the time range, and keeps each end optional', async () => {
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: yt, startSec: 130, endSec: 165 }, { url: yt, startSec: 90 }] },
      d,
    )
    const ex = await d.exercises.get(id)
    expect(ex?.videos[0]).toMatchObject({ startSec: 130, endSec: 165 })
    // "from here on" is a real request; the missing end is not a hole.
    expect(ex?.videos[1]).toMatchObject({ startSec: 90 })
    expect(ex?.videos[1].endSec).toBeUndefined()
  })

  it('keeps a stored range even when the URL cannot honour it', async () => {
    // Throwing away typed numbers because an address was edited is the worse of
    // the two surprises — and switching back must restore the behaviour.
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt, startSec: 10, endSec: 20 }] }, d)
    await updateExercise(id, { name: 'Supino', videos: [{ url: ig, startSec: 10, endSec: 20 }] }, d)
    expect((await d.exercises.get(id))?.videos[0]).toMatchObject({ startSec: 10, endSec: 20 })
  })

  it('requires a URL and rejects one that is not http(s)', async () => {
    await expect(createExercise({ name: 'A', videos: [{ url: '  ' }] }, d)).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(
      createExercise({ name: 'A', videos: [{ url: 'javascript:alert(1)' }] }, d),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('accepts a video with no title', async () => {
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }] }, d)
    expect((await d.exercises.get(id))?.videos[0].title).toBeUndefined()
  })

  it('rejects an end at or before its start', async () => {
    await expect(
      createExercise({ name: 'A', videos: [{ url: yt, startSec: 120, endSec: 60 }] }, d),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      createExercise({ name: 'A', videos: [{ url: yt, startSec: 60, endSec: 60 }] }, d),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects a negative second', async () => {
    await expect(
      createExercise({ name: 'A', videos: [{ url: yt, startSec: -1 }] }, d),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('leaves nothing behind when the exercise is deleted', async () => {
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }, { url: ig }] }, d)
    await deleteExercise(id, d)
    expect(await d.exercises.get(id)).toBeUndefined()
    // The videos live inside the record, so there is no orphan to look for —
    // this asserts exactly that there is no second place to check.
    expect((await d.exercises.toArray()).flatMap((e) => e.videos)).toEqual([])
  })

  it('does not write a half-updated exercise when a video is invalid', async () => {
    const id = await createExercise({ name: 'Supino', videos: [{ url: yt }] }, d)
    await expect(
      updateExercise(id, { name: 'Renomeado', videos: [{ url: yt, startSec: 5, endSec: 1 }] }, d),
    ).rejects.toBeInstanceOf(ValidationError)
    const ex = await d.exercises.get(id)
    expect(ex?.name).toBe('Supino')
    expect(ex?.videos.map((v) => v.url)).toEqual([yt])
  })
})
