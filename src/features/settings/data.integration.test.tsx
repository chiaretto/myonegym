import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym, saveWeight } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen() // not the focus here — see App.onboarding.test.tsx
})
afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.sessions, db.sessionEntries].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  const cat = await createCategory('Peito', db)
  const ex = await createExercise({ name: 'Supino', categoryId: cat }, db)
  await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  await saveWeight(gym, ex, 40, 'KG', db)
}

describe('Resetar app', () => {
  it('is confirm-gated: declining leaves data intact', async () => {
    await seed()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings/data']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByText('Resetar app'))
    expect(await screen.findByText('Resetar app?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByText('Resetar app?')).not.toBeInTheDocument())
    expect(await db.gyms.count()).toBe(1)
  })

  it('confirming erases all registered data and re-arms the first-launch prompt', async () => {
    await seed()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings/data']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByText('Resetar app'))
    await user.click(await screen.findByRole('button', { name: 'Apagar tudo' }))

    await waitFor(async () => {
      expect(await db.gyms.count()).toBe(0)
      expect(await db.categories.count()).toBe(0)
      expect(await db.exercises.count()).toBe(0)
      expect(await db.days.count()).toBe(0)
      expect(await db.weights.count()).toBe(0)
    })
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(false)

    // Settings counts reflect the empty app.
    cleanup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Academias')).toBeInTheDocument()
    expect(screen.queryByText('1', { selector: '.row-meta' })).not.toBeInTheDocument()

    // A fresh mount of Home now shows the first-launch prompt again.
    cleanup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Bem-vindo ao MyOneGym')).toBeInTheDocument()
  })
})
