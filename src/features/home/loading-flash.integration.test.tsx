import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

/**
 * Regression tests for the empty-state flash.
 *
 * The bug: the read hooks handed out `[]` while the IndexedDB query was still in
 * flight, and `[]` is an answer — "there are no training days". Every mount of
 * Home therefore painted "Nenhum dia de treino ainda" on its first frame, and
 * React Router remounts Home on every return to it, so the message flashed on
 * every navigation.
 *
 * These tests assert on the FIRST FRAME on purpose: the assertions right after
 * `render()` / after the click run before any `await`, which is exactly the
 * frame the user was seeing. A `findBy*` would wait the flash away and never
 * catch a regression.
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
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

const EMPTY_HOME = /Nenhum dia de treino ainda/i

/** Gym "A" active, one training day with one exercise, no first-launch prompt. */
async function seedOneDay() {
  useOnboarding.getState().markPromptSeen()
  const gym = await createGym('A', db)
  const ex = await createExercise({ name: 'Supino' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  useActiveGym.setState({ activeGymId: gym })
  return { gym, day }
}

const renderApp = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('Home — o estado vazio não pisca antes dos dados', () => {
  it('não renderiza "Nenhum dia de treino ainda" em nenhum quadro quando há dias', async () => {
    await seedOneDay()

    renderApp('/')

    // First frame: the days are not known yet, and that is not the same as
    // there being none.
    expect(screen.queryByText(EMPTY_HOME)).not.toBeInTheDocument()

    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_HOME)).not.toBeInTheDocument()
  })

  it('ainda mostra o estado vazio quando realmente não há dias', async () => {
    useOnboarding.getState().markPromptSeen()

    renderApp('/')

    expect(await screen.findByText(EMPTY_HOME)).toBeInTheDocument()
  })

  it('ida e volta Home → Configurações → Home não pisca o estado vazio', async () => {
    await seedOneDay()
    const user = userEvent.setup()

    renderApp('/')
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Configurações/ }))
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Treinos/ }))
    // Home was unmounted and mounted again. The day is painted in the same frame
    // the screen appears — no empty state, and no blank wait either.
    expect(screen.getByText('Dia 1')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_HOME)).not.toBeInTheDocument()
  })

  it('o resumo da semana não pisca "0 / 7 treinos" antes da contagem real', async () => {
    const { gym, day } = await seedOneDay()
    const sid = await startSession(gym, day, db)
    const entries = await listSessionEntries(sid, db)
    await setEntryDone(entries[0].id!, true, db)
    await completeSession(sid, db)

    renderApp('/')

    // No summary at all while the history is unknown — a card reading
    // "0 / 7 treinos" would be answering a question nobody has asked yet.
    expect(screen.queryByLabelText('Resumo da semana')).not.toBeInTheDocument()

    expect(await screen.findByLabelText('Resumo da semana')).toHaveTextContent('1 / 7 treinos')
  })
})

describe('Seletor de academia e contadores — nada de zero antes da resposta', () => {
  it('não mostra a pílula "Sem academia" quando existe uma academia', async () => {
    await seedOneDay()

    renderApp('/')

    expect(screen.queryByText('Sem academia')).not.toBeInTheDocument()
    expect(await screen.findByText('A')).toBeInTheDocument()
  })

  it('Configurações não mostra contadores zerados antes de contar', async () => {
    await seedOneDay()

    const { container } = renderApp('/settings')

    // No counter at all on the first frame — a "0" beside "Academias" is a
    // count, and nothing has been counted yet.
    expect(container.querySelectorAll('.row-meta')).toHaveLength(0)

    await screen.findByRole('heading', { name: 'Configurações' })
    await waitFor(() =>
      expect([...container.querySelectorAll('.row-meta')].map((n) => n.textContent)).toEqual([
        '1', // Academias
        '0', // Categorias — contadas, e realmente zero
        '1', // Exercícios
        '1', // Dias de treino
        '0', // Aquecimentos — contados, e realmente zero
      ]),
    )
  })
})

describe('Consistência — o estado vazio não pisca antes do histórico', () => {
  it('não renderiza "Nenhum treino ainda" quando existe uma sessão', async () => {
    const { gym, day } = await seedOneDay()
    const sid = await startSession(gym, day, db)
    await completeSession(sid, db)

    renderApp('/sessions')

    expect(screen.queryByText(/Nenhum treino ainda/i)).not.toBeInTheDocument()

    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    expect(screen.queryByText(/Nenhum treino ainda/i)).not.toBeInTheDocument()
  })

  it('ainda mostra "Nenhum treino ainda" quando não há histórico', async () => {
    useOnboarding.getState().markPromptSeen()

    renderApp('/sessions')

    expect(await screen.findByText(/Nenhum treino ainda/i)).toBeInTheDocument()
  })
})
