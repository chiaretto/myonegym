import type { Exercise } from '../db/types'

export interface CardioVisibility {
  /** What the Cardio tab lists, in the order it was given. */
  visible: Exercise[]
  /** How many cardio exercises are hidden — what the tab's footer reports. */
  hiddenCount: number
}

/**
 * Split the cardio list into what the Cardio tab shows and how many it hides.
 *
 * One exception, and it is the reason this is a function rather than a
 * `filter` inline: the exercise that owns the **running** cardio stays visible
 * even when hidden. Its row is the only door to that session — a cardio has no
 * day, so Home has no card to resume from — and hiding it would leave a workout
 * in progress with no way back, the one outcome the tab cannot produce.
 *
 * It still **counts** as hidden: it is hidden, and merely being shown while the
 * session lasts. The footer would otherwise drop by one the moment a hidden
 * exercise is started, and rise again on completion, for no reason the user
 * could name.
 *
 * `hiddenCount` counts exercises in the list, not ids in the set: a mark may
 * outlive its exercise turning strength (see `listHiddenCardioIds`), and that
 * one is not something the tab is hiding.
 */
export function visibleCardio(
  exercises: readonly Exercise[],
  hidden: ReadonlySet<number>,
  runningExerciseId?: number,
): CardioVisibility {
  const isHidden = (e: Exercise) => e.id != null && hidden.has(e.id)
  return {
    visible: exercises.filter((e) => !isHidden(e) || e.id === runningExerciseId),
    hiddenCount: exercises.filter(isHidden).length,
  }
}
