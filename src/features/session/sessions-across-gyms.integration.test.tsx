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
  deleteGym,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The history is one list, not one per gym.
 *
 * The active gym decides where a workout happens and which target weights apply.
 * It used to also decide what the user could see of their own past: the list was
 * `where('gymId')`, and the footer even said "nesta academia" — the app knew it
 * was hiding sessions and offered no way to see them.
 *
 * The history now lives on the Consistência screen, scoped to the displayed
 * month — so the seeds below complete sessions *today*, keeping them inside the
 * month the screen opens on.
 */

/** Recent completion stamps, newest last, all within today. */
const NOW = Date.now()

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

/** Two gyms, one shared day (days are global), gym A active. */
async function seedTwoGyms() {
  const a = await createGym('Smart Fit', db)
  const b = await createGym('Bio Ritmo', db)
  const ex = await createExercise({ name: 'Supino' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  useActiveGym.setState({ activeGymId: a })
  return { a, b, day }
}

/** Complete a session at `gym`, stamping `completedAt` so order is the data's. */
async function completeAt(gym: number, dayId: number, completedAt: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
  await db.sessions.update(sid, { completedAt })
  return sid
}

function renderSessions() {
  return render(
    <MemoryRouter initialEntries={['/sessions']}>
      <App />
    </MemoryRouter>,
  )
}

/** The session cards currently on screen, in order. */
function cards() {
  return screen.getAllByRole('button').filter((b) => b.classList.contains('session-card'))
}

describe('Session history spans every gym', () => {
  it('lists sessions from both gyms in one chronological list', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)
    await completeAt(b, day, NOW - 1_000)

    renderSessions()

    await waitFor(() => expect(cards()).toHaveLength(2))
    // Newest first, across gyms — not grouped by gym.
    expect(within(cards()[0]).getByText('Bio Ritmo')).toBeInTheDocument()
    expect(within(cards()[1]).getByText('Smart Fit')).toBeInTheDocument()
  })

  it('shows the same list whichever gym is active', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)
    await completeAt(b, day, NOW - 1_000)

    renderSessions()
    await waitFor(() => expect(cards()).toHaveLength(2))

    // Switching the active gym must not filter the past.
    useActiveGym.setState({ activeGymId: b })
    await waitFor(() => expect(cards()).toHaveLength(2))
    expect(screen.getByText('Smart Fit')).toBeInTheDocument()
    expect(screen.getByText('Bio Ritmo')).toBeInTheDocument()
  })

  it('counts every session in the footer, without claiming a gym scope', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)
    await completeAt(b, day, NOW - 1_000)

    renderSessions()

    expect(await screen.findByText(/2 treinos/)).toBeInTheDocument()
    expect(screen.queryByText(/nesta academia/)).not.toBeInTheDocument()
  })

  it('keeps sessions of a deleted gym, labelled rather than blank', async () => {
    // deleteGym leaves sessions behind. They used to vanish from the UI, since a
    // deleted gym can never be the active one — real workouts, hidden by an
    // implementation detail.
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)
    await deleteGym(a, db)
    useActiveGym.setState({ activeGymId: b })

    renderSessions()

    await waitFor(() => expect(cards()).toHaveLength(1))
    expect(within(cards()[0]).getByText('Academia removida')).toBeInTheDocument()
    expect(within(cards()[0]).getByText('Dia 1')).toBeInTheDocument()
  })

  it('has no gym selector in the header', async () => {
    // Nothing on this screen responds to the active gym any more, and a control
    // with no visible effect reads as broken.
    const { a, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)

    renderSessions()
    await waitFor(() => expect(cards()).toHaveLength(1))

    const header = document.querySelector('.appbar')!
    expect(within(header as HTMLElement).queryByText('Smart Fit')).not.toBeInTheDocument()
    expect(header.querySelector('.gym-selector, .gym-btn')).toBeNull()
  })

  it('opens a session from another gym than the active one', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, NOW - 2_000)
    useActiveGym.setState({ activeGymId: b })

    const user = userEvent.setup()
    renderSessions()
    await waitFor(() => expect(cards()).toHaveLength(1))

    await user.click(cards()[0])

    // Left the list for that session's detail, even though it belongs to a gym
    // that is not the active one.
    await waitFor(() => expect(cards()).toHaveLength(0))
    expect(await screen.findByText('Supino')).toBeInTheDocument()
  })
})
