import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise } from '../../db/repos'
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

async function setup() {
  const biceps = await createCategory('Bíceps', db)
  const costas = await createCategory('Costas', db)
  const roscaDireta = await createExercise({ name: 'Rosca Direta', categoryId: biceps }, db)
  const roscaScott = await createExercise({ name: 'Rosca Scott', categoryId: biceps }, db)
  await createExercise({ name: 'Supino Reto', categoryId: costas }, db)
  await createExercise({ name: 'Alongamento' }, db) // no category, no day
  await createDay({ name: 'Dia 1', exerciseIds: [] }, db)
  await createDay({ name: 'Dia 2', exerciseIds: [roscaDireta] }, db)

  render(
    <MemoryRouter initialEntries={['/settings/exercises']}>
      <App />
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  await screen.findByText('Rosca Direta') // exercises loaded
  await waitFor(() => expect(screen.getAllByText('Bíceps').length).toBeGreaterThan(0)) // categories loaded
  return { user, roscaDireta, roscaScott }
}

describe('Exercises list — filters', () => {
  it('narrows the list as the user types a search term', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')

    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()
    expect(screen.getByText('Rosca Scott')).toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
    expect(screen.queryByText('Alongamento')).not.toBeInTheDocument()
  })

  it('narrows the list by category', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bíceps')

    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()
    expect(screen.getByText('Rosca Scott')).toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('narrows the list by "Sem categoria"', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Sem categoria')

    expect(screen.getByText('Alongamento')).toBeInTheDocument()
    expect(screen.queryByText('Rosca Direta')).not.toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('narrows the list by training day', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Dia de treino'), 'Dia 2')

    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()
    expect(screen.queryByText('Rosca Scott')).not.toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('narrows the list by "Nenhum dia"', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Dia de treino'), 'Nenhum dia')

    expect(screen.getByText('Rosca Scott')).toBeInTheDocument()
    expect(screen.getByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText('Alongamento')).toBeInTheDocument()
    expect(screen.queryByText('Rosca Direta')).not.toBeInTheDocument()
  })

  it('combines search, category, and day filters', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bíceps')
    await user.selectOptions(screen.getByLabelText('Dia de treino'), 'Dia 2')

    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()
    expect(screen.queryByText('Rosca Scott')).not.toBeInTheDocument()
  })

  it('shows a distinct "no matches" state and clears filters', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'inexistente')

    expect(await screen.findByText('Nenhum exercício encontrado')).toBeInTheDocument()
    expect(screen.queryByText('Rosca Direta')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(screen.getByText('Rosca Direta')).toBeInTheDocument())
    expect(screen.getByText('Rosca Scott')).toBeInTheDocument()
    expect(screen.getByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText('Alongamento')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum exercício encontrado')).not.toBeInTheDocument()
  })
})
