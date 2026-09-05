import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createCategory,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  saveWeight,
  setEntryDone,
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
  it('shows seeded days and the weight badge after expanding', async () => {
    // Seed a controlled fixture (independent of the sample-data content).
    const gym = await createGym('Academia A', db)
    const cat = await createCategory('Peitoral', db)
    const supino = await createExercise({ name: 'Supino Reto', categoryIds: [cat] }, db)
    await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
    await saveWeight(gym, supino, 40, 'KG', 'global', db)
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

  it("shows this gym's exception over the global weight", async () => {
    const gym = await createGym('Academia A', db)
    const outra = await createGym('Academia B', db)
    const supino = await createExercise({ name: 'Supino Reto' }, db)
    const rosca = await createExercise({ name: 'Rosca Direta' }, db)
    await createDay({ name: 'Dia 1', exerciseIds: [supino, rosca] }, db)
    await saveWeight(gym, supino, 40, 'KG', 'global', db)
    await saveWeight(gym, rosca, 20, 'KG', 'global', db)
    // Only the bench differs here; the curl is whatever it is everywhere.
    await saveWeight(outra, supino, 30, 'KG', 'gym', db)
    useActiveGym.setState({ activeGymId: outra })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByText('Dia 1'))
    await waitFor(() => expect(screen.getByText('30 KG')).toBeInTheDocument())
    expect(screen.getByText('20 KG')).toBeInTheDocument()
  })
})

/** Two days in one gym, so one can hold the open session and the other be blocked. */
async function seedTwoDays() {
  const gym = await createGym('Academia A', db)
  const cat = await createCategory('Peitoral', db)
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

  it('asks, in a dialog, instead of opening the other day’s session', async () => {
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

    // CHANGED: a dialog, not a toast. A toast is the wrong instrument for a
    // fork in the road — it is quiet, it leaves on its own, and it left the
    // user staring at the button that had just refused them.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName(/treino em andamento/i)
    // All three ways out are visible before choosing, because two of them
    // change data.
    expect(within(dialog).getByRole('button', { name: /Concluir e iniciar "Dia 2"/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Voltar ao treino atual' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Descartar "Dia 1"/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toBeInTheDocument()

    // Nothing has happened yet.
    expect(await db.sessions.count()).toBe(1)
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

/**
 * The collision dialog. Tapping Iniciar on another day while a workout is open
 * used to answer with a toast: the reason alone, and nothing to do about it.
 * Now it asks, and every way out is named — including the two that change data.
 */
describe('Starting another workout while one is open', () => {
  const openDialog = async () => {
    const { gym, dia1 } = await seedTwoDays()
    const sessionId = await startSession(gym, dia1, db)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const dia2 = await screen.findByRole('button', { name: 'Iniciar' })
    await waitFor(() => expect(dia2).toHaveAttribute('aria-disabled', 'true'))
    await user.click(dia2)
    return { user, sessionId, dialog: await screen.findByRole('dialog') }
  }

  it('closing with the X does nothing at all', async () => {
    const { user, dialog } = await openDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Still one session, still on Home: dismissing is never one of the options.
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.toArray())[0].status).toBe('active')
    expect(screen.getByText('Dia 2')).toBeInTheDocument()
  })

  it('"Voltar ao treino atual" opens the session that was already running', async () => {
    const { user, sessionId, dialog } = await openDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Voltar ao treino atual' }))

    expect(await screen.findByRole('heading', { name: 'Treino em andamento', level: 1 })).toBeInTheDocument()
    expect(document.querySelector('.session-day')).toHaveTextContent('Dia 1')
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.get(sessionId))!.status).toBe('active')
  })

  it('"Concluir e iniciar" banks the old workout and opens the new one', async () => {
    const { gym, dia1 } = await seedTwoDays()
    const sessionId = await startSession(gym, dia1, db)
    // Completing needs at least one entry done — the runner's own floor.
    const [entry] = await listSessionEntries(sessionId, db)
    await setEntryDone(entry.id!, true, db)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const dia2 = await screen.findByRole('button', { name: 'Iniciar' })
    await waitFor(() => expect(dia2).toHaveAttribute('aria-disabled', 'true'))
    await user.click(dia2)

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Concluir e iniciar "Dia 2"/ }))

    // The old one is history, with what was marked on it kept.
    await waitFor(async () => expect((await db.sessions.get(sessionId))!.status).toBe('completed'))
    expect((await listSessionEntries(sessionId, db))[0].done).toBe(true)
    // And the new one is running.
    await waitFor(async () => expect(await db.sessions.count()).toBe(2))
    expect(await screen.findByRole('heading', { name: 'Treino em andamento', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.session-day')).toHaveTextContent('Dia 2'))
  })

  it('refuses to bank a workout with nothing marked, and says why', async () => {
    const { dialog } = await openDialog()

    // Same floor the runner's "Concluir treino" enforces: an empty session is
    // abandoned, not completed. Offering it here would just fail on tap.
    expect(within(dialog).getByRole('button', { name: /Concluir e iniciar/ })).toBeDisabled()
    expect(within(dialog).getByText(/Nada foi marcado como concluído/)).toBeInTheDocument()
  })

  it('"Descartar" throws the old workout away and opens the new one', async () => {
    const { user, sessionId, dialog } = await openDialog()

    await user.click(within(dialog).getByRole('button', { name: /Descartar "Dia 1"/ }))

    await waitFor(async () => expect(await db.sessions.get(sessionId)).toBeUndefined())
    // Its entries go with it, rather than being left orphaned.
    expect(await listSessionEntries(sessionId, db)).toHaveLength(0)
    expect(await screen.findByRole('heading', { name: 'Treino em andamento', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.session-day')).toHaveTextContent('Dia 2'))
  })
})
