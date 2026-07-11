import { describe, expect, it } from 'vitest'
import { filterExercises, matchesSearch, normalizeForSearch } from './exerciseFilters'
import type { Day, Exercise } from '../db/types'

const exercises: Exercise[] = [
  { id: 1, name: 'Rosca Direta', categoryId: 1 },
  { id: 2, name: 'Rosca Scott', categoryId: 1 },
  { id: 3, name: 'Supino Reto', categoryId: 2 },
  { id: 4, name: 'Elevação Lateral', categoryId: 2 },
  { id: 5, name: 'Alongamento' }, // no category
]

const days: Day[] = [
  { id: 1, name: 'Dia 1', exerciseIds: [3, 2] },
  { id: 2, name: 'Dia 2', exerciseIds: [1] },
]

describe('normalizeForSearch', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeForSearch('Elevação')).toBe('elevacao')
  })
  it('trims whitespace', () => {
    expect(normalizeForSearch('  Rosca  ')).toBe('rosca')
  })
})

describe('matchesSearch', () => {
  it('matches a case-insensitive substring', () => {
    expect(matchesSearch('Rosca Direta', 'rosca')).toBe(true)
    expect(matchesSearch('Rosca Direta', 'ROSCA')).toBe(true)
  })
  it('matches accent-insensitively', () => {
    expect(matchesSearch('Elevação Lateral', 'elevacao')).toBe(true)
  })
  it('does not match unrelated text', () => {
    expect(matchesSearch('Supino Reto', 'rosca')).toBe(false)
  })
  it('matches everything when the search is empty', () => {
    expect(matchesSearch('Supino Reto', '')).toBe(true)
    expect(matchesSearch('Supino Reto', '   ')).toBe(true)
  })
})

describe('filterExercises', () => {
  it('narrows by name search', () => {
    const result = filterExercises(exercises, { search: 'rosca' }, days)
    expect(result.map((e) => e.name)).toEqual(['Rosca Direta', 'Rosca Scott'])
  })

  it('narrows by a specific category', () => {
    const result = filterExercises(exercises, { categoryId: 1 }, days)
    expect(result.map((e) => e.name)).toEqual(['Rosca Direta', 'Rosca Scott'])
  })

  it('narrows by "no category"', () => {
    const result = filterExercises(exercises, { categoryId: 'none' }, days)
    expect(result.map((e) => e.name)).toEqual(['Alongamento'])
  })

  it('"all" categories applies no category filter', () => {
    const result = filterExercises(exercises, { categoryId: 'all' }, days)
    expect(result).toHaveLength(exercises.length)
  })

  it('narrows by a specific training day', () => {
    const result = filterExercises(exercises, { dayId: 2 }, days)
    expect(result.map((e) => e.name)).toEqual(['Rosca Direta'])
  })

  it('narrows by "no day"', () => {
    const result = filterExercises(exercises, { dayId: 'none' }, days)
    expect(result.map((e) => e.name)).toEqual(['Elevação Lateral', 'Alongamento'])
  })

  it('"all" days applies no day filter', () => {
    const result = filterExercises(exercises, { dayId: 'all' }, days)
    expect(result).toHaveLength(exercises.length)
  })

  it('combines search, category, and day filters with AND', () => {
    const result = filterExercises(
      exercises,
      { search: 'rosca', categoryId: 1, dayId: 1 },
      days,
    )
    expect(result.map((e) => e.name)).toEqual(['Rosca Scott'])
  })

  it('returns an empty array when no exercise matches', () => {
    const result = filterExercises(exercises, { search: 'inexistente' }, days)
    expect(result).toEqual([])
  })

  it('does not mutate the input arrays', () => {
    const exercisesCopy = [...exercises]
    const daysCopy = [...days]
    filterExercises(exercises, { search: 'rosca', categoryId: 1, dayId: 2 }, days)
    expect(exercises).toEqual(exercisesCopy)
    expect(days).toEqual(daysCopy)
  })
})
