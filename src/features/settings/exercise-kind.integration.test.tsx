import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createDay, createExercise, createGym } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) =>
      t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Exercise kind in the form', () => {
  it('offers Força and Cardio, with Força selected on a new exercise', async () => {
    const user = userEvent.setup()
    renderAt('/settings/exercises/new')

    const group = await screen.findByRole('group', { name: 'Tipo' })
    expect(within(group).getByRole('button', { name: 'Força' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(group).getByRole('button', { name: 'Cardio' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await user.type(screen.getByLabelText('Nome'), 'Esteira')
    await user.click(within(group).getByRole('button', { name: 'Cardio' }))
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () => expect(await db.exercises.count()).toBe(1))
    expect((await db.exercises.toArray())[0].kind).toBe('cardio')
  })

  it('saves a strength exercise when the field is left alone', async () => {
    const user = userEvent.setup()
    renderAt('/settings/exercises/new')

    await user.type(await screen.findByLabelText('Nome'), 'Supino')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () => expect(await db.exercises.count()).toBe(1))
    expect((await db.exercises.toArray())[0].kind).toBe('strength')
  })
})

describe('Turning an exercise into cardio', () => {
  async function seedInDays() {
    await createGym('Academia A', db)
    const esteira = await createExercise({ name: 'Esteira' }, db)
    const d2 = await createDay({ name: 'Dia 2', exerciseIds: [esteira] }, db)
    const d4 = await createDay({ name: 'Dia 4', exerciseIds: [esteira] }, db)
    return { esteira, d2, d4 }
  }

  it('names the days it will leave, and leaves them on confirm', async () => {
    const { esteira, d2, d4 } = await seedInDays()
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${esteira}/edit`)

    const group = await screen.findByRole('group', { name: 'Tipo' })
    await user.click(within(group).getByRole('button', { name: 'Cardio' }))
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    // The confirmation says WHICH days — not a vague warning after the fact.
    expect(await screen.findByText(/Dia 2 e Dia 4/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tornar cardio' }))

    await waitFor(async () => {
      expect((await db.exercises.get(esteira))?.kind).toBe('cardio')
    })
    expect((await db.days.get(d2))?.exerciseIds).toEqual([])
    expect((await db.days.get(d4))?.exerciseIds).toEqual([])
  })

  it('changes nothing when the confirmation is declined', async () => {
    const { esteira, d2 } = await seedInDays()
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${esteira}/edit`)

    const group = await screen.findByRole('group', { name: 'Tipo' })
    await user.click(within(group).getByRole('button', { name: 'Cardio' }))
    await user.click(screen.getByRole('button', { name: /Salvar/ }))
    await screen.findByText(/Dia 2/)
    // The form has its own Cancelar in the action bar — this one is the sheet's.
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: /Cancelar/ }))

    expect((await db.exercises.get(esteira))?.kind).toBe('strength')
    expect((await db.days.get(d2))?.exerciseIds).toEqual([esteira])
  })
})

describe('The day form offers strength only', () => {
  it('does not list a cardio exercise among the candidates', async () => {
    await createGym('Academia A', db)
    await createExercise({ name: 'Supino' }, db)
    await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const user = userEvent.setup()
    renderAt('/settings/days/new')

    await screen.findByLabelText('Nome')
    expect(await screen.findByText('Supino')).toBeInTheDocument()
    expect(screen.queryByText('Esteira')).not.toBeInTheDocument()

    // Not even by searching for it by name.
    await user.type(screen.getByPlaceholderText(/Buscar/i), 'Esteira')
    await waitFor(() => expect(screen.queryByText('Supino')).not.toBeInTheDocument())
    expect(screen.queryByText('Esteira')).not.toBeInTheDocument()
  })
})
