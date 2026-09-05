import { describe, expect, it } from 'vitest'
import {
  filterExercises,
  filtersFromParams,
  filtersToParams,
  matchesSearch,
  normalizeForSearch,
  type ExerciseFilters,
} from './exerciseFilters'
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

describe('filters in the URL', () => {
  const roundTrip = (f: ExerciseFilters) => filtersFromParams(filtersToParams(f))

  it('writes only what actually narrows', () => {
    // The bare route is the normal case, not a special one.
    expect(filtersToParams({}).toString()).toBe('')
    expect(
      filtersToParams({ search: '', category: 'all', dayId: 'all', kind: 'all' }).toString(),
    ).toBe('')
    expect(filtersToParams({ search: '   ' }).toString()).toBe('')
  })

  it('round-trips every kind of value', () => {
    const cases: ExerciseFilters[] = [
      { search: 'rosca' },
      { category: 10001 },
      { category: 'none' },
      { dayId: 42 },
      { dayId: 'none' },
      { kind: 'cardio' },
      { kind: 'strength' },
      { search: 'elevação', category: 10001, dayId: 'none', kind: 'cardio' },
    ]
    for (const f of cases) {
      const back = roundTrip(f)
      expect(back.search, JSON.stringify(f)).toBe(f.search ?? '')
      expect(back.category, JSON.stringify(f)).toBe(f.category ?? 'all')
      expect(back.dayId, JSON.stringify(f)).toBe(f.dayId ?? 'all')
      expect(back.kind, JSON.stringify(f)).toBe(f.kind ?? 'all')
    }
  })

  it('reads an empty query as no filter at all', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual({
      search: '',
      category: 'all',
      dayId: 'all',
      kind: 'all',
    })
  })

  it('treats anything unreadable as absent, rather than refusing', () => {
    // These addresses get shared, truncated and hand-edited. Refusing to open a
    // screen over a bad parameter trades the whole page for one narrowing.
    const bad = new URLSearchParams('cat=abc&day=-1&kind=voar&q=')
    expect(filtersFromParams(bad)).toEqual({
      search: '',
      category: 'all',
      dayId: 'all',
      kind: 'all',
    })
    expect(filtersFromParams(new URLSearchParams('cat=0'))).toMatchObject({ category: 'all' })
    expect(filtersFromParams(new URLSearchParams('cat=1.5'))).toMatchObject({ category: 'all' })
  })

  it('keeps a search that only a filter would trim', () => {
    // `matchesSearch` trims; the address carries what was typed.
    expect(filtersFromParams(filtersToParams({ search: ' rosca ' })).search).toBe(' rosca ')
  })

  it('produces the address the screens actually build', () => {
    const params = filtersToParams({ search: 'rosca', category: 10001, kind: 'cardio' })
    expect(params.get('q')).toBe('rosca')
    expect(params.get('cat')).toBe('10001')
    expect(params.get('kind')).toBe('cardio')
    expect(params.get('day')).toBeNull()
  })
})

/**
 * The list and the walk must not diverge.
 *
 * They share one `filterExercises`, and the address is what carries the
 * arguments from one screen to the other. This is the seam where that can break:
 * a filter that survives the round trip in shape but not in meaning would give
 * the walk a different set from the one that was on screen — silently, and only
 * for whoever had that filter on.
 */
describe('the walk sees exactly what the list showed', () => {
  const cases: ExerciseFilters[] = [
    {},
    { search: 'rosca' },
    { search: 'ELEVAÇÃO' },
    { category: 1 },
    { category: 'none' },
    { dayId: 1 },
    { dayId: 'none' },
    { kind: 'cardio' },
    { kind: 'strength' },
    { search: 'a', category: 1, dayId: 'none', kind: 'strength' },
  ]

  it('gives the same exercises, in the same order, through the address', () => {
    const mixed = [
      ...exercises,
      {
        id: 6,
        name: 'Esteira',
        kind: 'cardio',
        categoryIds: [2],
        alternativeIds: [],
        videos: [],
      } as Exercise,
    ]
    for (const f of cases) {
      const onScreen = filterExercises(mixed, f, days)
      const afterTrip = filterExercises(mixed, filtersFromParams(filtersToParams(f)), days)
      expect(afterTrip.map((e) => e.id), JSON.stringify(f)).toEqual(onScreen.map((e) => e.id))
    }
  })
})
