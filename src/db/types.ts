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
  /** true for the reserved "Sem categoria" bucket — cannot be deleted. */
  reserved?: boolean
}

export interface Exercise {
  id?: number
  name: string
  /** URL of a static image or an animated GIF (optional). */
  mediaUrl?: string
  categoryId?: number
}

export interface Day {
  id?: number
  name: string
  categoryId?: number
  /** Ordered exercise ids; the same id may appear in multiple days. */
  exerciseIds: number[]
}

/** Current target weight for an exercise within a gym — one per (gymId, exerciseId). */
export interface Weight {
  id?: number
  gymId: number
  exerciseId: number
  value: number
  unit: Unit
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
