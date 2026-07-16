import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.sessions, db.sessionEntries].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seedSession() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const a = await createExercise({ name: 'Supino Reto' }, db)
  const b = await createExercise({ name: 'Crucifixo' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [a, b] }, db)
  const sessionId = await startSession(gym, day, db)
  const entries = await listSessionEntries(sessionId, db)
  return { sessionId, entries }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('The stepper is fixed chrome, not tab content', () => {
  it('stays visible on every tab', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    // Execução (default)
    expect(await screen.findByRole('button', { name: 'Concluir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo exercício' })).toBeInTheDocument()

    for (const tab of ['Observações', 'Foto']) {
      await user.click(screen.getByRole('tab', { name: tab }))
      expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Próximo exercício' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Exercício anterior' })).toBeInTheDocument()
    }
  })

  it('concludes from a non-Execução tab', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    // Mid-exercise, looking at the machine's photo — Concluir must still work.
    await user.click(await screen.findByRole('tab', { name: 'Foto' }))
    await user.click(screen.getByRole('button', { name: 'Concluir' }))

    // Marked done and advanced to the next exercise. ("Crucifixo" is both the app
    // bar's h1 and the page's h2, so pin the level.)
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()
    expect((await listSessionEntries(sessionId, db))[0].done).toBe(true)
  })

  it('renders the bar inside the fixed chrome, outside the scrolling content', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const bar = (await screen.findByRole('button', { name: 'Concluir' })).closest('.stepper-bar')
    expect(bar).not.toBeNull()
    // Must NOT live inside <main class="screen">, or it would scroll away.
    expect(bar!.closest('main.screen')).toBeNull()
    expect(document.querySelector('main.screen')).toHaveClass('has-stepper')
  })
})
