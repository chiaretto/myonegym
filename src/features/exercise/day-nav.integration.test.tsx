import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory].map((t) =>
      t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

function Spy() {
  const loc = useLocation()
  return <div data-testid="url">{loc.pathname + loc.search}</div>
}
const url = () => screen.getByTestId('url').textContent

/** Dia 1 = [Supino, Crucifixo, Rosca]; Dia 4 = [Rosca, Agachamento].
 *  "Rosca" deliberately belongs to BOTH days. */
async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const cat = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryId: cat }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryId: cat }, db)
  const rosca = await createExercise({ name: 'Rosca Direta', categoryId: cat }, db)
  const agacha = await createExercise({ name: 'Agachamento', categoryId: cat }, db)
  const d1 = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, rosca] }, db)
  const d4 = await createDay({ name: 'Dia 4', exerciseIds: [rosca, agacha] }, db)
  return { d1, d4, supino, crucifixo, rosca, agacha }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Spy />
    </MemoryRouter>,
  )

describe('Exercise detail opened from a day', () => {
  it('steps forward and back through that day, keeping the day', async () => {
    const { d1, crucifixo } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${crucifixo}?day=${d1}`)

    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próximo exercício' }))
    expect(await screen.findByRole('heading', { name: 'Rosca Direta', level: 2 })).toBeInTheDocument()
    expect(url()).toContain(`day=${d1}`) // context preserved across the step

    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    await user.click(screen.getByRole('button', { name: 'Exercício anterior' }))
    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 2 })).toBeInTheDocument()
  })

  it('disables the ends of the day', async () => {
    const { d1, supino, rosca } = await seed()
    renderAt(`/exercise/${supino}?day=${d1}`) // first
    expect(await screen.findByRole('button', { name: 'Exercício anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próximo exercício' })).toBeEnabled()

    cleanup()
    renderAt(`/exercise/${rosca}?day=${d1}`) // last
    expect(await screen.findByRole('button', { name: 'Próximo exercício' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exercício anterior' })).toBeEnabled()
  })

  it('follows the day it was opened from when the exercise is in two days', async () => {
    const { d1, d4, rosca } = await seed()
    const user = userEvent.setup()

    // "Rosca" is last in Dia 1 → Avançar disabled...
    renderAt(`/exercise/${rosca}?day=${d1}`)
    expect(await screen.findByRole('button', { name: 'Próximo exercício' })).toBeDisabled()

    // ...but first in Dia 4 → Avançar leads to Agachamento, not to Dia 1's list.
    cleanup()
    renderAt(`/exercise/${rosca}?day=${d4}`)
    await user.click(await screen.findByRole('button', { name: 'Próximo exercício' }))
    expect(await screen.findByRole('heading', { name: 'Agachamento', level: 2 })).toBeInTheDocument()
  })

  it('sends Back to Home with that day still expanded', async () => {
    const { d1, crucifixo } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${crucifixo}?day=${d1}`)

    await user.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(url()).toBe(`/?day=${d1}`)
    // ...and Home really shows the day open, not just the address.
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
  })
})

describe('The reported bug: Back from an exercise collapsed the day', () => {
  it('keeps the day expanded through the whole Home → exercise → Back trip', async () => {
    const { d1 } = await seed()
    const user = userEvent.setup()
    renderAt('/')

    // Expand "Dia 1" the way a user does, then open one of its exercises.
    await user.click(await screen.findByText('Dia 1'))
    await user.click(await screen.findByText('Crucifixo'))
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()

    // Back must land on Home with "Dia 1" STILL open — previously it reset to a
    // collapsed Home, because the open day lived in component state.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(url()).toBe(`/?day=${d1}`)
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText('Rosca Direta')).toBeInTheDocument()
  })
})

describe('Exercise detail opened without a day', () => {
  it('shows no stepper and sends Back to Home', async () => {
    const { crucifixo } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${crucifixo}`)

    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próximo exercício' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exercício anterior' })).not.toBeInTheDocument()
    expect(document.querySelector('main.screen')).not.toHaveClass('has-stepper')

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(url()).toBe('/')
  })

  it('treats a day that no longer exists as no day', async () => {
    const { crucifixo } = await seed()
    renderAt(`/exercise/${crucifixo}?day=9999`)

    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próximo exercício' })).not.toBeInTheDocument()
  })
})
