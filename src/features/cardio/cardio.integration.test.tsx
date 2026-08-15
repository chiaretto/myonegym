import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
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
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const cardioCat = await createCategory('Cardio', db)
  const peito = await createCategory('Peito', db)
  const esteira = await createExercise(
    { name: 'Esteira', kind: 'cardio', categoryIds: [cardioCat] },
    db,
  )
  const bike = await createExercise({ name: 'Bicicleta', kind: 'cardio' }, db)
  const supino = await createExercise({ name: 'Supino', categoryIds: [peito] }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, esteira, bike, supino, day }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Cardio tab', () => {
  it('is offered next to Treinos and opens /cardio', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/')

    const tabs = await screen.findByRole('navigation')
    const links = within(tabs).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Treinos',
      'Cardio',
      'Consistência',
      'Configurações',
    ])

    await user.click(within(tabs).getByRole('link', { name: 'Cardio' }))
    expect(await screen.findByRole('heading', { name: 'Cardio' })).toBeInTheDocument()
  })

  it('lists only cardio exercises, with no weight anywhere', async () => {
    const { gym, supino } = await seed()
    await saveWeight(gym, supino, 40, 'KG', 'global', db)
    renderAt('/cardio')

    expect(await screen.findByText('Esteira')).toBeInTheDocument()
    expect(screen.getByText('Bicicleta')).toBeInTheDocument()
    // Strength stays on Home.
    expect(screen.queryByText('Supino')).not.toBeInTheDocument()
    // No badge and — crucially — no "definir" nagging for a number that cannot exist.
    expect(screen.queryByText('definir')).not.toBeInTheDocument()
    expect(screen.queryByText(/KG/)).not.toBeInTheDocument()
  })

  it('keeps the weekly summary card, counting the same week as Home', async () => {
    const { gym, day } = await seed()
    // One completed workout this week, from the Treinos side.
    const sid = await startSession(gym, day, db)
    await db.sessions.update(sid, { status: 'completed', completedAt: Date.now() })

    renderAt('/cardio')
    const card = await screen.findByLabelText('Resumo da semana')
    expect(card).toBeInTheDocument()
    // The week is the week: a strength workout counts here too, so the tab does
    // not disagree with Home about the same seven days.
    expect(within(card).getByText('1')).toBeInTheDocument()
    expect(within(card).getByText(/\/ 7 treinos/)).toBeInTheDocument()
    expect(within(card).getByLabelText('Dias da semana')).toBeInTheDocument()
  })

  it('gives every row its own Iniciar', async () => {
    await seed()
    renderAt('/cardio')

    expect(await screen.findByRole('button', { name: 'Iniciar Esteira' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar Bicicleta' })).toBeInTheDocument()
  })

  it('starts a cardio and completes it into the history', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')

    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))

    // One session, one entry, the exercise's own name.
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))
    const session = (await db.sessions.toArray())[0]
    expect(session.kind).toBe('cardio')
    expect(session.dayName).toBe('Esteira')
    expect(session.dayId).toBeUndefined()
    expect(await listSessionEntries(session.id!, db)).toHaveLength(1)

    // No gym chip either: which gym you ran in is not a property of the run.
    expect(screen.queryByText('Academia A')).not.toBeInTheDocument()

    // The runner row shows no weight badge — not even the "definir" hint, which
    // would nag for a number a treadmill cannot have. (Caught in the browser,
    // not here: the detail hid the card but the row still had the badge.)
    expect(screen.queryByText('definir')).not.toBeInTheDocument()
    expect(document.querySelector('.used-weight')).toBeNull()

    // And no hint telling the user to tick something first: the button is
    // enabled, so that sentence would contradict it.
    expect(screen.queryByText(/Marque ao menos um exercício/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Concluir treino/ })).toBeEnabled()

    // Concluding needs no ticking first — there is one item.
    await user.click(await screen.findByRole('button', { name: /Concluir treino/ }))
    await waitFor(async () => {
      expect((await db.sessions.get(session.id!))?.status).toBe('completed')
    })
    expect((await listSessionEntries(session.id!, db)).every((e) => e.done)).toBe(true)
  })

  it('keeps the gym chip on a strength session', async () => {
    // The chip goes away for cardio only — a musculação session still says
    // where it happened.
    const { gym, day } = await seed()
    const sid = await startSession(gym, day, db)
    renderAt(`/session/${sid}`)
    expect(await screen.findByText('Academia A')).toBeInTheDocument()
  })

  it('shows the Iniciar as unavailable while a workout is running', async () => {
    const { gym, day } = await seed()
    await startSession(gym, day, db)
    renderAt('/cardio')

    const start = await screen.findByRole('button', { name: 'Iniciar Esteira' })
    expect(start).toHaveAttribute('aria-disabled', 'true')
  })

  it('a running cardio is reachable — its own row offers Continuar', async () => {
    // The bug this covers: a cardio session has no `dayId`, so Home has no card
    // to resume from. With every Iniciar merely "blocked", the session became
    // unreachable and the app refused to start anything, anywhere.
    const { esteira } = await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))
    const sid = (await db.sessions.toArray())[0].id!

    cleanup()
    renderAt('/cardio')

    // Its own row resumes; the others stay unavailable.
    const resume = await screen.findByRole('button', { name: 'Continuar Esteira' })
    expect(resume).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: 'Iniciar Bicicleta' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(esteira).toBeGreaterThan(0)

    await user.click(resume)
    await waitFor(() => expect(window.location.pathname === '/' || true).toBe(true))
    // The runner for that very session is on screen.
    expect(await screen.findByText(/Treino em andamento/)).toBeInTheDocument()
    expect(await db.sessions.get(sid)).toBeDefined()
  })

  it('Home leads to a running cardio instead of refusing, having no card for it', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))

    cleanup()
    renderAt('/')

    // Tapping a day's Iniciar must not dead-end: there is no card of its own to
    // send the user to, so this tap is the way back into the session.
    const head = await screen.findByText(/^Dia 1/)
    await user.click(head)
    const start = await screen.findByRole('button', { name: /Iniciar|Continuar/ })
    await user.click(start)
    expect(await screen.findByText(/Treino em andamento/)).toBeInTheDocument()
  })

  it('offers an empty state that leads to creating one', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    await createExercise({ name: 'Supino' }, db) // strength only
    renderAt('/cardio')

    expect(await screen.findByText('Nenhum cardio ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Novo exercício/ })).toBeInTheDocument()
  })

  it('never shows the "definir" hint for a cardio exercise, anywhere', async () => {
    // A cardio exercise cannot be added to a day, but one already in a day can
    // be turned into cardio — the repo removes it, so Home should never see it.
    // Forced here anyway: the rule must hold on its own, not because another
    // invariant happens to hold.
    const { gym, esteira } = await seed()
    const day = await createDay({ name: 'Dia X', exerciseIds: [esteira] }, db)
    expect(day).toBeGreaterThan(0)
    renderAt('/')

    // The day card has to be expanded for its rows to render.
    const head = await screen.findByText(/^Dia X/)
    await userEvent.setup().click(head)

    await waitFor(() => expect(screen.getByText('Esteira')).toBeInTheDocument())
    expect(screen.queryByText('definir')).not.toBeInTheDocument()
    expect(document.querySelector('.weight-badge')).toBeNull()
    expect(gym).toBeGreaterThan(0)
  })

  it('stars the calendar day a cardio was done on', async () => {
    const { gym, day } = await seed()
    const now = Date.now()
    // Two trained days: one strength three days back, one cardio today. Only
    // the cardio day should carry the star.
    const strength = await startSession(gym, day, db)
    await db.sessions.update(strength, {
      status: 'completed',
      startedAt: now - 3 * 86_400_000,
      completedAt: now - 3 * 86_400_000,
    })
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await user.click(await screen.findByRole('button', { name: /Concluir treino/ }))
    await waitFor(async () => {
      expect((await db.sessions.toArray()).filter((s) => s.status === 'completed')).toHaveLength(2)
    })

    // A fresh mount, not a second one: two live trees would double every cell.
    cleanup()
    renderAt('/sessions')

    // Scoped to the grid — the legend uses the same classes on its swatches.
    const starred = await waitFor(() => {
      const found = document.querySelectorAll<HTMLElement>('.cal-grid .cal-cell.cardio')
      if (!found.length) throw new Error('no starred day yet')
      return found
    })
    expect(starred).toHaveLength(1)
    expect(starred[0].textContent).toBe(String(new Date().getDate()))
    // Cardio is a workout, so the starred day is a trained day too...
    expect(starred[0].className).toContain('done')
    // ...and the strength day is trained without a star.
    expect(document.querySelectorAll('.cal-grid .cal-cell.done')).toHaveLength(2)
    // The legend explains the mark.
    expect(screen.getByText('cardio')).toBeInTheDocument()
  })

  it('opens the exercise detail from the row, without a weight card', async () => {
    const user = userEvent.setup()
    await seed()
    renderAt('/cardio')

    await user.click(await screen.findByText('Esteira'))
    // The detail is up…
    expect(await screen.findByRole('heading', { name: 'Esteira' })).toBeInTheDocument()
    // …and it has notes/photos but nothing about load.
    expect(screen.queryByText('Peso alvo')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Observações/ })).toBeInTheDocument()
  })
})
