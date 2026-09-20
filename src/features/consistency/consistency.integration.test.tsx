import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { fmtDayMonth } from '../../lib/format'
import { db } from '../../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  startCardioSession,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The Consistência screen (proposta C): stats, month calendar, the month's
 * session list (collapsed to 3 + "Ver mais"), 12-week blocks and 12-month bars
 * — all derived from the completed sessions of every gym.
 */

afterEach(async () => {
  cleanup()
  await Promise.all(
    [
      db.gyms,
      db.categories,
      db.exercises,
      db.days,
      db.weights,
      db.weightHistory,
      db.sessions,
      db.sessionEntries,
      db.exerciseNotes,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Fit Park', db)
  const ex = await createExercise({ name: 'Supino' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  useActiveGym.setState({ activeGymId: gym })
  return { gym, day }
}

const HALF_HOUR = 30 * 60_000

/**
 * A completed session whose workout happened at `at`: STARTED at `at`, done
 * 30 minutes later. Both instants are stamped — the day a workout lands on is
 * decided by its start (see `workoutAt`), so a seed that stamped only the
 * completion would leave the start at "now" and date every session today.
 * The completion is the one pushed away from `at`, never the start: a seed at
 * "now − 24 h" run at 00:20 must not drift into the day before.
 */
async function completeAt(gym: number, dayId: number, at: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
  await db.sessions.update(sid, { startedAt: at, completedAt: at + HALF_HOUR })
  return sid
}

/** Same, for a CARDIO. */
async function completeCardioAt(gym: number, exerciseId: number, at: number) {
  const { sessionId } = await startCardioSession(gym, exerciseId, db)
  await completeSession(sessionId, db)
  await db.sessions.update(sessionId, { startedAt: at, completedAt: at + HALF_HOUR })
  return sessionId
}

/** A session that STRADDLES midnight: begun at `startedAt`, done 35 min later. */
async function completeAcrossMidnight(gym: number, dayId: number, startedAt: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
  await db.sessions.update(sid, { startedAt, completedAt: startedAt + 35 * 60_000 })
  return sid
}

/** Local timestamp for `daysAgo` days before today, at `h`:`m`. */
function daysAgoAt(daysAgo: number, h: number, m = 0): number {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Local timestamp for day `d` of the current month (guarded to a valid day). */
function thisMonth(d: number, h = 10): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), d, h).getTime()
}

/** Local timestamp inside the previous month. */
function prevMonth(d: number): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1, d, 10).getTime()
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/sessions']}>
      <App />
    </MemoryRouter>,
  )
}

function cards() {
  return screen.getAllByRole('button').filter((b) => b.classList.contains('session-card'))
}

