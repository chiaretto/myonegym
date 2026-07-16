import type { Category, Exercise, Gym, Session, SessionEntry, Weight } from '../../../db/types'
import { fmtDuration, fmtFullDate, fmtWeight } from '../../../lib/format'

/**
 * Which flavour of the shared image to build.
 * - `full` — includes each exercise's weight and the training duration.
 * - `lite` — omits both, so the workout can be shown without revealing how much
 *   the user lifts or how long they took.
 */
export type ShareVariant = 'full' | 'lite'

export interface ShareRow {
  name: string
  category?: string
  /** Formatted weight, e.g. "22,5 KG". Absent on `lite`, and on entries with no
   *  target — the screen's "definir" hint is a call-to-action for the owner and
   *  has no meaning to whoever receives the image. */
  weight?: string
  done: boolean
  mediaUrl?: string
}

export interface ShareCard {
  title: string
  gymName?: string
  /** Absolute ("16 jul 2026"), never relative — the image outlives the day. */
  dateLabel: string
  /** Absent on `lite`. */
  durationLabel?: string
  doneLabel: string
  rows: ShareRow[]
}

export interface BuildShareCardInput {
  session: Session
  entries: SessionEntry[]
  gym?: Gym
  /** Live per-gym targets for the session's gym (see `useGymWeights`). */
  weights: Map<number, Weight>
  exMap: Map<number, Exercise>
  catMap: Map<number, Category>
  variant: ShareVariant
}

/**
 * Pure: turns a completed session into everything the card needs to be painted.
 * All of the "what goes on the image" decisions live here so they stay testable
 * — jsdom has no canvas, so `renderCard` cannot be unit-tested.
 */
export function buildShareCard({
  session,
  entries,
  gym,
  weights,
  exMap,
  catMap,
  variant,
}: BuildShareCardInput): ShareCard {
  const full = variant === 'full'
  const done = entries.filter((e) => e.done).length

  const rows: ShareRow[] = entries.map((entry) => {
    // The name is the entry's snapshot, so a deleted source exercise still renders.
    const ex = entry.exerciseId != null ? exMap.get(entry.exerciseId) : undefined
    const weight = full && entry.exerciseId != null ? weights.get(entry.exerciseId) : undefined
    return {
      name: entry.exerciseName,
      category: ex?.categoryId != null ? catMap.get(ex.categoryId)?.name : undefined,
      weight: weight ? fmtWeight(weight.value, weight.unit) : undefined,
      done: entry.done,
      mediaUrl: ex?.mediaUrl,
    }
  })

  return {
    title: session.dayName,
    gymName: gym?.name,
    dateLabel: fmtFullDate(session.completedAt ?? session.startedAt),
    durationLabel:
      full && session.completedAt != null
        ? fmtDuration(session.completedAt - session.startedAt)
        : undefined,
    doneLabel: `${done} de ${entries.length} concluídos`,
    rows,
  }
}
