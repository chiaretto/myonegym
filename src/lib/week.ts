/** Local-midnight timestamp of the Monday that starts the week containing `ts`.
 *  Used by the Home weekly training summary. */
export function startOfWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 = Sunday … 6 = Saturday
  const daysSinceMonday = (dow + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  return d.getTime()
}

/** The fixed weekly goal. Was `days.length` (the number of configured training
 *  days), which meant "3 / 4 treinos" read as "3 sessions against 4 day-plans" —
 *  and a user with 9 configured days could never reach 9/9 inside a 7-day week. */
export const WEEKLY_GOAL = 7

/** Monday-first index (0 = Monday … 6 = Sunday) of `ts` within its own week. */
export function dayIndexInWeek(ts: number): number {
  const dow = new Date(ts).getDay()
  return (dow + 6) % 7
}

export type WeekDayState = 'done' | 'today' | 'future' | 'blank'

export interface WeekDayCell {
  /** 0 = Monday … 6 = Sunday. */
  index: number
  state: WeekDayState
  /** How many sessions were completed that day. >1 means the count and the
   *  filled-cell tally disagree, which the UI flags rather than hiding. */
  sessions: number
}

/**
 * Build the seven cells of the current week from completion timestamps.
 *
 * `completedAt` values outside the current week are ignored, so callers may pass
 * the whole history. A past day with no session is `blank`, never a failure: no
 * training day carries a weekday, so "no session here" is the only claim the data
 * supports — "you were supposed to train" is not.
 */
export function buildWeekTrack(completedAt: readonly number[], now: number): WeekDayCell[] {
  const weekStart = startOfWeek(now)
  const todayIndex = dayIndexInWeek(now)

  const counts = new Array<number>(7).fill(0)
  for (const ts of completedAt) {
    if (ts < weekStart) continue
    const i = dayIndexInWeek(ts)
    // Guard against a timestamp in a *later* week (clock skew, imported data).
    if (startOfWeek(ts) !== weekStart) continue
    counts[i] += 1
  }

  return counts.map((sessions, index) => {
    let state: WeekDayState
    if (sessions > 0) state = 'done'
    else if (index === todayIndex) state = 'today'
    else if (index > todayIndex) state = 'future'
    else state = 'blank'
    return { index, state, sessions }
  })
}

/**
 * Consecutive days trained, counting back from today. Today not being trained
 * yet does not break the streak — it is still in progress — so the walk starts
 * at today and only stops on a *past* day with no session.
 */
export function currentStreak(cells: readonly WeekDayCell[], now: number): number {
  const todayIndex = dayIndexInWeek(now)
  let streak = 0
  for (let i = todayIndex; i >= 0; i--) {
    if (cells[i].sessions > 0) streak += 1
    else if (i !== todayIndex) break
  }
  return streak
}

/** Monday-first short weekday labels, matching `startOfWeek`'s anchor. */
export const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const
