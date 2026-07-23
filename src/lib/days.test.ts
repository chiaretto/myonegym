import { describe, expect, it } from 'vitest'
import { dayCategoryNames, dayNamesForExercise, daySubtitle, nextWorkoutDayId } from './days'
import type { Category, Day, Exercise } from '../db/types'

const cats = new Map<number, Category>([
  [1, { id: 1, name: 'Peito' }],
  [2, { id: 2, name: 'Tríceps' }],
  [3, { id: 3, name: 'Costas' }],
])
const exs = new Map<number, Exercise>([
  [10, { id: 10, name: 'Supino', categoryIds: [1] }],
  [11, { id: 11, name: 'Crucifixo', categoryIds: [1] }],
  [12, { id: 12, name: 'Tríceps Corda', categoryIds: [2] }],
  [13, { id: 13, name: 'Puxada', categoryIds: [3] }],
  [14, { id: 14, name: 'Sem categoria', categoryIds: [] }], // no category
  [15, { id: 15, name: 'Supino Inclinado', categoryIds: [1, 2] }], // compound: Peito + Tríceps
])
const day = (exerciseIds: number[]): Day => ({ id: 1, name: 'Dia 1', exerciseIds })

describe('dayCategoryNames', () => {
  it('distinct categories in first-appearance order', () => {
    expect(dayCategoryNames(day([10, 12]), exs, cats)).toEqual(['Peito', 'Tríceps'])
  })
  it('does not repeat a category', () => {
    expect(dayCategoryNames(day([10, 11]), exs, cats)).toEqual(['Peito'])
  })
  it('ignores uncategorized and unknown exercises', () => {
    expect(dayCategoryNames(day([14, 999, 13]), exs, cats)).toEqual(['Costas'])
  })
  it('order follows the exercise order', () => {
    expect(dayCategoryNames(day([13, 10]), exs, cats)).toEqual(['Costas', 'Peito'])
  })
  it('a compound exercise contributes all its categories, in order', () => {
    // Peito(1) then Tríceps(2) both come from the single exercise 15.
    expect(dayCategoryNames(day([15]), exs, cats)).toEqual(['Peito', 'Tríceps'])
  })

  it('empty when the day has no categorized exercises', () => {
    expect(dayCategoryNames(day([14]), exs, cats)).toEqual([])
  })
})

describe('daySubtitle', () => {
  it('joins derived categories with a middot', () => {
    expect(daySubtitle(day([10, 12]), exs, cats)).toBe('Peito · Tríceps')
  })
  it('falls back to the exercise count when none are categorized', () => {
    expect(daySubtitle(day([14, 14]), exs, cats)).toBe('2 exercícios')
  })
})

describe('dayNamesForExercise', () => {
  const days: Day[] = [
    { id: 1, name: 'Dia 1', exerciseIds: [10, 12] },
    { id: 2, name: 'Dia 2', exerciseIds: [11] },
    { id: 3, name: 'Dia 3', exerciseIds: [10, 13] },
  ]
  it('returns the day names an exercise is in, in the given order', () => {
    expect(dayNamesForExercise(10, days)).toEqual(['Dia 1', 'Dia 3'])
    expect(dayNamesForExercise(11, days)).toEqual(['Dia 2'])
  })
  it('returns empty when the exercise is in no day', () => {
    expect(dayNamesForExercise(99, days)).toEqual([])
  })
})

describe('nextWorkoutDayId', () => {
  const days: Day[] = [
    { id: 1, name: 'Dia 1', exerciseIds: [] },
    { id: 2, name: 'Dia 2', exerciseIds: [] },
    { id: 3, name: 'Dia 3', exerciseIds: [] },
  ]

  it('features the first day when there is no session history', () => {
    expect(nextWorkoutDayId(days, null)).toBe(1)
    expect(nextWorkoutDayId(days, undefined)).toBe(1)
  })

  it('advances to the day after the most recent session', () => {
    expect(nextWorkoutDayId(days, 1)).toBe(2)
    expect(nextWorkoutDayId(days, 2)).toBe(3)
  })

  it('wraps to the first day after the last day', () => {
    expect(nextWorkoutDayId(days, 3)).toBe(1)
  })

  it('falls back to the first day when the last-session day was deleted', () => {
    expect(nextWorkoutDayId(days, 999)).toBe(1)
  })

  it('returns null when there are no days', () => {
    expect(nextWorkoutDayId([], null)).toBeNull()
    expect(nextWorkoutDayId([], 2)).toBeNull()
  })

  it('handles a single-day list (always wraps back to it)', () => {
    const one: Day[] = [{ id: 5, name: 'Único', exerciseIds: [] }]
    expect(nextWorkoutDayId(one, null)).toBe(5)
    expect(nextWorkoutDayId(one, 5)).toBe(5)
  })
})
