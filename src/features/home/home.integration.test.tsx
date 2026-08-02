import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createCategory,
  createDay,
  createExercise,
  createGym,
  saveWeight,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/** Lets one test hold useActiveSession at its loading value (`undefined`).
 *  Off by default, so every other test here runs against the real hook. */
const pendingSession = vi.hoisted(() => ({ on: false }))
vi.mock('../../lib/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/hooks')>()
  return {
    ...actual,
    // The real hook is called either way: skipping it would change the hook
    // order between renders the moment the flag flips.
    useActiveSession: (gymId: number | null) => {
      const real = actual.useActiveSession(gymId)
      return pendingSession.on ? undefined : real
    },
  }
})

afterEach(async () => {
  pendingSession.on = false
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
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

describe('Home end-to-end', () => {
  it('shows seeded days and the per-gym weight badge after expanding', async () => {
    // Seed a controlled fixture (independent of the sample-data content).
    const gym = await createGym('Academia A', undefined, db)
    const cat = await createCategory('Peito', db)
    const supino = await createExercise({ name: 'Supino Reto', categoryIds: [cat] }, db)
    await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
    await saveWeight(gym, supino, 40, 'KG', db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // day headers appear from live data
    const day1 = await screen.findByText('Dia 1')
    // exercises + badge only after expanding
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
    await user.click(day1)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('40 KG')).toBeInTheDocument())
  })
})

/** Two days in one gym, so one can hold the open session and the other be blocked. */
async function seedTwoDays() {
  const gym = await createGym('Academia A', undefined, db)
  const cat = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [cat] }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryIds: [cat] }, db)
  const dia1 = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  await createDay({ name: 'Dia 2', exerciseIds: [crucifixo] }, db)
  return { gym, dia1 }
}

const startButtons = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.day-start'))

describe('Iniciar is disabled on the other days while a session is open', () => {
  it('greys out the other days and keeps Continuar on the session’s day', async () => {
    const { gym, dia1 } = await seedTwoDays()
    await startSession(gym, dia1, db)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Dia 1 owns the session: it is the one path left open.
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument()

    // Dia 2 keeps its name — it is still the button for starting Dia 2, merely
    // unavailable — but is announced and painted as disabled.
    const dia2 = await screen.findByRole('button', { name: 'Iniciar' })
    await waitFor(() => expect(dia2).toHaveAttribute('aria-disabled', 'true'))
    expect(dia2).toHaveClass('blocked')

    // The affordance that IS available is not greyed.
    expect(screen.getByRole('button', { name: 'Continuar' })).not.toHaveClass('blocked')
  })

  it('explains on tap instead of opening the other day’s session', async () => {
    const { gym, dia1 } = await seedTwoDays()
    await startSession(gym, dia1, db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const dia2 = await screen.findByRole('button', { name: 'Iniciar' })
    await waitFor(() => expect(dia2).toHaveAttribute('aria-disabled', 'true'))
    await user.click(dia2)

    // It says why...
    expect(await screen.findByText(/treino em andamento/i)).toBeInTheDocument()
    // ...and that is all: no second session, and the user is still on Home
    // rather than inside the Dia 1 runner they never asked for.
    expect(await db.sessions.count()).toBe(1)
    expect(screen.getByText('Dia 2')).toBeInTheDocument()
    expect(screen.queryByText(/concluídos/)).not.toBeInTheDocument()
  })

  it('does not disable the day whose own session is open (tapping it resumes)', async () => {
    const { gym, dia1 } = await seedTwoDays()
    await startSession(gym, dia1, db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const resume = await screen.findByRole('button', { name: 'Continuar' })
    await user.click(resume)
    expect(await screen.findByText(/concluídos/)).toBeInTheDocument()
  })

  it('leaves every button enabled when no session is open', async () => {
    await seedTwoDays()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByText('Dia 2')
    await waitFor(() => expect(startButtons()).toHaveLength(2))
    for (const b of startButtons()) {
      expect(b).not.toHaveAttribute('aria-disabled')
      expect(b).not.toHaveClass('blocked')
    }
  })

  it('paints nothing disabled while the session read is still unanswered', async () => {
    // useActiveSession returns `undefined` while reading and `null` when there
    // is no session — a distinction the accordion has to respect, or it greys
    // every card for that window and repaints on each return to Home.
    //
    // The window is pinned here rather than raced for: seeding no session and
    // watching the real settle proves nothing, because the days never reach the
    // screen before the session read answers. Holding the hook at `undefined` is
    // the only way to assert on the frame that matters.
    await seedTwoDays()
    pendingSession.on = true

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByText('Dia 2')
    expect(startButtons()).toHaveLength(2)
    expect(document.querySelector('.day-start.blocked')).toBeNull()
    expect(document.querySelector('.day-start[aria-disabled="true"]')).toBeNull()
  })
})
