import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym, saveNote } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

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
  const gym = await createGym('Academia A', db)
  const peitoral = await createCategory('Peitoral', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [peitoral] }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, supino }
}

describe('Exercise notes (Notas tab)', () => {
  it('adds a note during a session, persists it, and shows it on reopen', async () => {
    const { gym, supino } = await seed()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Start the workout and open the exercise entry detail.
    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))

    // Switch to the Notas tab, type a note, and save it.
    await user.click(await screen.findByRole('tab', { name: /^Notas/ }))
    const field = await screen.findByLabelText('Notas')
    await user.type(field, 'manter cotovelo fixo')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    // Persisted per (gym, exercise).
    await waitFor(async () =>
      expect((await db.exerciseNotes.where('[gymId+exerciseId]').equals([gym, supino]).first())?.text).toBe(
        'manter cotovelo fixo',
      ),
    )

    // Leave the detail and reopen it — the note is shown again (durable).
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
    await user.click(await screen.findByRole('tab', { name: /^Notas/ }))
    expect(await screen.findByLabelText('Notas')).toHaveValue('manter cotovelo fixo')
  })

  it('clears the note when saved blank', async () => {
    const { gym, supino } = await seed()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))
    await user.click(await screen.findByRole('tab', { name: /^Notas/ }))

    const field = await screen.findByLabelText('Notas')
    await user.type(field, 'temporária')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))
    await waitFor(async () => expect(await db.exerciseNotes.count()).toBe(1))

    // Clear the text and save → the record is removed.
    await user.clear(field)
    await user.click(screen.getByRole('button', { name: /Salvar/ }))
    await waitFor(async () =>
      expect(await db.exerciseNotes.where('[gymId+exerciseId]').equals([gym, supino]).count()).toBe(0),
    )
  })
})

/**
 * The tab says whether there is a note behind it, before the tap. It is a mark
 * and not a count on purpose: there is exactly one note per `(gym, exercise)`,
 * so a number would always read "(1)".
 */
describe('The Notas tab marks that a note exists', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
  const notesTab = () => screen.getByRole('tab', { name: /Notas/ })

  it('shows (*) only once there is a note, and drops it when it is emptied', async () => {
    const { gym, supino } = await seed()
    renderAt(`/exercise/${supino}`)

    // Nothing written yet — and nothing claimed before the read answers either.
    expect(await screen.findByRole('tab', { name: /Notas/ })).not.toHaveTextContent('(*)')

    await saveNote(gym, supino, 'banco no 4', db)
    await waitFor(() => expect(notesTab()).toHaveTextContent('(*)'))

    // Blank is not a note: the mark follows what the user would see in the tab.
    await saveNote(gym, supino, '   ', db)
    await waitFor(() => expect(notesTab()).not.toHaveTextContent('(*)'))
  })

  it('does not mark another exercise', async () => {
    const { gym, supino } = await seed()
    const rosca = await createExercise({ name: 'Rosca Direta' }, db)
    await saveNote(gym, supino, 'banco no 4', db)

    renderAt(`/exercise/${rosca}`)

    expect(await screen.findByRole('heading', { name: 'Rosca Direta' })).toBeInTheDocument()
    await waitFor(() => expect(notesTab()).not.toHaveTextContent('(*)'))
  })
})
