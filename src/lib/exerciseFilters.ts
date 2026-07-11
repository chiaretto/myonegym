import type { Day, Exercise } from '../db/types'

export type CategoryFilter = number | 'none' | 'all'
export type DayFilter = number | 'none' | 'all'

export interface ExerciseFilters {
  search?: string
  categoryId?: CategoryFilter
  dayId?: DayFilter
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
 * Narrows `exercises` by name search, category, and training day — all combined
 * with AND. Pure view filter: never mutates `exercises` or `days`.
 */
export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters,
  days: Day[],
): Exercise[] {
  const { search = '', categoryId = 'all', dayId = 'all' } = filters

  return exercises.filter((exercise) => {
    if (!matchesSearch(exercise.name, search)) return false

    if (categoryId === 'none') {
      if (exercise.categoryId != null) return false
    } else if (categoryId !== 'all') {
      if (exercise.categoryId !== categoryId) return false
    }

    if (dayId === 'none') {
      if (days.some((d) => d.exerciseIds.includes(exercise.id!))) return false
    } else if (dayId !== 'all') {
      if (!days.some((d) => d.id === dayId && d.exerciseIds.includes(exercise.id!))) return false
    }

    return true
  })
}
