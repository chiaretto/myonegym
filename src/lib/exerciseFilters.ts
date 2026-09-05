import type { Day, Exercise, ExerciseKind } from '../db/types'

export type CategoryFilter = number | 'none' | 'all'
export type DayFilter = number | 'none' | 'all'
/** Força or Cardio, or neither narrowing — there is no "sem tipo": every
 *  exercise has one, and an absent field means Força (see `ExerciseKind`). */
export type KindFilter = ExerciseKind | 'all'

export interface ExerciseFilters {
  search?: string
  category?: CategoryFilter
  dayId?: DayFilter
  kind?: KindFilter
}

/** Lowercases and strips diacritics, so "Elevação" and "elevacao" compare equal. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Case-insensitive, accent-insensitive substring match. Empty search matches everything. */
export function matchesSearch(name: string, search: string): boolean {
  const query = normalizeForSearch(search)
  if (!query) return true
  return normalizeForSearch(name).includes(query)
}

/**
 * Narrows `exercises` by name search, category, training day and kind — all
 * combined with AND. Pure view filter: never mutates `exercises` or `days`.
 */
export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters,
  days: Day[],
): Exercise[] {
  const { search = '', category = 'all', dayId = 'all', kind = 'all' } = filters

  return exercises.filter((exercise) => {
    if (!matchesSearch(exercise.name, search)) return false

    // An exercise with no `kind` is Força — the same default the record, the
    // form and the v10 upgrade use, so the filter cannot disagree with them
    // about a partial row.
    if (kind !== 'all' && (exercise.kind ?? 'strength') !== kind) return false

    // Guard against unexpected data shape (old/partial records where categoryIds
    // is missing) — such an exercise is treated as uncategorized, never a crash.
    const cats = exercise.categoryIds ?? []
    if (category === 'none') {
      if (cats.length > 0) return false
    } else if (category !== 'all') {
      // A specific category matches any exercise that INCLUDES it.
      if (!cats.includes(category)) return false
    }

    if (dayId === 'none') {
      if (days.some((d) => d.exerciseIds.includes(exercise.id!))) return false
    } else if (dayId !== 'all') {
      if (!days.some((d) => d.id === dayId && d.exerciseIds.includes(exercise.id!))) return false
    }

    return true
  })
}

/* ------------------------------------------------------- filters in the URL */

/**
 * The filters as query parameters, and back.
 *
 * They live in the address so a **walk** through the list survives what
 * component state does not: a reload, and a shared link. It is the decision the
 * exercise detail already took with the day it was opened from — same reason,
 * same shape.
 *
 * A filter that narrows **nothing** is not written. An address only carries what
 * was actually asked for, so the bare route stays the normal case rather than a
 * special one, and `?q=&cat=all&day=all&kind=all` never appears in anybody's
 * history.
 *
 * Reading is deliberately **forgiving**: anything absent or unreadable is "no
 * filter". These addresses get shared, truncated and hand-edited, and a screen
 * that refuses to open over a bad query parameter would be trading the whole
 * page for one narrowing nobody would miss.
 */
const PARAM = { search: 'q', category: 'cat', dayId: 'day', kind: 'kind' } as const

export function filtersToParams(filters: ExerciseFilters): URLSearchParams {
  const params = new URLSearchParams()
  const { search = '', category = 'all', dayId = 'all', kind = 'all' } = filters
  if (search.trim()) params.set(PARAM.search, search)
  if (category !== 'all') params.set(PARAM.category, String(category))
  if (dayId !== 'all') params.set(PARAM.dayId, String(dayId))
  if (kind !== 'all') params.set(PARAM.kind, kind)
  return params
}

/** `'none'`, a positive id, or `'all'` for everything else. */
function readScopedFilter(raw: string | null): number | 'none' | 'all' {
  if (raw === 'none') return 'none'
  const id = Number(raw)
  return raw !== null && raw !== '' && Number.isInteger(id) && id > 0 ? id : 'all'
}

export function filtersFromParams(params: URLSearchParams): ExerciseFilters {
  const kind = params.get(PARAM.kind)
  return {
    search: params.get(PARAM.search) ?? '',
    category: readScopedFilter(params.get(PARAM.category)),
    dayId: readScopedFilter(params.get(PARAM.dayId)),
    kind: kind === 'strength' || kind === 'cardio' ? kind : 'all',
  }
}
