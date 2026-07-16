import type { Category, Day, Exercise } from '../db/types'

/**
 * Distinct category names of a day's exercises, in first-appearance order
 * (following the day's exercise order). Exercises without a category — or whose
 * category no longer exists — are ignored.
 */
export function dayCategoryNames(
  day: Day,
  exMap: Map<number, Exercise>,
  catMap: Map<number, Category>,
): string[] {
  const seen = new Set<number>()
  const names: string[] = []
  for (const exId of day.exerciseIds) {
    const catId = exMap.get(exId)?.categoryId
    if (catId == null || seen.has(catId)) continue
    const name = catMap.get(catId)?.name
    if (!name) continue
    seen.add(catId)
    names.push(name)
  }
  return names
}

/**
 * Secondary line for a day in listings: the derived categories joined by " · ",
 * or the exercise count when the day has no categorized exercises.
 */
export function daySubtitle(
  day: Day,
  exMap: Map<number, Exercise>,
  catMap: Map<number, Category>,
): string {
  const cats = dayCategoryNames(day, exMap, catMap)
  return cats.length ? cats.join(' · ') : `${day.exerciseIds.length} exercícios`
}

/**
 * Names of the training days an exercise belongs to, in the given days' order
 * (`days` is expected already sorted for display).
 */
export function dayNamesForExercise(exerciseId: number, days: Day[]): string[] {
  return days.filter((d) => d.exerciseIds.includes(exerciseId)).map((d) => d.name)
}

/**
 * The id of the day to feature as "Próximo treino" — the day immediately after
 * the most recent completed session's day, in `days` display order. Wraps to the
 * first day when there is no history, when the last session was the final day, or
 * when its day is no longer in the list. Returns `null` when there are no days.
 *
 * `days` must be in display order; `lastCompletedDayId` is the `dayId` of the
 * most recent completed session for the active gym (or null/undefined when none).
 */
export function nextWorkoutDayId(
  days: Day[],
  lastCompletedDayId: number | null | undefined,
): number | null {
  if (days.length === 0) return null
  // -1 when there is no session or its day was deleted → (idx + 1) % len == first.
  const idx = lastCompletedDayId == null ? -1 : days.findIndex((d) => d.id === lastCompletedDayId)
  return days[(idx + 1) % days.length].id ?? null
}
