import type { Category, Exercise, ExerciseKind, ExerciseVideo } from '../db/types'
import catalog from './officialCatalog.json'

/**
 * The **official catalog**: the categories and exercises that ship with the app.
 *
 * It lives here, in the bundle, and **never** in IndexedDB. That is the whole
 * point of it: a catalog that is code is replaced wholesale by a deploy, so a
 * broken media URL can be fixed for everyone at once, adding ten exercises is
 * not a data migration, and the backup does not carry rows the user never
 * created. A seeded copy in the database would lose all three the moment it
 * became the user's row.
 *
 * The file is an **export of the database** (`kind: "exerciseLibrary"`), which
 * is what makes the ids below safe to keep as they are — see `USER_ID_BASE`.
 */

/**
 * The first id a **user-created** exercise or category may take. Everything
 * below it belongs to the official catalog.
 *
 * The low range is the official one — not the other way round — because the
 * catalog file is an export of the very database the app is running on: its ids
 * are already the ids the devices in the field carry. Keeping them is what lets
 * the upgrade *swap the source* of a record instead of renumbering it, so not
 * one reference in `days`, `weights`, `weightHistory`, `exerciseNotes`,
 * `exercisePhotos` or `sessionEntries` has to be rewritten.
 *
 * The gap between the file's largest id (53) and 10000 is deliberate room: the
 * official catalog can grow by two orders of magnitude before it could ever
 * reach a user's record.
 *
 * It is the same device the `GLOBAL_GYM_ID` uses — reserve part of the id space
 * to say something the schema cannot — and it carries the same consequence: a
 * reference that resolves to nothing *inside the database* is normal, not
 * corruption.
 */
export const USER_ID_BASE = 10000

/**
 * Whether an id belongs to the official catalog.
 *
 * Derived from the id itself, never stored: an `official` column would be a
 * second source of truth about the same fact, free to drift — and it would have
 * to be maintained on rows that do not exist. The same argument that keeps a
 * video's media kind out of the record (see `lib/embedMedia`).
 *
 * True for an id in the range even when nothing answers to it: an exercise the
 * user created before the catalog took over, or one a later release retired,
 * is *unresolvable*, and that is a different question from *whose* id it is.
 * Writing must be refused for the whole range, or a future official exercise
 * would land on top of a user's row.
 */
export function isOfficialId(id: number): boolean {
  return id < USER_ID_BASE
}

interface RawVideo {
  url: string
  title?: string
  startSec?: number
  endSec?: number
}

interface RawExercise {
  id: number
  name: string
  /** File in `public/exercises/`, written by `npm run exercise-media`. */
  mediaFile?: string
  categoryIds?: number[]
  alternativeIds?: number[]
  kind?: string
  videos?: RawVideo[]
}

interface RawCategory {
  id: number
  name: string
}

const raw = catalog as unknown as { categories: RawCategory[]; exercises: RawExercise[] }

/**
 * Frozen all the way down, because these objects are handed to screens that
 * receive database rows everywhere else and have no reason to treat them
 * differently. A screen that mutated one would corrupt the catalog for the rest
 * of the session — the arrays are module state, read once and shared by every
 * caller — and the bug would survive navigation while looking like a stale
 * cache. Freezing turns that into a throw at the write.
 */
function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) value.forEach(deepFreeze)
  else if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

/**
 * Where the app reads an official exercise's picture: a file **the app itself
 * serves**, under its own base URL — which the dev server and the deployed site
 * do not agree on, hence `BASE_URL`.
 *
 * Never a remote address. The pictures were downloaded once into
 * `data/assets/exercises/` and are built into `public/exercises/` by
 * `npm run exercise-media`; the catalog names the file and nothing else. An
 * exercise with no `mediaFile` simply has no picture, which is a state the
 * catalog is allowed to be in and every screen already handles.
 */
export function resolveMedia(e: { mediaFile?: string }): string | undefined {
  return e.mediaFile ? `${import.meta.env.BASE_URL}exercises/${e.mediaFile}` : undefined
}

function toVideo(v: RawVideo): ExerciseVideo {
  return {
    url: v.url,
    ...(v.title ? { title: v.title } : {}),
    ...(v.startSec !== undefined ? { startSec: v.startSec } : {}),
    ...(v.endSec !== undefined ? { endSec: v.endSec } : {}),
  }
}

function toExercise(e: RawExercise): Exercise {
  return {
    id: e.id,
    name: e.name,
    // Strength is the default here for the same reason it is in `createExercise`
    // and in the v10 upgrade: it is what an exercise was before the kind existed.
    kind: (e.kind === 'cardio' ? 'cardio' : 'strength') satisfies ExerciseKind,
    ...(resolveMedia(e) ? { mediaUrl: resolveMedia(e) } : {}),
    categoryIds: e.categoryIds ?? [],
    alternativeIds: e.alternativeIds ?? [],
    videos: (e.videos ?? []).map(toVideo),
  }
}

const CATEGORIES: readonly Category[] = deepFreeze(
  raw.categories.map((c): Category => ({ id: c.id, name: c.name })),
)

const EXERCISES: readonly Exercise[] = deepFreeze(raw.exercises.map(toExercise))

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id!, c]))
const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id!, e]))

/** Every official category, in the file's order. */
export function officialCategories(): readonly Category[] {
  return CATEGORIES
}

/** Every official exercise, in the file's order. */
export function officialExercises(): readonly Exercise[] {
  return EXERCISES
}

/** The official category with this id, or `undefined` — see `isOfficialId`. */
export function officialCategory(id: number): Category | undefined {
  return CATEGORY_BY_ID.get(id)
}

/** The official exercise with this id, or `undefined` — see `isOfficialId`. */
export function officialExercise(id: number): Exercise | undefined {
  return EXERCISE_BY_ID.get(id)
}
