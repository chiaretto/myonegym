import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createExercise, deleteCategory } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) =>
      t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('Multiple categories per exercise', () => {
  it('creates an exercise with two categories via toggle chips; the list shows both', async () => {
    const peito = await createCategory('Peito', db)
    const triceps = await createCategory('Tríceps', db)
    const user = userEvent.setup()
    renderAt('/settings/exercises/new')

    await screen.findByRole('heading', { name: 'Novo exercício', level: 1 })
    await user.type(screen.getByLabelText('Nome'), 'Supino Reto')
    // Toggle both category chips on.
    await user.click(screen.getByRole('button', { name: /Peito/, pressed: false }))
    await user.click(screen.getByRole('button', { name: /Tríceps/, pressed: false }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () =>
      expect(await db.exercises.where('name').equals('Supino Reto').first()).toBeTruthy(),
    )
    const ex = await db.exercises.where('name').equals('Supino Reto').first()
    expect(ex?.categoryIds.sort()).toEqual([peito, triceps].sort())

    // The list row shows both category names.
    expect(await screen.findByText('Peito · Tríceps')).toBeInTheDocument()
  })

  it('an exercise with no chips selected is uncategorized ("Sem categoria")', async () => {
    await createCategory('Peito', db)
    const user = userEvent.setup()
    renderAt('/settings/exercises/new')

    await screen.findByRole('heading', { name: 'Novo exercício', level: 1 })
    await user.type(screen.getByLabelText('Nome'), 'Alongamento')
    await user.click(screen.getByRole('button', { name: 'Salvar' })) // no category selected

    // The exercise row (not the filter option) shows "Sem categoria".
    const row = (await screen.findByText('Alongamento')).closest('.row') as HTMLElement
    expect(within(row).getByText('Sem categoria')).toBeInTheDocument()
    const ex = await db.exercises.where('name').equals('Alongamento').first()
    expect(ex?.categoryIds).toEqual([])
  })

  it('editing shows the current categories as pressed chips and can drop one', async () => {
    const peito = await createCategory('Peito', db)
    const triceps = await createCategory('Tríceps', db)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peito, triceps] }, db)
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${ex}/edit`)

    await screen.findByRole('heading', { name: 'Editar exercício', level: 1 })
    // Both chips start pressed (categories load a tick after mount); turn Tríceps off.
    expect(await screen.findByRole('button', { name: /Peito/, pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tríceps/, pressed: true }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect((await db.exercises.get(ex))?.categoryIds).toEqual([peito]))
  })

  it('deleting a category removes it from the exercise (keeps the others)', async () => {
    const peito = await createCategory('Peito', db)
    const triceps = await createCategory('Tríceps', db)
    const ex = await createExercise({ name: 'Supino', categoryIds: [peito, triceps] }, db)

    await deleteCategory(peito, db)

    expect((await db.exercises.get(ex))?.categoryIds).toEqual([triceps])
  })
})
