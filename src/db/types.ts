export type Unit = 'KG' | 'LB' | '#'
export const UNITS: Unit[] = ['KG', 'LB', '#']

export const UNCATEGORIZED = 'Sem categoria'

/**
 * The gym id that means "every gym" — the key of an exercise's **global**
 * target weight and of its global weight history.
 *
 * `0` is safe as a sentinel because gym ids come from Dexie's `++id`, which
 * starts at 1: no real gym can ever collide with it. Reserving an id instead of
 * making `Weight.gymId` optional is what keeps `&[gymId+exerciseId]` a working
 * unique index — IndexedDB compound keys cannot hold `undefined` — so a global
 * weight is read, written and cascaded by exactly the same queries as a
 * per-gym one.
 *
 * It is a **storage** detail: no screen ever receives it as a gym. Reads go
 * through `resolveWeight`/`weightsForGym`, which hand back the value already
 * resolved plus the scope it came from (see `WeightScope`).
 */
export const GLOBAL_GYM_ID = 0

/**
 * Where the weight that applies to a `(gym, exercise)` pair actually lives:
 * `'gym'` when that gym has an exception of its own, `'global'` otherwise.
 */
export type WeightScope = 'global' | 'gym'

export interface Gym {
  id?: number
  name: string
  createdAt: number
}

export interface Category {
  id?: number
  name: string
}

export interface Exercise {
  id?: number
  name: string
  /** URL of a static image or an animated GIF (optional). */
  mediaUrl?: string
  /** Zero or more categories. Empty = uncategorized (shown as "Sem categoria").
   *  There is no reserved category — an empty list IS uncategorized. */
  categoryIds: number[]
  /**
   * The OTHER exercises this one can be swapped for — same stimulus, different
   * equipment (barbell bench / machine press). Empty is the normal case.
   *
   * **Symmetric**: marking B an alternative of A marks A an alternative of B,
   * so the pair is declared once, from whichever side the user is editing.
   *
   * Deliberately **NOT transitively closed**: A may list both B and C without
   * B and C becoming alternatives of each other. One exercise therefore heads
   * as many *kinds* of variation as the user wants — the bench press swaps for
   * the machine (same movement) and for the dumbbell fly (same muscle), and
   * those two never become interchangeable by association.
   *
   * The symmetry is maintained **exclusively** by `setAlternatives` (and by
   * `deleteExercise`, which unlinks the peers). No screen writes this field.
   *
   * Deliberately NOT indexed: because the relation is symmetric, "who points at
   * me" is answered by my own record — nothing ever scans for referrers.
   */
  alternativeIds: number[]
}

export interface Day {
  id?: number
  name: string
  /** Ordered exercise ids; the same id may appear in multiple days.
   *  A day has no manual category — its categories are derived from these
   *  exercises' categories (see dayCategoryNames). */
  exerciseIds: number[]
  /** User-controlled position among days. Absent = insertion order (by id).
   *  Set for all days on the first reorder (see reorderDays). */
  order?: number
}

/**
 * Current target weight for an exercise — one row per `(gymId, exerciseId)`.
 *
 * The weight of an exercise is a property of the person lifting it, not of the
 * building, so the normal row is the **global** one: `gymId === GLOBAL_GYM_ID`,
 * valid in every gym. A row keyed by a real gym id is an **exception** — that
 * gym's machine is calibrated differently, or only it has that dumbbell — and
 * it wins over the global row in that gym alone.
 */
export interface Weight {
  id?: number
  gymId: number
  exerciseId: number
  value: number
  unit: Unit
}

/**
 * A free-text note for an exercise within a gym — one per (gymId, exerciseId),
 * like a target weight. Durable and independent of any workout session; shared
 * across sessions and the catalog exercise detail for that gym.
 */
export interface ExerciseNote {
  id?: number
  gymId: number
  exerciseId: number
  text: string
  updatedAt: number
}

/**
 * A photo of an exercise within a gym — the user's own picture of *that machine*
 * (seat height, pin position, plate layout), as opposed to `Exercise.mediaUrl`,
 * which is a remote demo image shared by every gym.
 *
 * Keyed by `(gymId, exerciseId)` like a Weight or an ExerciseNote, but unlike
 * those a pair holds **many** photos, so the index is non-unique.
 *
 * The record holds **metadata only**: the image itself is a file in the origin's
 * private file system, named by `file` (see `data/photoStore`). Keeping a few MB
 * of image out of the record is what makes listing a pair's photos cheap — the
 * bytes are read only when one is actually displayed.
 *
 * `bytes` is the exception, and it is deliberately still here: photos attached
 * before the move to files keep their image in the record until the background
 * migration gets to them, and a browser with no writable OPFS stores every photo
 * that way for good. A record always says which of the two it is. Base64 was
 * rejected for either form: it would inflate the same data ~33% and cost a
 * conversion on every read.
 */
export interface ExercisePhoto {
  id?: number
  gymId: number
  exerciseId: number
  /** File name in the app's photo directory (OPFS). Absent → see `bytes`. */
  file?: string
  /** The image itself, for legacy records and browsers without a writable OPFS. */
  bytes?: ArrayBuffer
  /** Mime type of the image, e.g. "image/jpeg" — needed to rebuild the Blob. */
  type: string
  /** Dimensions of the stored (downscaled) image, not the original. */
  width: number
  height: number
  /** Size in bytes of the stored image. Absent on a record that predates file
   *  storage and has not been migrated yet — nothing computes it for those, on
   *  purpose: reading every old image just to measure it is what the migration
   *  is already doing, once. */
  size?: number
  createdAt: number
}

export type HistoryKind = 'first' | 'value' | 'unit'

/**
 * Append-only change log for weights, keyed like the weight it records: the
 * global timeline under `GLOBAL_GYM_ID`, a gym's own timeline under its id.
 *
 * Entries are written to whichever scope the save landed in, and are **never**
 * moved between scopes. Dropping a gym's exception therefore leaves that gym's
 * entries in place — invisible while the pair resolves globally, and back in
 * view if the exception is recreated. Device-local.
 */
export interface WeightHistory {
  id?: number
  gymId: number
  exerciseId: number
  value: number
  unit: Unit
  changedAt: number
  kind: HistoryKind
}

export type SessionStatus = 'active' | 'completed'

/**
 * One workout visit, scoped to a gym (like weights). `dayName` is snapshotted at
 * start time so the session survives renaming/deleting the source day.
 */
export interface Session {
  id?: number
  gymId: number
  /** Source training day; kept for linking but may be deleted later. */
  dayId?: number
  dayName: string
  startedAt: number
  completedAt?: number
  status: SessionStatus
}

/**
 * A single exercise line within a session. `exerciseName` is a snapshot so a
 * session still renders after the source exercise is renamed/deleted. The entry
 * stores NO weight — the weight shown/edited for an entry is always the
 * exercise's per-gym target weight (see Weight), looked up live by the UI.
 *
 * One entry per exercise of the day. Alternatives do not multiply entries:
 * only the exercise the user put in the day is listed, and swapping to one of
 * its alternatives mid-workout rewrites this entry in place (see
 * `swapEntryExercise`) rather than adding a second one.
 */
export interface SessionEntry {
  id?: number
  sessionId: number
  /** The exercise being done — rewritten by a swap; absent once it is deleted. */
  exerciseId?: number
  exerciseName: string
  done: boolean
}
