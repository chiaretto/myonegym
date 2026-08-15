import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  getActiveSession,
  getNote,
  getSession,
  getSessionEntry,
  listCategories,
  listDays,
  listCardioExercises,
  listExercises,
  listGyms,
  listHistory,
  listPhotos,
  listSessionEntries,
  listSessionSummaries,
  weightsForGym,
} from '../db/repos'
import type { Category, Exercise, Weight } from '../db/types'

/**
 * ## `undefined` means "still asking", never "there is nothing"
 *
 * Every hook here resolves against IndexedDB, which is asynchronous: the first
 * render of every mount happens before any answer exists. These hooks report
 * that render as `undefined`, and only ever hand out an array (or a Map) once
 * the database has actually answered — even when the answer is empty.
 *
 * CHANGED: they used to pass `[]` as `useLiveQuery`'s `defaultResult`, which
 * collapsed the two states into one. `[]` is an answer — it says "I looked and
 * there is nothing" — so every screen painted its empty state on the first
 * frame of every mount. React Router unmounts a screen when you leave it, so
 * coming back to Home flashed "Nenhum dia de treino ainda" before the days
 * appeared. See the app-foundation spec, "Estados Vazios Só Depois da
 * Resposta".
 *
 * Callers therefore MUST NOT treat `undefined` as empty. `?? []` is fine for
 * *rendering a list* (nothing to draw yet either way); it is wrong for deciding
 * to show an empty state, a zero count, or a "não definido" placeholder.
 */

/**
 * The last value each query resolved to, keyed by query name + arguments.
 *
 * Without it, the fix above trades a wrong empty state for a blank frame: the
 * screen still remounts on every navigation, and still has nothing to paint
 * until IndexedDB answers. The cache lets a revisited screen paint the previous
 * answer immediately, so the return to Home shows the days in the very frame it
 * appears.
 *
 * It is never the source of truth: `useLiveQuery` overwrites it as soon as it
 * resolves, and any write keeps propagating through Dexie's live queries. It
 * lives in the module, so it dies with the tab.
 */
const lastResolved = new Map<string, unknown>()

/**
 * Drops every cached value. Tests need it: the cache is module state, so it
 * outlives both the component tree and the `db.table.clear()` that test
 * teardown does — a stale list would otherwise reappear in the next test's
 * first frame. Wired up globally in `vitest.setup.ts`.
 */
export function clearQueryCache() {
  lastResolved.clear()
}

/** `useLiveQuery` with the "last known answer" cache described above. */
function useCachedLiveQuery<T>(
  name: string,
  querier: () => Promise<T>,
  deps: unknown[] = [],
): T | undefined {
  const live = useLiveQuery(querier, deps)
  const key = `${name}:${JSON.stringify(deps)}`
  // Resolved values are cached as they arrive. Writing during render is safe
  // here: the map feeds no React state, and storing the same value twice (or
  // from a render React later discards) cannot change what anyone sees.
  if (live !== undefined) lastResolved.set(key, live)
  return live !== undefined ? live : (lastResolved.get(key) as T | undefined)
}

export function useGyms() {
  return useCachedLiveQuery('gyms', () => listGyms(db))
}

export function useCategories() {
  return useCachedLiveQuery('categories', () => listCategories(db))
}

export function useCategoryMap(): Map<number, Category> {
  const cats = useCategories()
  return new Map((cats ?? []).filter((c) => c.id != null).map((c) => [c.id!, c]))
}

export function useExercises() {
  return useCachedLiveQuery('exercises', () => listExercises(db))
}

/** The Cardio tab's list. Its own cache key: it is a different query, not a
 *  filtered view of `useExercises`, so it must not share that entry. */
export function useCardioExercises() {
  return useCachedLiveQuery('cardioExercises', () => listCardioExercises(db))
}

export function useExerciseMap(): Map<number, Exercise> {
  const list = useExercises()
  return new Map((list ?? []).filter((e) => e.id != null).map((e) => [e.id!, e]))
}

export function useDays() {
  return useCachedLiveQuery('days', () => listDays(db))
}

/** Map<exerciseId, Weight> for the given gym; empty when gymId is null. */
export function useGymWeights(gymId: number | null) {
  return useCachedLiveQuery(
    'weights',
    async () => (gymId == null ? new Map<number, Weight>() : weightsForGym(gymId, db)),
    [gymId],
  )
}

export function useHistory(gymId: number | null, exerciseId: number | null) {
  return useCachedLiveQuery(
    'history',
    async () => (gymId == null || exerciseId == null ? [] : listHistory(gymId, exerciseId, db)),
    [gymId, exerciseId],
  )
}

/**
 * The per-gym note for (gym, exercise), or null when unset / ids missing.
 * `undefined` while loading (mirrors `useSession`).
 */
export function useNote(gymId: number | null, exerciseId: number | null) {
  return useLiveQuery(
    async () =>
      gymId == null || exerciseId == null ? null : ((await getNote(gymId, exerciseId, db)) ?? null),
    [gymId, exerciseId],
  )
}

/**
 * Photos for (gym, exercise), newest first; empty when either id is missing.
 * Many per pair, unlike `useNote`.
 */
export function usePhotos(gymId: number | null, exerciseId: number | null) {
  return useCachedLiveQuery(
    'photos',
    async () => (gymId == null || exerciseId == null ? [] : listPhotos(gymId, exerciseId, db)),
    [gymId, exerciseId],
  )
}

/**
 * The in-progress session for the gym; `null` when there is none, `undefined`
 * while loading. Follows the active gym.
 *
 * CHANGED: it used to default to `null`, i.e. "there is no workout in
 * progress" — a claim Home turns into a "Iniciar" button and a "Próximo treino"
 * badge. Getting that wrong for a frame moved the badge between cards on every
 * visit.
 */
export function useActiveSession(gymId: number | null) {
  return useCachedLiveQuery(
    'activeSession',
    async () => (gymId == null ? null : ((await getActiveSession(gymId, db)) ?? null)),
    [gymId],
  )
}

/**
 * Completed sessions (with done/total counts and the gym's name), newest first,
 * across every gym.
 *
 * Takes no gym: the history is not scoped to the active one, so switching gyms
 * must not change what this returns.
 */
export function useSessionSummaries() {
  return useCachedLiveQuery('sessionSummaries', async () => listSessionSummaries(db))
}

export function useSession(id: number | null) {
  return useLiveQuery(
    async () => (id == null ? undefined : ((await getSession(id, db)) ?? null)),
    [id],
  )
}

export function useSessionEntries(sessionId: number | null) {
  return useCachedLiveQuery(
    'sessionEntries',
    async () => (sessionId == null ? [] : listSessionEntries(sessionId, db)),
    [sessionId],
  )
}

export function useSessionEntry(entryId: number | null) {
  return useLiveQuery(
    async () => (entryId == null ? undefined : ((await getSessionEntry(entryId, db)) ?? null)),
    [entryId],
  )
}
