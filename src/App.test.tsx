import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { db } from './db/db'

afterEach(async () => {
  cleanup()
  // reset the shared dev DB between renders
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) => t.clear()),
  )
})

describe('App smoke', () => {
  it('mounts and shows the home empty state with no data', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('MyOneGym')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/Nenhum dia de treino ainda/i)).toBeInTheDocument(),
    )
  })

  it('renders the settings screen', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    expect(screen.getByText('Academias')).toBeInTheDocument()
    expect(screen.getByText('Exercícios')).toBeInTheDocument()
  })
})
