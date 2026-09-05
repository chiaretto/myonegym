import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { officialExercises } from '../../data/officialCatalog'
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
  const biceps = await createCategory('Bicípite', db)
  const dorsais = await createCategory('Dorsais', db)
  const roscaDireta = await createExercise({ name: 'Rosca Direta', categoryIds: [biceps] }, db)
  const roscaScott = await createExercise({ name: 'Rosca Scott', categoryIds: [biceps] }, db)
  await createExercise({ name: 'Supino Reto', categoryIds: [dorsais] }, db)
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
  await waitFor(() => expect(screen.getAllByText('Bicípite').length).toBeGreaterThan(0)) // categories loaded
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

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bicípite')

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
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bicípite')
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

describe('Exercises list — filter by kind', () => {
  /**
   * The rows on screen, by name. Reads the title's first text node rather than
   * its `textContent`: the chips for "Cardio" and "Oficial" live inside the
   * same element, and would come back glued to the name.
   */
  const shownNames = () =>
    screen
      .getAllByText(/.+/, { selector: '.row-title' })
      .map((n) => n.firstChild?.textContent?.trim() ?? '')

  async function setupWithCardio() {
    const { user } = await setup()
    await createExercise({ name: 'Esteira Caseira', kind: 'cardio' }, db)
    await screen.findByText('Esteira Caseira')
    return { user }
  }

  const typeGroup = () => screen.getByRole('group', { name: 'Tipo' })

  it('opens on "Todos", with both kinds listed', async () => {
    await setupWithCardio()

    expect(within(typeGroup()).getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(shownNames()).toContain('Esteira Caseira')
    expect(shownNames()).toContain('Rosca Direta')
  })

  it('narrows to Cardio', async () => {
    const { user } = await setupWithCardio()

    await user.click(within(typeGroup()).getByRole('button', { name: 'Cardio' }))

    await waitFor(() => expect(shownNames()).not.toContain('Rosca Direta'))
    expect(shownNames()).toContain('Esteira Caseira')
    // The official cardios are in the same list, and they are cardio too.
    for (const e of officialExercises().filter((x) => x.kind === 'cardio')) {
      expect(shownNames()).toContain(e.name)
    }
  })

  it('narrows to Força', async () => {
    const { user } = await setupWithCardio()

    await user.click(within(typeGroup()).getByRole('button', { name: 'Força' }))

    await waitFor(() => expect(shownNames()).not.toContain('Esteira Caseira'))
    expect(shownNames()).toContain('Rosca Direta')
  })

  it('combines with the search, with AND', async () => {
    const { user } = await setupWithCardio()

    await user.click(within(typeGroup()).getByRole('button', { name: 'Cardio' }))
    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')

    // No cardio is called "rosca" — the distinct "no matches" state, not the
    // "no exercises at all" one.
    expect(await screen.findByText('Nenhum exercício encontrado')).toBeInTheDocument()
  })

  it('is cleared by "Limpar filtros"', async () => {
    const { user } = await setupWithCardio()

    await user.click(within(typeGroup()).getByRole('button', { name: 'Cardio' }))
    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')
    await user.click(await screen.findByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() =>
      expect(within(typeGroup()).getByRole('button', { name: 'Todos' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(shownNames()).toContain('Rosca Direta')
    expect(shownNames()).toContain('Esteira Caseira')
  })
})
