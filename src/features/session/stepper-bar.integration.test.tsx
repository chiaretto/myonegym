import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
  const gym = await createGym('Academia A', db)
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

    for (const tab of ['Notas', 'Foto']) {
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
    await user.click(await screen.findByRole('tab', { name: /^Foto/ }))
    await user.click(screen.getByRole('button', { name: 'Concluir' }))

    // Marked done and advanced to the next exercise. (The name lives only in the
    // app bar's h1 — the detail body no longer repeats it.)
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    expect((await listSessionEntries(sessionId, db))[0].done).toBe(true)
  })

  it('lays the three controls out on one line, with the arrows reduced to chevrons', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const action = await screen.findByRole('button', { name: 'Concluir' })
    const row = action.closest('.entry-nav-row')
    expect(row).not.toBeNull()
    // One row, holding all three: prev, action, next. Two rows would mean the
    // bar went back to stacking.
    expect(document.querySelectorAll('.entry-nav-row')).toHaveLength(1)
    expect(Array.from(row!.children)).toEqual([
      screen.getByRole('button', { name: 'Exercício anterior' }),
      action,
      screen.getByRole('button', { name: 'Próximo exercício' }),
    ])

    // The arrows lost their labels — that is what made one line fit. They keep
    // their names, which is what the assertions above found them by.
    expect(screen.getByRole('button', { name: 'Exercício anterior' })).toHaveTextContent('')
    expect(screen.getByRole('button', { name: 'Próximo exercício' })).toHaveTextContent('')
    expect(screen.queryByText('Voltar')).toBeNull()
    expect(screen.queryByText('Avançar')).toBeNull()
  })

  it('renders the bar inside the fixed chrome, outside the scrolling content', async () => {
    const { sessionId, entries } = await seedSession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const bar = (await screen.findByRole('button', { name: 'Concluir' })).closest('.action-bar')
    expect(bar).not.toBeNull()
    // Must NOT live inside <main class="screen">, or it would scroll away.
    expect(bar!.closest('main.screen')).toBeNull()
    expect(document.querySelector('main.screen')).toHaveClass('has-action-bar')
  })
})

describe('Concluir is a toggle: marking advances, un-marking stays', () => {
  it('marks and advances, then un-marks in place when the user steps back', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    // Marking is "next": the workout's one-tap rhythm is unchanged.
    await user.click(await screen.findByRole('button', { name: 'Concluir' }))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    expect((await listSessionEntries(sessionId, db))[0].done).toBe(true)

    // The accidental tap is rescued by stepping back and tapping again — which
    // is the whole point of the control being a toggle.
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    const done = await screen.findByRole('button', { name: 'Concluído' })
    expect(done).toHaveAttribute('aria-pressed', 'true')

    await user.click(done)
    expect((await listSessionEntries(sessionId, db))[0].done).toBe(false)
    // Un-marking is an undo, and an undo that changes screen is not an undo:
    // the user is still looking at the exercise they just freed.
    expect(screen.getByRole('heading', { name: 'Supino Reto', level: 1 })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Concluir' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('still offers to finish the workout when the last pending entry is marked', async () => {
    const { sessionId, entries } = await seedSession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await user.click(await screen.findByRole('button', { name: 'Concluir' }))
    // Now on the second and last one; marking it completes the day.
    await user.click(await screen.findByRole('button', { name: 'Concluir' }))

    expect(await screen.findByText('Todos os exercícios concluídos!')).toBeInTheDocument()
  })

  it('does not toggle on a completed session', async () => {
    const { sessionId, entries } = await seedSession()
    await setEntryDone(entries[0].id!, true, db)
    await completeSession(sessionId, db)
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    // Static state in the middle of the bar, not a control. ("Concluído" also
    // appears as the status chip above the tabs, hence the scoped query.)
    const state = await screen.findByText('Concluído', { selector: '.entry-done-state' })
    expect(state.closest('.entry-nav-row')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Concluído' })).toBeNull()
  })
})
