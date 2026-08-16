import type { Exercise, Warmup } from '../db/types'

/**
 * The warm-ups linked to an exercise, resolved **in the order of its list** —
 * that order is what the viewer pages through.
 *
 * Ids with no record are dropped rather than rendered as holes. Deleting a
 * warm-up already unlinks it everywhere (`deleteWarmup`), so this only covers
 * the window before a live query catches up, and a restored backup whose links
 * were pruned. Either way a gap in the pager would be worse than a shorter one.
 */
export function warmupsOf(
  exercise: Exercise | undefined,
  warmupMap: Map<number, Warmup>,
): Warmup[] {
  return (exercise?.warmupIds ?? [])
    .map((id) => warmupMap.get(id))
    .filter((w): w is Warmup => w != null)
}
