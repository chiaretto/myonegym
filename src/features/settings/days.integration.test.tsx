import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, updateDay } from '../../db/repos'
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
    const peito = await createCategory('Peito', db)
    const triceps = await createCategory('Tríceps', db)
    const supino = await createExercise({ name: 'Supino', categoryId: peito }, db)
    const crucifixo = await createExercise({ name: 'Crucifixo', categoryId: peito }, db)
    const corda = await createExercise({ name: 'Tríceps Corda', categoryId: triceps }, db)
    const dayId = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, corda] }, db)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // Distinct categories, in first-appearance order (Peito once, then Tríceps).
    expect(await screen.findByText('Peito · Tríceps')).toBeInTheDocument()

    // Remove the Tríceps exercise → the derived label updates live.
    await updateDay(dayId, { name: 'Dia 1', exerciseIds: [supino, crucifixo] }, db)
    await waitFor(() => expect(screen.getByText('Peito')).toBeInTheDocument())
    expect(screen.queryByText('Peito · Tríceps')).not.toBeInTheDocument()
  })
})
