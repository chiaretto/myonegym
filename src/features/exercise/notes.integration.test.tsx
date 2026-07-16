import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym } from '../../db/repos'
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
  const gym = await createGym('Academia A', undefined, db)
  const peito = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryId: peito }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, supino }
}

describe('Exercise notes (Observações tab)', () => {
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

    // Switch to the Observações tab, type a note, and save it.
    await user.click(await screen.findByRole('tab', { name: 'Observações' }))
    const field = await screen.findByLabelText('Observações')
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
    await user.click(await screen.findByRole('tab', { name: 'Observações' }))
    expect(await screen.findByLabelText('Observações')).toHaveValue('manter cotovelo fixo')
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
    await user.click(await screen.findByRole('tab', { name: 'Observações' }))

    const field = await screen.findByLabelText('Observações')
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
