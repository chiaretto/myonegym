import type { Exercise } from '../db/types'

/**
 * The alternatives of an exercise that still exist, in the order they were
 * declared. Empty when it has none — the common case, which callers render as
 * nothing at all.
 *
 * Alternatives are a **navigation and swap** aid, not a grouping: a day lists
 * the exercise the user put in it and nothing else, so nothing here folds,
 * counts, or reorders any list. See `Exercise.alternativeIds`.
 */
export function alternativesOf(
  exercise: Exercise | undefined,
  exMap: Map<number, Exercise>,
): Exercise[] {
  const out: Exercise[] = []
  for (const id of exercise?.alternativeIds ?? []) {
    const alt = exMap.get(id)
    if (alt) out.push(alt)
  }
  return out
}
