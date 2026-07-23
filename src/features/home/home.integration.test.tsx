import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym, saveWeight } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

describe('Home end-to-end', () => {
  it('shows seeded days and the per-gym weight badge after expanding', async () => {
    // Seed a controlled fixture (independent of the sample-data content).
    const gym = await createGym('Academia A', undefined, db)
    const cat = await createCategory('Peito', db)
    const supino = await createExercise({ name: 'Supino Reto', categoryIds: [cat] }, db)
    await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
    await saveWeight(gym, supino, 40, 'KG', db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // day headers appear from live data
    const day1 = await screen.findByText('Dia 1')
    // exercises + badge only after expanding
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
    await user.click(day1)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('40 KG')).toBeInTheDocument())
  })
})
