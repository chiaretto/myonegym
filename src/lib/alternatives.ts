import type { Exercise } from '../db/types'

/**
 * The alternatives of an exercise that still exist, in the order they were
 * declared. Empty when it has none — the common case, which callers render as
 * nothing at all.
 *
 * The relation is **symmetric to the user**, but only symmetric *on disk*
 * between two of the user's own exercises. A link to an **official** exercise
 * is stored on the user's record alone, because the official one lives in the
 * bundle and has no row to write the back-link to (see `setAlternatives`). So
 * the symmetry is restored here, at read time: an exercise's alternatives are
 * the ones it declares **plus** the ones that declare it.
 *
 * For two user exercises the union changes nothing — both sides are already
 * written — which is what lets one function serve both cases without asking
 * where each exercise came from.
 *
 * The referrers are found by walking the map the caller already holds, so this
 * costs no query and needs no index: everyone who asks "who points at me" is a
 * screen that has just listed every exercise anyway. That is why
 * `alternativeIds` stays deliberately unindexed.
 *
 * Alternatives are a **navigation and swap** aid, not a grouping: a day lists
 * the exercise the user put in it and nothing else, so nothing here folds,
 * counts, or reorders any list. See `Exercise.alternativeIds`.
 */
export function alternativesOf(
  exercise: Exercise | undefined,
  exMap: Map<number, Exercise>,
): Exercise[] {
  if (!exercise?.id) return []

  const out: Exercise[] = []
  const seen = new Set<number>()
  // Declared first: that order is the user's, and the referrers are an
  // addition to it rather than a reshuffling of it.
  for (const id of exercise.alternativeIds ?? []) {
    const alt = exMap.get(id)
    if (alt?.id != null && !seen.has(alt.id)) {
      seen.add(alt.id)
      out.push(alt)
    }
  }
  for (const other of exMap.values()) {
    if (other.id == null || other.id === exercise.id || seen.has(other.id)) continue
    if (other.alternativeIds?.includes(exercise.id)) {
      seen.add(other.id)
      out.push(other)
    }
  }
  return out
}
