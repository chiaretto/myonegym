import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  listCategories,
  listDays,
  listExercises,
  listGyms,
  listHistory,
  weightsForGym,
} from '../db/repos'
import type { Category, Exercise } from '../db/types'

export function useGyms() {
  return useLiveQuery(() => listGyms(db), [], [])
}

export function useCategories() {
  return useLiveQuery(() => listCategories(db), [], [])
}

export function useCategoryMap(): Map<number, Category> {
  const cats = useCategories()
  return new Map((cats ?? []).filter((c) => c.id != null).map((c) => [c.id!, c]))
}

export function useExercises() {
  return useLiveQuery(() => listExercises(db), [], [])
}

export function useExerciseMap(): Map<number, Exercise> {
  const list = useExercises()
  return new Map((list ?? []).filter((e) => e.id != null).map((e) => [e.id!, e]))
}

export function useDays() {
  return useLiveQuery(() => listDays(db), [], [])
}

/** Map<exerciseId, Weight> for the given gym; empty when gymId is null. */
export function useGymWeights(gymId: number | null) {
  return useLiveQuery(
    async () => (gymId == null ? new Map() : weightsForGym(gymId, db)),
    [gymId],
    new Map(),
  )
}

export function useHistory(gymId: number | null, exerciseId: number | null) {
  return useLiveQuery(
    async () =>
      gymId == null || exerciseId == null ? [] : listHistory(gymId, exerciseId, db),
    [gymId, exerciseId],
    [],
  )
}