describe('Consistência — stats and calendar', () => {
  it('shows the three stat tiles derived from the history', async () => {
    const { gym, day } = await seed()
    // Yesterday and the day before → day streak 2 (today untrained), this month 2.
    const now = Date.now()
    await completeAt(gym, day, now - 24 * 3600_000)
    await completeAt(gym, day, now - 48 * 3600_000)

    renderScreen()

    expect(await screen.findByText('Dias em sequência')).toBeInTheDocument()
    expect(screen.getByText('Semanas em sequência')).toBeInTheDocument()
    const dayTile = screen.getByText('Dias em sequência').closest('.stat-tile')!
    // Yesterday + the day before, today still open.
    expect(within(dayTile as HTMLElement).getByText('2')).toBeInTheDocument()
  })

  it('marks a trained day, with the musculação dot, on the month calendar', async () => {
    const { gym, day } = await seed()
    const today = new Date().getDate()
    await completeAt(gym, day, thisMonth(today, 7))
    // A second workout the same day adds no second mark — the dot answers
    // "was there musculação", not "how many".
    await completeAt(gym, day, thisMonth(today, 19))

    renderScreen()

    await waitFor(() => {
      const grid = document.querySelector('.cal-grid')!
      const done = grid.querySelectorAll('.cal-cell.done')
      expect(done).toHaveLength(1)
      expect(done[0].classList.contains('strength')).toBe(true)
      expect(done[0].classList.contains('cardio')).toBe(false)
      expect(done[0].textContent).toBe(String(today))
    })
  })

  it('stars a cardio-only day, without the musculação dot', async () => {
    const { gym } = await seed()
    const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const today = new Date().getDate()
    await completeCardioAt(gym, esteira, thisMonth(today, 19))

    renderScreen()

    await waitFor(() => {
      const done = document.querySelector('.cal-grid')!.querySelectorAll('.cal-cell.done')
      expect(done).toHaveLength(1)
      expect(done[0].classList.contains('cardio')).toBe(true)
      expect(done[0].classList.contains('strength')).toBe(false)
    })
  })

  it('carries both marks on a day that held both kinds', async () => {
    const { gym, day } = await seed()
    const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const today = new Date().getDate()
    await completeAt(gym, day, thisMonth(today, 7))
    await completeCardioAt(gym, esteira, thisMonth(today, 12))

    renderScreen()

    await waitFor(() => {
      const done = document.querySelector('.cal-grid')!.querySelectorAll('.cal-cell.done')
      expect(done).toHaveLength(1)
      expect(done[0].classList.contains('strength')).toBe(true)
      expect(done[0].classList.contains('cardio')).toBe(true)
    })
  })

  it('navigates months: list, tile and calendar move together, "next" stops at today', async () => {
    const { gym, day } = await seed()
    await completeAt(gym, day, thisMonth(1))
    await completeAt(gym, day, prevMonth(2))

    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => expect(cards()).toHaveLength(1))
    // At the current month, "next" is disabled; "previous" can reach the history.
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
    const prev = screen.getByRole('button', { name: 'Mês anterior' })
    expect(prev).toBeEnabled()

    await user.click(prev)
    await waitFor(() => expect(cards()).toHaveLength(1))
    // The floor is the first month with a session — can't go further back.
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeEnabled()
  })
})

describe('Consistência — month list with "Ver mais"', () => {
  it('collapses to 3 and expands the rest in place', async () => {
    const { gym, day } = await seed()
    const today = new Date().getDate()
    // 5 sessions this month, on early days so they exist in every month length.
    for (let i = 0; i < 5; i++) {
      await completeAt(gym, day, thisMonth(Math.min(i + 1, today)))
    }

    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => expect(cards()).toHaveLength(3))
    const more = screen.getByRole('button', { name: /Ver mais 2 treinos/ })

    await user.click(more)
    await waitFor(() => expect(cards()).toHaveLength(5))

    await user.click(screen.getByRole('button', { name: /Ver menos/ }))
    await waitFor(() => expect(cards()).toHaveLength(3))
  })

  it('no "Ver mais" when the month has 3 sessions or fewer', async () => {
    const { gym, day } = await seed()
    await completeAt(gym, day, thisMonth(1))

    renderScreen()

    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(screen.queryByRole('button', { name: /Ver mais/ })).not.toBeInTheDocument()
  })

  it('changing month collapses the list back to 3', async () => {
    const { gym, day } = await seed()
    const today = new Date().getDate()
    for (let i = 0; i < 4; i++) {
      await completeAt(gym, day, thisMonth(Math.min(i + 1, today)))
    }
    await completeAt(gym, day, prevMonth(2))

    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => expect(cards()).toHaveLength(3))
    await user.click(screen.getByRole('button', { name: /Ver mais 1 treino/ }))
    await waitFor(() => expect(cards()).toHaveLength(4))

    // Previous month: its own (single) list, collapsed state reset…
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await waitFor(() => expect(cards()).toHaveLength(1))

    // …and back to the current month, collapsed again despite the expand before.
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await waitFor(() => expect(cards()).toHaveLength(3))
    expect(screen.getByRole('button', { name: /Ver mais 1 treino/ })).toBeInTheDocument()
  })
})

