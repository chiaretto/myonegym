import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthGrid,
  dayCountsForMonth,
  dayStreak,
  firstSessionMonth,
  monthBefore,
  monthOf,
  monthlyTotals,
  sameMonth,
  weekStreak,
  weeklyTotals,
} from './consistency'

/** Local timestamp helper — mirrors how sessions stamp `completedAt`. */
function at(y: number, m: number, d: number, h = 12): number {
  return new Date(y, m, d, h).getTime()
}

// Sunday 26 July 2026, mid-morning — the reference "now" of the design mockup.
const NOW = at(2026, 6, 26, 9)

describe('month refs', () => {
  it('derives, compares and steps months across year boundaries', () => {
    expect(monthOf(at(2026, 0, 15))).toEqual({ year: 2026, month: 0 })
    expect(sameMonth(monthOf(at(2026, 6, 1)), monthOf(at(2026, 6, 31)))).toBe(true)
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(addMonths({ year: 2025, month: 11 }, 1)).toEqual({ year: 2026, month: 0 })
    expect(monthBefore({ year: 2025, month: 11 }, { year: 2026, month: 0 })).toBe(true)
    expect(monthBefore({ year: 2026, month: 1 }, { year: 2026, month: 0 })).toBe(false)
  })
})

describe('dayCountsForMonth', () => {
  it('counts sessions per day, ignoring other months', () => {
    const history = [at(2026, 6, 2), at(2026, 6, 16, 7), at(2026, 6, 16, 19), at(2026, 5, 28)]
    const counts = dayCountsForMonth(history, { year: 2026, month: 6 })
    expect(counts.get(2)).toBe(1)
    expect(counts.get(16)).toBe(2)
    expect(counts.has(28)).toBe(false) // June session does not leak into July
  })
})

describe('buildMonthGrid', () => {
  it('pads July 2026 to full Monday-first weeks', () => {
    const cells = buildMonthGrid([], { year: 2026, month: 6 }, NOW)
    // July 2026 starts on a Wednesday (lead 2) and has 31 days → 5 weeks.
    expect(cells).toHaveLength(35)
    expect(cells[0]).toMatchObject({ day: 29, inMonth: false }) // Mon 29 Jun
    expect(cells[2]).toMatchObject({ day: 1, inMonth: true })
    expect(cells[32]).toMatchObject({ day: 31, inMonth: true })
    expect(cells[33]).toMatchObject({ day: 1, inMonth: false }) // Sat 1 Aug
  })

  it('marks done, today, past and future', () => {
    const cells = buildMonthGrid([at(2026, 6, 24), at(2026, 6, 25)], { year: 2026, month: 6 }, NOW)
    const day = (n: number) => cells.find((c) => c.inMonth && c.day === n)!
    expect(day(24).state).toBe('done')
    expect(day(25).state).toBe('done')
    expect(day(26).state).toBe('today') // no session yet today
    expect(day(23).state).toBe('past')
    expect(day(27).state).toBe('future')
  })

  it('a day with two sessions is done with sessions=2, not a special state', () => {
    const cells = buildMonthGrid(
      [at(2026, 6, 16, 7), at(2026, 6, 16, 19)],
      { year: 2026, month: 6 },
      NOW,
    )
    const d16 = cells.find((c) => c.inMonth && c.day === 16)!
    expect(d16).toMatchObject({ state: 'done', sessions: 2 })
  })

  it('today with a session reads done, not today', () => {
    const cells = buildMonthGrid([at(2026, 6, 26, 8)], { year: 2026, month: 6 }, NOW)
    expect(cells.find((c) => c.inMonth && c.day === 26)!.state).toBe('done')
  })

  it('marks the days that had cardio, without changing their state', () => {
    const strength = at(2026, 6, 15, 8)
    const cardio = at(2026, 6, 12, 18)
    const cells = buildMonthGrid([strength, cardio], { year: 2026, month: 6 }, NOW, [cardio])
    const day = (n: number) => cells.find((c) => c.inMonth && c.day === n)!

    // Cardio IS a workout: the disc is there either way. The star only says
    // which kind it was.
    expect(day(12)).toMatchObject({ state: 'done', sessions: 1, cardio: true })
    expect(day(15)).toMatchObject({ state: 'done', sessions: 1, cardio: false })
  })

  it('a day with both kinds carries both marks', () => {
    const cardio = at(2026, 6, 14, 7)
    const strength = at(2026, 6, 14, 19)
    const cells = buildMonthGrid([cardio, strength], { year: 2026, month: 6 }, NOW, [cardio])
    expect(cells.find((c) => c.inMonth && c.day === 14)!).toMatchObject({
      state: 'done',
      sessions: 2, // the 2+ badge
      cardio: true, // and the star
    })
  })

  it('no cardio list means no stars', () => {
    const cells = buildMonthGrid([at(2026, 6, 15)], { year: 2026, month: 6 }, NOW)
    expect(cells.every((c) => !c.cardio)).toBe(true)
  })

  it('a cardio in another month does not star this one', () => {
    const cells = buildMonthGrid(
      [at(2026, 5, 12)],
      { year: 2026, month: 6 },
      NOW,
      [at(2026, 5, 12)],
    )
    expect(cells.every((c) => !c.cardio)).toBe(true)
  })
})

