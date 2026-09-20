import type { Category, Exercise, Gym, Session, SessionEntry, Weight } from '../../../db/types'
import { exerciseCategoryNames } from '../../../lib/days'
import { fmtDuration, fmtFullDate, fmtWeight } from '../../../lib/format'
import { workoutAt } from '../../../lib/consistency'

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

/**
 * Which of the two drawings the card is.
 *
 * - `list` — a header over one row per exercise. What a training day is.
 * - `portrait` — the exercise's picture across the full width, its name and
 *   categories beneath. What a **cardio** is: one activity, and the image of it.
 *
 * The choice lives here rather than in the renderer because this is where the
 * "what goes on the image" decisions are testable — jsdom has no canvas.
 */
export type ShareLayout = 'list' | 'portrait'

export interface ShareCard {
  layout: ShareLayout
  /** Absent on `portrait`, where the single row's name is the caption and a
   *  title would be the same words a second time. */
  title?: string
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
      category: exerciseCategoryNames(ex, catMap).join(' · ') || undefined,
      weight: weight ? fmtWeight(weight.value, weight.unit) : undefined,
      done: entry.done,
      mediaUrl: ex?.mediaUrl,
    }
  })

  /**
   * A cardio becomes a portrait — but only if there is a picture to be the
   * portrait.
   *
   * On a cardio session `dayName` **is** the exercise's name (see
   * `startCardioSession`), so the list drawing writes the same words twice: once
   * as the title and once in its only row. And it hands 48px to the one thing
   * that card has to show. On a training day the thumbnail is a marker beside
   * what matters, which is the list; on a cardio there is no list.
   *
   * Keyed on the session's **kind**, not on how many entries it has: a training
   * day with one exercise is still a list — short today, maybe three next time —
   * while a cardio is a single activity the app treats apart everywhere.
   *
   * With no picture it stays a list. The drawing exists because of the photo;
   * without one, an empty rectangle across half the card would be worse than the
   * compact row it replaced.
   */
  const portrait = session.kind === 'cardio' && rows.length === 1 && !!rows[0].mediaUrl

  return {
    layout: portrait ? 'portrait' : 'list',
    ...(portrait ? {} : { title: session.dayName }),
    gymName: gym?.name,
    // The day the workout happened is the day it started (see `workoutAt`);
    // a card shared for a late session must not print the next morning's date.
    dateLabel: fmtFullDate(workoutAt(session)),
    durationLabel:
      full && session.completedAt != null
        ? fmtDuration(session.completedAt - session.startedAt)
        : undefined,
    doneLabel: `${done} de ${entries.length} concluídos`,
    rows,
  }
}
