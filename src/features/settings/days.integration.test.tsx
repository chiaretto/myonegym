import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, listDays, updateDay } from '../../db/repos'
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

describe('Home day header — derived categories', () => {
  it('shows the distinct categories of the day exercises and updates on change', async () => {
    const peitoral = await createCategory('Peitoral', db)
    const triceps = await createCategory('Tricípite', db)
    const supino = await createExercise({ name: 'Supino', categoryIds: [peitoral] }, db)
    const crucifixo = await createExercise({ name: 'Crucifixo', categoryIds: [peitoral] }, db)
    const corda = await createExercise({ name: 'Tricípite Corda', categoryIds: [triceps] }, db)
    const dayId = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, corda] }, db)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Distinct categories, in first-appearance order (Peitoral once, then Tricípite).
    expect(await screen.findByText('Peitoral · Tricípite')).toBeInTheDocument()

    // Remove the Tricípite exercise → the derived label updates live.
    await updateDay(dayId, { name: 'Dia 1', exerciseIds: [supino, crucifixo] }, db)
    await waitFor(() => expect(screen.getByText('Peitoral')).toBeInTheDocument())
    expect(screen.queryByText('Peitoral · Tricípite')).not.toBeInTheDocument()
  })
})

describe('Reorder training days', () => {
  it('moves a day down in Settings and the order persists (and shows on Home)', async () => {
    await createDay({ name: 'Dia 1' }, db)
    await createDay({ name: 'Dia 2' }, db)
    await createDay({ name: 'Dia 3' }, db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/settings/days']}>
        <App />
      </MemoryRouter>,
    )

    // Move "Dia 1" down → order becomes Dia 2, Dia 1, Dia 3.
    await user.click(await screen.findByRole('button', { name: 'Descer Dia 1' }))
    await waitFor(async () =>
      expect((await listDays(db)).map((x) => x.name)).toEqual(['Dia 2', 'Dia 1', 'Dia 3']),
    )

    // The Home accordion reflects the new order (fresh mount reading the DB).
    cleanup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    // waitFor, not a bare findAllByText: a fresh mount paints the previous
    // answer to `useDays()` before IndexedDB replies (see src/lib/hooks.ts), so
    // the very first frame here can still carry the pre-reorder order — this
    // test reorders and remounts within milliseconds. The live query corrects it
    // a tick later, and that settled order is what this asserts.
    await waitFor(async () => {
      const titles = await screen.findAllByText(/^Dia [123]$/)
      expect(titles.map((t) => t.textContent)).toEqual(['Dia 2', 'Dia 1', 'Dia 3'])
    })
  })
})