describe('weeklyTotals', () => {
  it('returns 12 weeks oldest-first ending at the current week', () => {
    const totals = weeklyTotals([], NOW)
    expect(totals).toHaveLength(12)
    expect(totals[11].weekStart).toBe(at(2026, 6, 20, 0)) // Mon 20 Jul, week of NOW
    expect(totals[0].weekStart).toBe(at(2026, 4, 4, 0)) // Mon 4 May, 11 weeks back
  })

  it('buckets sessions into their weeks and ignores older history', () => {
    const totals = weeklyTotals(
      [
        at(2026, 6, 20),
        at(2026, 6, 22),
        at(2026, 6, 25), // 3 in the current week
        at(2026, 6, 14), // 1 in the previous week
        at(2025, 0, 1), // far outside the window
      ],
      NOW,
    )
    expect(totals[11].count).toBe(3)
    expect(totals[10].count).toBe(1)
    expect(totals.reduce((s, w) => s + w.count, 0)).toBe(4)
  })
})

describe('monthlyTotals', () => {
  it('returns 12 months oldest-first ending at the current month', () => {
    const totals = monthlyTotals([], NOW)
    expect(totals).toHaveLength(12)
    expect(totals[11].ref).toEqual({ year: 2026, month: 6 })
    expect(totals[0].ref).toEqual({ year: 2025, month: 7 }) // Aug 2025
  })

  it('counts per month and ignores months outside the window', () => {
    const totals = monthlyTotals(
      [at(2026, 6, 2), at(2026, 6, 20), at(2025, 11, 24), at(2024, 6, 1)],
      NOW,
    )
    expect(totals[11].count).toBe(2) // July 2026
    expect(totals.find((t) => sameMonth(t.ref, { year: 2025, month: 11 }))!.count).toBe(1)
    expect(totals.reduce((s, t) => s + t.count, 0)).toBe(3)
  })
})

describe('dayStreak', () => {
  it('counts back from today when today has a session', () => {
    expect(dayStreak([at(2026, 6, 26, 8), at(2026, 6, 25), at(2026, 6, 24)], NOW)).toBe(3)
  })

  it('an untrained morning does not zero the streak built through yesterday', () => {
    expect(dayStreak([at(2026, 6, 25), at(2026, 6, 24)], NOW)).toBe(2)
  })

  it('breaks on a past empty day', () => {
    expect(dayStreak([at(2026, 6, 25), at(2026, 6, 23)], NOW)).toBe(1)
  })

  it('is zero with no recent history', () => {
    expect(dayStreak([at(2026, 6, 20)], NOW)).toBe(0)
    expect(dayStreak([], NOW)).toBe(0)
  })

  it('two sessions on one day count as one day', () => {
    expect(dayStreak([at(2026, 6, 25, 7), at(2026, 6, 25, 19)], NOW)).toBe(1)
  })
})

describe('weekStreak', () => {
  it('the current week counts once it has a session', () => {
    // Weeks of 20 Jul, 13 Jul and 6 Jul all trained.
    const history = [at(2026, 6, 22), at(2026, 6, 14), at(2026, 6, 7)]
    expect(weekStreak(history, NOW)).toBe(3)
  })

  it('the current week does not break the streak while in progress', () => {
    // Monday 20 Jul, nothing trained this week yet; the two previous weeks were.
    const monday = at(2026, 6, 20, 8)
    const history = [at(2026, 6, 14), at(2026, 6, 7)]
    expect(weekStreak(history, monday)).toBe(2)
  })

  it('a fully empty week in the past breaks the streak', () => {
    // Weeks: 6 Jul ✓ · 13 Jul ✗ · 20 Jul ✓ — streak restarts after the gap.
    const history = [at(2026, 6, 22), at(2026, 6, 7)]
    expect(weekStreak(history, NOW)).toBe(1)
  })

  it('is zero with no history', () => {
    expect(weekStreak([], NOW)).toBe(0)
  })
})

describe('firstSessionMonth', () => {
  it('returns the earliest month, or null without history', () => {
    expect(firstSessionMonth([at(2026, 6, 2), at(2026, 2, 15)])).toEqual({
      year: 2026,
      month: 2,
    })
    expect(firstSessionMonth([])).toBeNull()
  })
})
