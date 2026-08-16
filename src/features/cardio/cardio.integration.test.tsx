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

/**
 * Finish the cardio from its session screen — where Iniciar now lands. The
 * button is not gated on ticking the single entry: `completeSession` ticks it,
 * rather than asking the user for the same fact twice.
 */
async function completeTheCardio(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Concluir treino/ }))
}

/**
 * Iniciar lands on the session; the exercise is one tap further in. Waiting for
 * the session screen first is not decoration: Iniciar navigates asynchronously,
 * and the Cardio list has a link to the very same exercise, so a click issued
 * too early lands on the catalog instead.
 */
async function openTheExercise(user: ReturnType<typeof userEvent.setup>, name: string) {
  await screen.findByRole('heading', { name: 'Treino em andamento' })
  await user.click(await screen.findByRole('link', { name: new RegExp(name) }))
  await screen.findByRole('tab', { name: /Observações/ })
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

  it('starts a cardio on its session screen, and completes from there', async () => {
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
    const entries = await listSessionEntries(session.id!, db)
    expect(entries).toHaveLength(1)

    // CHANGED: the session screen, same as a strength workout — it used to jump
    // straight to the exercise.
    expect(await screen.findByRole('heading', { name: 'Treino em andamento' })).toBeInTheDocument()
    expect(screen.getByText(/de 1 concluídos/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Esteira/ })).toBeInTheDocument()

    // No gym chip though: which gym you ran in is not a property of the run.
    expect(screen.queryByText('Academia A')).not.toBeInTheDocument()
    // And nothing asks for a weight a treadmill cannot have.
    expect(screen.queryByText('definir')).not.toBeInTheDocument()

    await completeTheCardio(user)
    await waitFor(async () => {
      expect((await db.sessions.get(session.id!))?.status).toBe('completed')
    })
    expect((await listSessionEntries(session.id!, db)).every((e) => e.done)).toBe(true)

    // A cardio ends where a strength workout ends: on the summary, with the
    // share buttons.
    expect(await screen.findByRole('heading', { name: 'Sessão' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Compartilhar$/ })).toBeInTheDocument()
  })

  it('carries the workout clock above the tabs on the exercise screen', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await openTheExercise(user, 'Esteira')

    expect(screen.getByText(/Duração:/)).toBeInTheDocument()
    const clock = screen.getByText(/^\d\d:\d\d:\d\d$/)

    // Above the tabs, so it holds on Execução, Observações and Foto alike…
    const tablist = screen.getByRole('tablist')
    expect(clock.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // …and switching tab does not take it away.
    await user.click(screen.getByRole('tab', { name: /Foto/ }))
    expect(screen.getByText(/Duração:/)).toBeInTheDocument()
  })

  it('leaves the strength exercise screen alone — its session screen already counts', async () => {
    // Not a cardio: this is one step inside a session whose own screen carries
    // the clock, and two counters for one workout is one too many.
    const { gym, day } = await seed()
    const sid = await startSession(gym, day, db)
    const entry = (await listSessionEntries(sid, db))[0]
    renderAt(`/session/${sid}/entry/${entry.id}`)

    await screen.findByRole('tab', { name: /Observações/ })
    expect(screen.queryByText(/Duração:/)).toBeNull()
  })

  it('offers no Voltar/Avançar — a cardio session holds one exercise', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await openTheExercise(user, 'Esteira')

    // Two permanently dead controls say less than no controls at all.
    expect(screen.queryByRole('button', { name: 'Exercício anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Próximo exercício' })).toBeNull()
    // The one thing there IS to do is still there.
    expect(screen.getByRole('button', { name: /Concluir/ })).toBeInTheDocument()
  })

  it('goes back to the session, which is now on the way in', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await openTheExercise(user, 'Esteira')

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    // CHANGED: it used to jump to /cardio, because Iniciar skipped the session
    // screen and back had nowhere else to go. Now it retraces the way in.
    expect(await screen.findByRole('heading', { name: 'Treino em andamento' })).toBeInTheDocument()
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
    // The session screen, the same place Iniciar leads to.
    expect(await screen.findByRole('heading', { name: 'Treino em andamento' })).toBeInTheDocument()
    expect(await db.sessions.get(sid)).toBeDefined()
  })

  it("Home's Iniciar only says a cardio is running — it does not open it", async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))

    cleanup()
    renderAt('/')

    const head = await screen.findByText(/^Dia 1/)
    await user.click(head)
    const start = await screen.findByRole('button', { name: 'Iniciar' })
    await user.click(start)

    // It names the KIND that is running, which is what says where to find it —
    // the Cardio tab, where that exercise's own row offers Continuar.
    expect(await screen.findByText('Você já tem um cardio em andamento.')).toBeInTheDocument()
    // And that is all: still on Home, no second session, not inside the run.
    expect(screen.getByText('Dia 1')).toBeInTheDocument()
    expect(screen.queryByText(/Treino em andamento/)).toBeNull()
    expect(await db.sessions.count()).toBe(1)
  })

  it('another row only says a cardio is running — it does not open it either', async () => {
    await seed()
    const user = userEvent.setup()
    renderAt('/cardio')
    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(1))

    cleanup()
    renderAt('/cardio')

    await user.click(await screen.findByRole('button', { name: 'Iniciar Bicicleta' }))

    expect(await screen.findByText('Você já tem um cardio em andamento.')).toBeInTheDocument()
    // Still on the list, and no second session was opened.
    expect(screen.getByRole('button', { name: 'Continuar Esteira' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Observações/ })).toBeNull()
    expect(await db.sessions.count()).toBe(1)
  })

  it('a cardio row says a STRENGTH workout is running, naming that kind', async () => {
    const { gym, day } = await seed()
    await startSession(gym, day, db)
    const user = userEvent.setup()
    renderAt('/cardio')

    await user.click(await screen.findByRole('button', { name: 'Iniciar Esteira' }))

    expect(await screen.findByText('Você já tem um treino em andamento.')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Observações/ })).toBeNull()
    expect(await db.sessions.count()).toBe(1)
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
    await completeTheCardio(user)
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
