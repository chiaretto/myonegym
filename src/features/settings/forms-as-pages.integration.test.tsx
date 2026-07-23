import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createExercise, createGym } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
})
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
      db.exercisePhotos,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

function Spy() {
  const loc = useLocation()
  return <div data-testid="url">{loc.pathname}</div>
}
const url = () => screen.getByTestId('url').textContent

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Spy />
    </MemoryRouter>,
  )
}

const heading = (name: string | RegExp) => screen.findByRole('heading', { name, level: 1 })

describe('Create/edit forms are pages', () => {
  it('creates a category through its page and returns to the list', async () => {
    const user = userEvent.setup()
    renderAt('/settings/categories')

    await user.click(await screen.findByRole('button', { name: 'Nova categoria' }))
    expect(url()).toBe('/settings/categories/new')
    await heading('Nova categoria')

    await user.type(screen.getByLabelText('Nome'), 'Peito')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    // Back on the list, with the new category present.
    await waitFor(() => expect(url()).toBe('/settings/categories'))
    expect(await screen.findByText('Peito')).toBeInTheDocument()
    expect(await db.categories.where('name').equals('Peito').count()).toBe(1)
  })

  it('edits an exercise through its page', async () => {
    const cat = await createCategory('Peito', db)
    const ex = await createExercise({ name: 'Supino', categoryId: cat }, db)
    const user = userEvent.setup()
    renderAt('/settings/exercises')

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    expect(url()).toBe(`/settings/exercises/${ex}/edit`)
    await heading('Editar exercício')

    const nameInput = screen.getByLabelText('Nome') as HTMLInputElement
    expect(nameInput.value).toBe('Supino')
    await user.clear(nameInput)
    await user.type(nameInput, 'Supino Reto')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(url()).toBe('/settings/exercises'))
    expect((await db.exercises.get(ex))?.name).toBe('Supino Reto')
  })

  it('the first gym created becomes active (side-effect preserved)', async () => {
    const user = userEvent.setup()
    renderAt('/settings/gyms/new')

    await heading('Nova academia')
    await user.type(screen.getByLabelText('Nome'), 'Academia A')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(url()).toBe('/settings/gyms'))
    const gym = (await db.gyms.toArray())[0]
    expect(useActiveGym.getState().activeGymId).toBe(gym.id)
  })

  it('Cancelar returns to the list without saving', async () => {
    const user = userEvent.setup()
    renderAt('/settings/categories/new')

    await heading('Nova categoria')
    await user.type(screen.getByLabelText('Nome'), 'Descartada')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(url()).toBe('/settings/categories'))
    expect(await db.categories.count()).toBe(0)
  })

  it('is deep-linkable: reloading an edit URL shows the form with data', async () => {
    const g = await createGym('Academia A', undefined, db)
    renderAt(`/settings/gyms/${g}/edit`)

    await heading('Editar academia')
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Academia A')
  })

  it('shows a not-found state for a deleted entity', async () => {
    renderAt('/settings/gyms/9999/edit')

    expect(await screen.findByText('Academia não encontrada.')).toBeInTheDocument()
    // No form fields rendered.
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  it('the day form is a page with the exercise picker; preview stays a modal', async () => {
    const cat = await createCategory('Peito', db)
    await createExercise({ name: 'Supino', categoryId: cat }, db)
    const user = userEvent.setup()
    renderAt('/settings/days/new')

    await heading('Novo dia')
    await user.type(screen.getByLabelText('Nome'), 'Dia 1')
    // Add the exercise from the "available" list.
    await user.click(screen.getByRole('button', { name: 'Adicionar Supino' }))
    // Its read-only preview is still a modal dialog.
    await user.click(screen.getByRole('button', { name: 'Detalhes de Supino' }))
    expect(await screen.findByRole('dialog', { name: 'Supino' })).toBeInTheDocument()
  })
})
