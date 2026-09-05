import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, listDays } from '../../db/repos'
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

/**
 * "Dia 1" already contains "Supino Reto"; everything else is a candidate to add:
 * "Rosca Direta" (Bicípite), "Rosca Scott" (Bicípite), "Remada" (Dorsais + Bicípite),
 * "Elevação Lateral" (Deltoides) and "Alongamento" (no category).
 */
async function setup() {
  const biceps = await createCategory('Bicípite', db)
  const dorsais = await createCategory('Dorsais', db)
  const deltoides = await createCategory('Deltoides', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [dorsais] }, db)
  await createExercise({ name: 'Rosca Direta', categoryIds: [biceps] }, db)
  await createExercise({ name: 'Rosca Scott', categoryIds: [biceps] }, db)
  await createExercise({ name: 'Remada', categoryIds: [dorsais, biceps] }, db)
  await createExercise({ name: 'Elevação Lateral', categoryIds: [deltoides] }, db)
  await createExercise({ name: 'Alongamento' }, db)
  const dayId = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)

  render(
    <MemoryRouter initialEntries={[`/settings/days/${dayId}/edit`]}>
      <App />
    </MemoryRouter>,
  )
  const user = userEvent.setup()
  await screen.findByLabelText('Adicionar Rosca Direta') // candidates loaded
  await waitFor(() => expect(screen.getByLabelText('Categoria')).toBeInTheDocument()) // categories loaded
  return { user, dayId }
}

/**
 * The picker offers **both** sources, so a name search reaches the official
 * catalog too. These tests are about the filter, not about the catalog's size:
 * they assert the property the requirement states — every candidate matches the
 * term — plus what the test itself seeded.
 */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Names offered under "Adicionar exercício" (the day's own list is separate). */
function candidateNames() {
  return screen
    .getAllByRole('button', { name: /^Adicionar / })
    .map((b) => b.getAttribute('aria-label')!.replace('Adicionar ', ''))
}

describe('Day form — exercise picker filters', () => {
  it('narrows the candidates as the user types a search term', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')

    const shown = candidateNames()
    expect(shown.every((n) => normalize(n).includes('rosca'))).toBe(true)
    expect(shown).toEqual(expect.arrayContaining(['Rosca Direta', 'Rosca Scott']))
    expect(shown).not.toContain('Alongamento')
    expect(shown).not.toContain('Remada')
  })

  it('searches accent-insensitively', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'elevacao')

    const shown = candidateNames()
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every((n) => normalize(n).includes('elevacao'))).toBe(true)
    expect(shown).toContain('Elevação Lateral')
  })

  it('narrows the candidates by category, including compound exercises', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bicípite')

    // "Remada" is Dorsais + Bicípite — a specific category matches any exercise that includes it.
    // (The catalog is listed by name, so candidates stay in alphabetical order.)
    expect(candidateNames()).toEqual(['Remada', 'Rosca Direta', 'Rosca Scott'])
  })

  it('narrows the candidates by "Sem categoria"', async () => {
    const { user } = await setup()

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Sem categoria')

    expect(candidateNames()).toEqual(['Alongamento'])
  })

  it('combines search and category with AND', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bicípite')

    expect(candidateNames()).toEqual(['Rosca Direta', 'Rosca Scott'])
  })

  it("never filters the day's own exercise list", async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')

    // "Supino Reto" is in the day and matches no filter — it stays visible.
    expect(screen.getByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText('Exercícios do dia (1)')).toBeInTheDocument()
  })

  it('adds a filtered exercise and keeps the filters applied', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'rosca')
    await user.click(screen.getByLabelText('Adicionar Rosca Direta'))

    // Moved to the day's list — and out of the candidates.
    await waitFor(() => expect(screen.getByText('Exercícios do dia (2)')).toBeInTheDocument())
    expect(screen.queryByLabelText('Adicionar Rosca Direta')).not.toBeInTheDocument()
    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()

    // The filters survive the addition.
    expect(screen.getByLabelText('Buscar por nome')).toHaveValue('rosca')
    const shown = candidateNames()
    expect(shown.every((n) => normalize(n).includes('rosca'))).toBe(true)
    expect(shown).toContain('Rosca Scott')
  })

  it('shows a distinct "no matches" state and clears the filters', async () => {
    const { user } = await setup()

    await user.type(screen.getByLabelText('Buscar por nome'), 'inexistente')

    expect(await screen.findByText('Nenhum exercício encontrado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Adicionar / })).not.toBeInTheDocument()
    // The day's own list is untouched by the empty candidate list.
    expect(screen.getByText('Supino Reto')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() =>
      expect(candidateNames()).toEqual(
        expect.arrayContaining([
          'Alongamento',
          'Elevação Lateral',
          'Remada',
          'Rosca Direta',
          'Rosca Scott',
        ]),
      ),
    )
    // Clearing brings the whole picker back, official catalog included.
    expect(candidateNames().length).toBeGreaterThan(5)
    expect(screen.queryByText('Nenhum exercício encontrado')).not.toBeInTheDocument()
  })

  it('saves exactly the day list, in order, regardless of the active filters', async () => {
    const { user, dayId } = await setup()

    await user.selectOptions(screen.getByLabelText('Categoria'), 'Bicípite')
    await user.click(screen.getByLabelText('Adicionar Rosca Scott'))
    await user.type(screen.getByLabelText('Buscar por nome'), 'remada')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const byId = new Map((await db.exercises.toArray()).map((e) => [e.id!, e.name]))
    await waitFor(async () => {
      const day = (await listDays(db)).find((d) => d.id === dayId)!
      expect(day.exerciseIds.map((id) => byId.get(id))).toEqual(['Supino Reto', 'Rosca Scott'])
    })
  })
})
