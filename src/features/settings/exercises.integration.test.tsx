import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createDay, createExercise, updateDay } from '../../db/repos'
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

describe('Exercises list — training days per item', () => {
  it('shows the days an exercise is in (and "Nenhum dia"), live-updating', async () => {
    const rosca = await createExercise({ name: 'Rosca Direta' }, db)
    await createExercise({ name: 'Alongamento' }, db) // used in no day
    const dia1 = await createDay({ name: 'Dia 1', exerciseIds: [rosca] }, db)
    await createDay({ name: 'Dia 2', exerciseIds: [rosca] }, db)

    render(
      <MemoryRouter initialEntries={['/settings/exercises']}>
        <App />
      </MemoryRouter>,
    )

    // Rosca is in both days — one outlined chip per day.
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    expect(screen.getByText('Dia 2')).toBeInTheDocument()
    expect(screen.getByText('Nenhum dia')).toBeInTheDocument() // Alongamento

    // Remove Rosca from Dia 1 → its "Dia 1" chip disappears, "Dia 2" stays.
    await updateDay(dia1, { name: 'Dia 1', exerciseIds: [] }, db)
    await waitFor(() => expect(screen.queryByText('Dia 1')).not.toBeInTheDocument())
    expect(screen.getByText('Dia 2')).toBeInTheDocument()
  })
})
