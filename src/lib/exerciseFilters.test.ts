import { describe, expect, it } from 'vitest'
import { filterExercises, matchesSearch, normalizeForSearch } from './exerciseFilters'
import type { Day, Exercise } from '../db/types'

const exercises: Exercise[] = [
  { id: 1, name: 'Rosca Direta', kind: 'strength', categoryIds: [1], alternativeIds: [], videos: [] },
  { id: 2, name: 'Rosca Scott', kind: 'strength', categoryIds: [1], alternativeIds: [], videos: [] },
  { id: 3, name: 'Supino Reto', kind: 'strength', categoryIds: [2], alternativeIds: [], videos: [] },
  { id: 4, name: 'Elevação Lateral', kind: 'strength', categoryIds: [2], alternativeIds: [], videos: [] },
  { id: 5, name: 'Alongamento', kind: 'strength', categoryIds: [], alternativeIds: [], videos: [] }, // no category
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
    const result = filterExercises(exercises, { category: 1 }, days)
    expect(result.map((e) => e.name)).toEqual(['Rosca Direta', 'Rosca Scott'])
  })

  it('tolerates an exercise with a missing categoryIds (old/partial data)', () => {
    // A view filter must not crash on unexpected data shape — such a record is
    // treated as uncategorized. (Regression: selecting "Sem categoria" threw.)
    const messy: Exercise[] = [
      { id: 1, name: 'Legado', kind: 'strength', categoryIds: undefined, alternativeIds: [], videos: [] } as unknown as Exercise,
      { id: 2, name: 'Peito', kind: 'strength', categoryIds: [1], alternativeIds: [], videos: [] },
    ]
    expect(() => filterExercises(messy, { category: 'none' }, days)).not.toThrow()
    expect(filterExercises(messy, { category: 'none' }, days).map((e) => e.name)).toEqual(['Legado'])
    expect(filterExercises(messy, { category: 1 }, days).map((e) => e.name)).toEqual(['Peito'])
  })

  it('a specific category matches any exercise that includes it (compound)', () => {
    const compound: Exercise[] = [
      { id: 1, name: 'Rosca Direta', kind: 'strength', categoryIds: [1], alternativeIds: [], videos: [] },
      { id: 2, name: 'Remada', kind: 'strength', categoryIds: [2, 1], alternativeIds: [], videos: [] }, // includes cat 1
      { id: 3, name: 'Supino', kind: 'strength', categoryIds: [2], alternativeIds: [], videos: [] }, // does not
    ]
    const result = filterExercises(compound, { category: 1 }, days)
    expect(result.map((e) => e.id).sort()).toEqual([1, 2])
  })

  it('narrows by "no category"', () => {
    const result = filterExercises(exercises, { category: 'none' }, days)
    expect(result.map((e) => e.name)).toEqual(['Alongamento'])
  })

  it('"all" categories applies no category filter', () => {
    const result = filterExercises(exercises, { category: 'all' }, days)
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
      { search: 'rosca', category: 1, dayId: 1 },
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
    filterExercises(exercises, { search: 'rosca', category: 1, dayId: 2 }, days)
    expect(exercises).toEqual(exercisesCopy)
    expect(days).toEqual(daysCopy)
  })
})

describe('filter by kind', () => {
  const esteira: Exercise = {
    id: 6,
    name: 'Esteira',
    kind: 'cardio',
    categoryIds: [2],
    alternativeIds: [],
    videos: [],
  }
  const mixed = [...exercises, esteira]

  it('narrows to Força or to Cardio', () => {
    expect(filterExercises(mixed, { kind: 'cardio' }, days).map((e) => e.name)).toEqual(['Esteira'])
    expect(filterExercises(mixed, { kind: 'strength' }, days).map((e) => e.name)).not.toContain(
      'Esteira',
    )
    expect(filterExercises(mixed, { kind: 'strength' }, days)).toHaveLength(exercises.length)
  })

  it('does not narrow at all with "all", nor when absent', () => {
    expect(filterExercises(mixed, { kind: 'all' }, days)).toHaveLength(mixed.length)
    expect(filterExercises(mixed, {}, days)).toHaveLength(mixed.length)
  })

  it('treats a record with no kind as Força, like everything else does', () => {
    const legacy = [
      { id: 99, name: 'Antigo', categoryIds: [], alternativeIds: [], videos: [] } as unknown as Exercise,
    ]
    expect(filterExercises(legacy, { kind: 'strength' }, days)).toHaveLength(1)
    expect(filterExercises(legacy, { kind: 'cardio' }, days)).toHaveLength(0)
  })

  it('combines with the other filters using AND', () => {
    // Cardio AND a category the cardio is in → found; with the other category → not.
    expect(filterExercises(mixed, { kind: 'cardio', category: 2 }, days).map((e) => e.name)).toEqual(
      ['Esteira'],
    )
    expect(filterExercises(mixed, { kind: 'cardio', category: 1 }, days)).toEqual([])
    expect(filterExercises(mixed, { kind: 'cardio', search: 'rosca' }, days)).toEqual([])
  })
})
