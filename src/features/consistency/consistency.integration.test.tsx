import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
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

/** Complete a session stamped at `completedAt`. */
async function completeAt(gym: number, dayId: number, completedAt: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
  await db.sessions.update(sid, { completedAt })
  return sid
}

/** Complete a CARDIO stamped at `completedAt`. */
async function completeCardioAt(gym: number, exerciseId: number, completedAt: number) {
  const { sessionId } = await startCardioSession(gym, exerciseId, db)
  await completeSession(sessionId, db)
  await db.sessions.update(sessionId, { completedAt })
  return sessionId
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
