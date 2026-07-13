import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { db } from './db/db'
import { createGym } from './db/repos'
import { useActiveGym } from './state/activeGym'
import { useOnboarding } from './state/onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().resetPromptSeen() // localStorage.clear() doesn't reset in-memory zustand state
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

describe('First-launch sample data prompt', () => {
  it('appears on a fresh, never-asked, empty device', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Bem-vindo ao MyOneGym')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Carregar exemplo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Começar do zero' })).toBeInTheDocument()
  })

  it('accepting generates the bundled sample and shows it on Home', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('button', { name: 'Carregar exemplo' }))

    await waitFor(() => expect(screen.queryByText('Bem-vindo ao MyOneGym')).not.toBeInTheDocument())
    expect(await screen.findByText(/^Dia 1/)).toBeInTheDocument()
    expect(await db.gyms.count()).toBe(1)
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(true)
  })

  it('declining leaves the app empty and does not reappear', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('button', { name: 'Começar do zero' }))

    await waitFor(() => expect(screen.queryByText('Bem-vindo ao MyOneGym')).not.toBeInTheDocument())
    expect(await screen.findByText(/Nenhum dia de treino ainda/i)).toBeInTheDocument()
    expect(await db.gyms.count()).toBe(0)
    expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(true)

    // A fresh mount on the same device does not show it again.
    cleanup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText('MyOneGym')
    expect(screen.queryByText('Bem-vindo ao MyOneGym')).not.toBeInTheDocument()
  })

  it('is not shown to a device that already has registered data (migration safety)', async () => {
    await createGym('Minha academia', undefined, db)

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText('MyOneGym')
    expect(screen.queryByText('Bem-vindo ao MyOneGym')).not.toBeInTheDocument()
    await waitFor(() => expect(useOnboarding.getState().hasSeenExamplePrompt).toBe(true))
  })

  it('is not shown when the device has already been asked', async () => {
    useOnboarding.getState().markPromptSeen()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText('MyOneGym')
    expect(screen.queryByText('Bem-vindo ao MyOneGym')).not.toBeInTheDocument()
  })
})
