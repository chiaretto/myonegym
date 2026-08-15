import { dayIndexInWeek, startOfWeek } from './week'

/**
 * Aggregations for the Consistency screen (`/sessions`), all derived from
 * completed-session timestamps — no persisted state of its own.
 *
 * Every function takes the whole history (`completedAt` values across ALL
 * gyms) and a `now`, so callers decide the clock and the tests own time.
 * Date arithmetic goes through `Date#setDate`/`setMonth` rather than
 * millisecond math, so DST transitions cannot shift a "day" or a "week".
 */

/** Calendar month reference. `month` is 0-based, like `Date#getMonth`. */
export interface MonthRef {
  year: number
  month: number
}

export function monthOf(ts: number): MonthRef {
  const d = new Date(ts)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function sameMonth(a: MonthRef, b: MonthRef): boolean {
  return a.year === b.year && a.month === b.month
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** Is `a` strictly before `b` in calendar order? */
export function monthBefore(a: MonthRef, b: MonthRef): boolean {
  return a.year !== b.year ? a.year < b.year : a.month < b.month
}

/** Local midnight of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ts: number, n: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

/** The week before the one starting at `weekStart` (DST-safe). */
function prevWeekStart(weekStart: number): number {
  return startOfWeek(addDays(weekStart, -7))
}

/** Sessions per day-of-month (1-based) for the given month. */
export function dayCountsForMonth(
  completedAt: readonly number[],
  ref: MonthRef,
): Map<number, number> {
  const counts = new Map<number, number>()
  for (const ts of completedAt) {
    const d = new Date(ts)
    if (d.getFullYear() !== ref.year || d.getMonth() !== ref.month) continue
    counts.set(d.getDate(), (counts.get(d.getDate()) ?? 0) + 1)
  }
  return counts
}

export type MonthCellState = 'done' | 'today' | 'past' | 'future'

export interface MonthCell {
  /** Day of month, 1-based. Meaningful only when `inMonth`. */
  day: number
  /** False for the leading/trailing cells that pad the grid to full weeks. */
  inMonth: boolean
  state: MonthCellState
  /** Completed sessions that day. >1 renders the "2+" badge. */
  sessions: number
  /**
   * At least one of that day's sessions was cardio.
   *
   * A **signal added to** the cell, not a state of its own: `state` still
   * answers "was there a workout", this answers "what kind". That is what lets
   * a day with both strength and cardio show both marks without inventing a
   * combinatorial fourth state.
   */
  cardio: boolean
}

/**
 * The month as a Monday-first grid, padded with the neighbouring months' days
 * (flagged `inMonth: false` — the UI hides them; they are spacing, not data).
 * A past day with no session is just `past`: no X, no failure state — the app
 * stores no expectation that any given day should have had a workout.
 */
export function buildMonthGrid(
  completedAt: readonly number[],
  ref: MonthRef,
  now: number,
  /** Completion times of the CARDIO sessions — a subset of `completedAt`. */
  cardioAt: readonly number[] = [],
): MonthCell[] {
  const counts = dayCountsForMonth(completedAt, ref)
  const cardioDays = new Set(
    [...dayCountsForMonth(cardioAt, ref).keys()],
  )
  const first = new Date(ref.year, ref.month, 1).getTime()
  const daysInMonth = new Date(ref.year, ref.month + 1, 0).getDate()
  const lead = dayIndexInWeek(first)
  const today = startOfDay(now)

  const cells: MonthCell[] = []
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  for (let i = 0; i < total; i++) {
    const dayTs = addDays(first, i - lead)
    const d = new Date(dayTs)
    const inMonth = d.getMonth() === ref.month && d.getFullYear() === ref.year
    const sessions = inMonth ? (counts.get(d.getDate()) ?? 0) : 0
    let state: MonthCellState
    if (sessions > 0) state = 'done'
    else if (startOfDay(dayTs) === today) state = 'today'
    else if (dayTs > now) state = 'future'
    else state = 'past'
    cells.push({
      day: d.getDate(),
      inMonth,
      state,
      sessions,
      cardio: inMonth && cardioDays.has(d.getDate()),
    })
  }
  return cells
}

export interface WeekTotal {
  /** Local-midnight Monday starting the week. */
  weekStart: number
  count: number
}

/** Totals of the last `weeks` weeks, oldest first, ending at the week of `now`. */
export function weeklyTotals(completedAt: readonly number[], now: number, weeks = 12): WeekTotal[] {
  const starts: number[] = [startOfWeek(now)]
  while (starts.length < weeks) starts.push(prevWeekStart(starts[starts.length - 1]))
  starts.reverse()

  const index = new Map(starts.map((ws, i) => [ws, i]))
  const counts = new Array<number>(weeks).fill(0)
  for (const ts of completedAt) {
    const i = index.get(startOfWeek(ts))
    if (i !== undefined) counts[i] += 1
  }
  return starts.map((weekStart, i) => ({ weekStart, count: counts[i] }))
}

export interface MonthTotal {
  ref: MonthRef
  count: number
}

/** Totals of the last `months` months, oldest first, ending at the month of `now`. */
export function monthlyTotals(
  completedAt: readonly number[],
  now: number,
  months = 12,
): MonthTotal[] {
  const current = monthOf(now)
  const refs = Array.from({ length: months }, (_, i) => addMonths(current, i - (months - 1)))
  const key = (r: MonthRef) => r.year * 12 + r.month
  const index = new Map(refs.map((r, i) => [key(r), i]))
  const counts = new Array<number>(months).fill(0)
  for (const ts of completedAt) {
    const i = index.get(key(monthOf(ts)))
    if (i !== undefined) counts[i] += 1
  }
  return refs.map((ref, i) => ({ ref, count: counts[i] }))
}

/**
 * Consecutive days trained, ending today — or yesterday: a morning without a
 * workout yet does not zero what was built through last night. Generalizes the
 * Home week track's `currentStreak` beyond the current week; both walk from
 * today and only break on a *past* empty day.
 */
export function dayStreak(completedAt: readonly number[], now: number): number {
  const days = new Set(completedAt.map(startOfDay))
  let cursor = startOfDay(now)
  if (!days.has(cursor)) cursor = startOfDay(addDays(cursor, -1))
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = startOfDay(addDays(cursor, -1))
  }
  return streak
}

/**
 * Consecutive weeks (Monday-first) with at least one completed session, ending
 * at the current week. The current week counts once it has a session and does
 * NOT break the streak while it is still in progress — on Monday morning the
 * user has not "failed" the week yet.
 */
export function weekStreak(completedAt: readonly number[], now: number): number {
  const weeks = new Set(completedAt.map(startOfWeek))
  let cursor = startOfWeek(now)
  if (!weeks.has(cursor)) cursor = prevWeekStart(cursor)
  let streak = 0
  while (weeks.has(cursor)) {
    streak += 1
    cursor = prevWeekStart(cursor)
  }
  return streak
}

/** Month of the earliest completion — the calendar's navigation floor — or
 *  null when there is no history. */
export function firstSessionMonth(completedAt: readonly number[]): MonthRef | null {
  if (completedAt.length === 0) return null
  return monthOf(Math.min(...completedAt))
}