describe('Consistência — long-range blocks', () => {
  it('renders 12 week blocks and 12 month bars with counts', async () => {
    const { gym, day } = await seed()
    await completeAt(gym, day, Date.now() - 3600_000)

    renderScreen()

    await waitFor(() => {
      expect(document.querySelectorAll('.hm-strip .hm-c')).toHaveLength(12)
      expect(document.querySelectorAll('.mo-chart .mo-col')).toHaveLength(12)
    })
    // The current week block and the current month bar both carry the session.
    const weekBlocks = [...document.querySelectorAll('.hm-strip .hm-c')]
    expect(weekBlocks[11].textContent).toBe('1')
    const monthNums = [...document.querySelectorAll('.mo-chart .mo-num')]
    expect(monthNums[11].textContent).toBe('1')
    // Current month bar is the partial (in-progress) tone.
    const bars = [...document.querySelectorAll('.mo-chart .mo-bar')]
    expect(bars[11].classList.contains('partial')).toBe(true)
  })

  it('the tab is labelled Histórico and is active here', async () => {
    await seed()
    renderScreen()

    const tab = await screen.findByRole('link', { name: /Histórico/ })
    expect(tab).toHaveClass('active')
    // The names this tab has been called before, none of which may linger.
    expect(screen.queryByRole('link', { name: /Sessões/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Consistência/ })).not.toBeInTheDocument()
  })
})

/**
 * The midnight cases need "yesterday" to be on the calendar the screen opens
 * on — the current month. On the 1st it is not, so these skip rather than
 * assert a cell that is not drawn.
 */
const yesterdayOnCalendar = it.skipIf(new Date().getDate() === 1)

describe('Consistência — a workout belongs to the day it STARTED', () => {
  yesterdayOnCalendar('marks the calendar on the day the session began, not the day it ended', async () => {
    const { gym, day } = await seed()
    // Began 23:40 yesterday, done 00:15 today.
    await completeAcrossMidnight(gym, day, daysAgoAt(1, 23, 40))
    const yesterday = new Date(daysAgoAt(1, 12)).getDate()

    renderScreen()

    await waitFor(() => {
      const done = document.querySelector('.cal-grid')!.querySelectorAll('.cal-cell.done')
      expect(done).toHaveLength(1)
      expect(done[0].textContent).toBe(String(yesterday))
    })
    // The list item is dated the same day, and the duration is still the real one.
    const [card] = cards()
    expect(card.textContent).toContain('Ontem')
    expect(card.textContent).toContain(fmtDayMonth(daysAgoAt(1, 12)))
    expect(card.textContent).toContain('35 min')
    expect(card.textContent).not.toContain('Hoje')
  })

  yesterdayOnCalendar('stars a cardio on the day it began', async () => {
    const { gym } = await seed()
    const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const { sessionId } = await startCardioSession(gym, esteira, db)
    await completeSession(sessionId, db)
    const startedAt = daysAgoAt(1, 23, 55)
    await db.sessions.update(sessionId, { startedAt, completedAt: startedAt + 25 * 60_000 })
    const yesterday = new Date(daysAgoAt(1, 12)).getDate()

    renderScreen()

    await waitFor(() => {
      const done = document.querySelector('.cal-grid')!.querySelectorAll('.cal-cell.done')
      expect(done).toHaveLength(1)
      expect(done[0].classList.contains('cardio')).toBe(true)
      expect(done[0].textContent).toBe(String(yesterday))
    })
  })

  it('keeps the day streak alive across a late session', async () => {
    const { gym, day } = await seed()
    // The day before yesterday at 10:00, and yesterday begun at 23:50, done
    // after midnight. Read by completion, yesterday would be empty and the
    // streak would be 1 (today's "phantom" workout) instead of 2.
    await completeAt(gym, day, daysAgoAt(2, 10))
    await completeAcrossMidnight(gym, day, daysAgoAt(1, 23, 50))

    renderScreen()

    const dayTile = (await screen.findByText('Dias em sequência')).closest('.stat-tile')!
    await waitFor(() => expect(within(dayTile as HTMLElement).getByText('2')).toBeInTheDocument())
  })

  it('the opened session says the day it was done, with its duration', async () => {
    const { gym, day } = await seed()
    const sid = await completeAcrossMidnight(gym, day, daysAgoAt(1, 23, 40))

    render(
      <MemoryRouter initialEntries={[`/session/${sid}`]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Feito ontem · 35 min/)).toBeInTheDocument()
    expect(screen.queryByText(/Concluído hoje/)).not.toBeInTheDocument()
  })
})
