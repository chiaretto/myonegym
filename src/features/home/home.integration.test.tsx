import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { generateExample } from '../../data/portability'
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
    await generateExample(db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    // day headers appear from live data
    const day1 = await screen.findByText('Dia 1')
    // badge only after expanding
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
    await user.click(day1)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    // Minha Academia seeded Supino at 40 KG
    await waitFor(() => expect(screen.getByText('40 KG')).toBeInTheDocument())
  })
})
