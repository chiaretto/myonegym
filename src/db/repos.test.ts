import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from './db'
import {
  ValidationError,
  createCategory,
  createDay,
  createExercise,
  createGym,
  deleteCategory,
  deleteExercise,
  deleteGym,
  ensureUncategorized,
  getWeight,
  listCategories,
  listDays,
  listHistory,
  renameCategory,
  saveWeight,
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

  it('delete removes from days and drops weights + history', async () => {
    const g = await createGym('A', undefined, d)
    const ex = await createExercise({ name: 'Rosca' }, d)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, d)
    await saveWeight(g, ex, 20, 'KG', d)
    await deleteExercise(ex, d)
    expect((await d.days.get(day))?.exerciseIds).toEqual([])
    expect(await getWeight(g, ex, d)).toBeUndefined()
    expect(await listHistory(g, ex, d)).toHaveLength(0)
    expect(await d.exercises.get(ex)).toBeUndefined()
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
})
