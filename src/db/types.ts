export type Unit = 'KG' | 'LB' | '#'
export const UNITS: Unit[] = ['KG', 'LB', '#']

export const UNCATEGORIZED = 'Sem categoria'

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

/** Current target weight for an exercise within a gym — one per (gymId, exerciseId). */
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
 * The image is stored as raw **bytes + mime type**, not as a `Blob`. Both are
 * structured-cloneable in principle, but Blob-in-IndexedDB has a long history of
 * Safari bugs — a bad bet for an installable PWA — and fake-indexeddb drops a
 * Blob's contents entirely, which would leave this untestable. Bytes are
 * portable and verifiable; the UI wraps them back into a Blob to display.
 * Base64 was rejected: it would inflate the same data ~33% and cost a conversion
 * on every read. Device-local — never exported (see data-portability).
 */
export interface ExercisePhoto {
  id?: number
  gymId: number
  exerciseId: number
  bytes: ArrayBuffer
  /** Mime type of `bytes`, e.g. "image/jpeg" — needed to rebuild the Blob. */
  type: string
  /** Dimensions of the stored (downscaled) image, not the original. */
  width: number
  height: number
  createdAt: number
}

export type HistoryKind = 'first' | 'value' | 'unit'

/** Append-only change log for weights. Device-local; never exported. */
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
 */
export interface SessionEntry {
  id?: number
  sessionId: number
  exerciseId?: number
  exerciseName: string
  done: boolean
}
