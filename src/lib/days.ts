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
