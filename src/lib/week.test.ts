import { describe, expect, it } from 'vitest'
import {
  buildWeekTrack,
  currentStreak,
  dayIndexInWeek,
  startOfWeek,
  WEEKDAY_LABELS,
  WEEKLY_GOAL,
} from './week'

/** Local-time helper so these tests do not depend on the runner's timezone. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()

// 2026-07-20 is a Monday; 2026-07-26 is the Sunday that closes the same week.
const MON = at(2026, 7, 20)
const TUE = at(2026, 7, 21)
const WED = at(2026, 7, 22)
const THU = at(2026, 7, 23)
const FRI = at(2026, 7, 24)
const SUN = at(2026, 7, 26)

describe('startOfWeek', () => {
  it('anchors to local-midnight Monday', () => {
    const s = startOfWeek(FRI)
    const d = new Date(s)
    expect(d.getDay()).toBe(1) // Monday
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0])
  })

  it('keeps Sunday in the week that started the previous Monday', () => {
    expect(startOfWeek(SUN)).toBe(startOfWeek(MON))
  })

  it('is idempotent', () => {
    expect(startOfWeek(startOfWeek(FRI))).toBe(startOfWeek(FRI))
  })
})

describe('dayIndexInWeek', () => {
  it('is Monday-first', () => {
    expect(dayIndexInWeek(MON)).toBe(0)
    expect(dayIndexInWeek(FRI)).toBe(4)
    expect(dayIndexInWeek(SUN)).toBe(6)
  })
})

describe('buildWeekTrack', () => {
  it('marks done, today, future and blank', () => {
    // Trained Mon, Tue and Thu; "now" is Friday.
    const cells = buildWeekTrack([MON, TUE, THU], FRI)
    expect(cells.map((c) => c.state)).toEqual([
      'done', // seg
      'done', // ter
      'blank', // qua — past, no session, NOT a failure
      'done', // qui
      'today', // sex
      'future', // sáb
      'future', // dom
    ])
  })

  it('counts a Sunday session inside the current week', () => {
    const cells = buildWeekTrack([SUN], SUN)
    expect(cells[6].state).toBe('done')
    expect(cells[6].sessions).toBe(1)
  })

  it('keeps two workouts on the same day in one cell', () => {
    const cells = buildWeekTrack([TUE, at(2026, 7, 21, 19)], FRI)
    expect(cells[1].sessions).toBe(2)
    expect(cells[1].state).toBe('done')
    expect(cells[1].strength).toBe(true)
    // Two sessions, one filled cell: the count is kept for the spoken label,
    // which is now the only place it surfaces.
    expect(cells.filter((c) => c.state === 'done')).toHaveLength(1)
  })

  it('ignores sessions from other weeks', () => {
    const lastWeek = at(2026, 7, 15)
    const nextWeek = at(2026, 7, 29)
    const cells = buildWeekTrack([lastWeek, nextWeek, MON], FRI)
    expect(cells.filter((c) => c.sessions > 0)).toHaveLength(1)
    expect(cells[0].sessions).toBe(1)
  })

  it('renders a valid zero state on Monday morning', () => {
    const cells = buildWeekTrack([], MON)
    expect(cells.map((c) => c.state)).toEqual([
      'today',
      'future',
      'future',
      'future',
      'future',
      'future',
      'future',
    ])
    expect(cells.every((c) => c.sessions === 0)).toBe(true)
  })

  it('always returns seven cells indexed 0..6', () => {
    const cells = buildWeekTrack([WED], WED)
    expect(cells).toHaveLength(7)
    expect(cells.map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('leaves every cell free of the cardio mark when cardioAt is omitted', () => {
    // The argument is optional precisely so the calls that predate the star keep
    // behaving as they did.
    const cells = buildWeekTrack([MON, TUE], FRI)
    expect(cells.every((c) => c.cardio === false)).toBe(true)
  })

  it('marks the day a cardio happened', () => {
    const cells = buildWeekTrack([TUE], FRI, [TUE])
    expect(cells[1].state).toBe('done')
    expect(cells[1].cardio).toBe(true)
  })

  it('does not mark a strength-only day', () => {
    const cells = buildWeekTrack([MON, TUE], FRI, [TUE])
    expect(cells[0].cardio).toBe(false)
    expect(cells[1].cardio).toBe(true)
  })

  it('carries both marks on a day that had both kinds', () => {
    const cardio = at(2026, 7, 22, 19)
    const cells = buildWeekTrack([WED, cardio], FRI, [cardio])
    expect(cells[2].state).toBe('done')
    expect(cells[2].sessions).toBe(2)
    expect(cells[2]).toMatchObject({ strength: true, cardio: true })
  })

  it('marks a cardio-only day as cardio and nothing else', () => {
    const c1 = at(2026, 7, 22, 7)
    const c2 = at(2026, 7, 22, 19)
    const cells = buildWeekTrack([c1, c2], FRI, [c1, c2])
    expect(cells[2].sessions).toBe(2)
    expect(cells[2]).toMatchObject({ strength: false, cardio: true })
  })

  it('marks a strength-only day as strength and nothing else', () => {
    const cells = buildWeekTrack([WED], FRI)
    expect(cells[2]).toMatchObject({ strength: true, cardio: false })
  })

  it('never leaves a done day without at least one kind', () => {
    // Every session is one kind or the other, so a filled cell that carried
    // neither mark would mean the caller dropped one of the two lists.
    const cardio = at(2026, 7, 21, 8)
    const cells = buildWeekTrack([MON, TUE, cardio], FRI, [cardio])
    expect(cells.filter((c) => c.state === 'done').every((c) => c.strength || c.cardio)).toBe(true)
  })

  it('counts a cardio in the tally like any other session', () => {
    // The star says what kind, never how many — the number is the same number.
    const cells = buildWeekTrack([MON, TUE], FRI, [TUE])
    expect(cells.filter((c) => c.state === 'done')).toHaveLength(2)
  })

  it('ignores a cardio from another week', () => {
    const lastWeek = at(2026, 7, 15)
    const cells = buildWeekTrack([lastWeek, MON], FRI, [lastWeek])
    expect(cells.every((c) => c.cardio === false)).toBe(true)
  })
})

describe('currentStreak', () => {
  it('counts back from today', () => {
    const cells = buildWeekTrack([WED, THU], FRI)
    expect(currentStreak(cells, FRI)).toBe(2) // qua + qui, sex still open
  })

  it('does not break just because today is not trained yet', () => {
    const cells = buildWeekTrack([THU], FRI)
    expect(currentStreak(cells, FRI)).toBe(1)
  })

  it('includes today once it is trained', () => {
    const cells = buildWeekTrack([THU, FRI], FRI)
    expect(currentStreak(cells, FRI)).toBe(2)
  })

  it('stops at a gap', () => {
    const cells = buildWeekTrack([MON, THU], FRI)
    expect(currentStreak(cells, FRI)).toBe(1) // qui only; qua is a gap
  })

  it('is zero on an untouched week', () => {
    const cells = buildWeekTrack([], FRI)
    expect(currentStreak(cells, FRI)).toBe(0)
  })
})

describe('constants', () => {
  it('pins the weekly goal at 7', () => {
    expect(WEEKLY_GOAL).toBe(7)
  })

  it('labels seven days starting on Monday', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7)
    expect(WEEKDAY_LABELS[0]).toBe('seg')
    expect(WEEKDAY_LABELS[6]).toBe('dom')
  })
})
