import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createCategory, createDay, createExercise, createGym, saveWeight } from '../../db/repos'
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

/** Surfaces the current URL so tests can assert on it. */
function Spy() {
  const loc = useLocation()
  return <div data-testid="url">{loc.pathname + loc.search}</div>
}
const url = () => screen.getByTestId('url').textContent

/** Drives the router's Back, so a test can prove `replace` vs push. */
function Back() {
  const nav = useNavigate()
  return (
    <button data-testid="back" onClick={() => nav(-1)}>
      back
    </button>
  )
}

async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const cat = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryId: cat }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryId: cat }, db)
  const rosca = await createExercise({ name: 'Rosca Direta', categoryId: cat }, db)
  const d1 = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo, rosca] }, db)
  const d2 = await createDay({ name: 'Dia 2', exerciseIds: [rosca, supino] }, db)
  await saveWeight(gym, supino, 40, 'KG', db)
  return { d1, d2, supino, crucifixo, rosca }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Spy />
    </MemoryRouter>,
  )
}

describe('The expanded day lives in the URL', () => {
  it('expands the addressed day on load', async () => {
    const { d1 } = await seed()
    renderAt(`/?day=${d1}`)

    // Expanded without any interaction — the address alone did it.
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
  })

  it('writes the day to the URL when expanding, and clears it when collapsing', async () => {
    const { d1 } = await seed()
    const user = userEvent.setup()
    renderAt('/')

    expect(url()).toBe('/')
    await user.click(await screen.findByText('Dia 1'))
    expect(url()).toBe(`/?day=${d1}`)
    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()

    await user.click(screen.getByText('Dia 1'))
    expect(url()).toBe('/')
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('switches the param when another day is expanded', async () => {
    const { d1, d2 } = await seed()
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByText('Dia 1'))
    expect(url()).toBe(`/?day=${d1}`)
    await user.click(screen.getByText('Dia 2'))
    expect(url()).toBe(`/?day=${d2}`)
  })

  it('expands nothing for a day that no longer exists', async () => {
    await seed()
    renderAt('/?day=9999')

    expect(await screen.findByText('Dia 1')).toBeInTheDocument() // renders fine
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument() // nothing expanded
  })

  it('ignores a junk day param', async () => {
    await seed()
    renderAt('/?day=abc')

    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('does not pile up history entries when toggling days', async () => {
    const { d1, d2 } = await seed()
    const user = userEvent.setup()
    // Land on Home from somewhere else, so there IS a previous entry to go back
    // to. With `replace`, toggling leaves the stack at 2; with push it would grow
    // and Back would step through the accordion instead of leaving Home.
    render(
      <MemoryRouter initialEntries={['/sessions', '/']} initialIndex={1}>
        <App />
        <Spy />
        <Back />
      </MemoryRouter>,
    )

    await user.click(await screen.findByText('Dia 1'))
    await user.click(screen.getByText('Dia 2'))
    await user.click(screen.getByText('Dia 2'))
    await user.click(screen.getByText('Dia 1'))
    expect(url()).toBe(`/?day=${d1}`)
    expect([`/?day=${d1}`, `/?day=${d2}`]).toContain(url()) // sanity: toggles happened

    await user.click(screen.getByTestId('back'))
    expect(url()).toBe('/sessions') // one step out of Home, not back through 4 toggles
  })

  it("links a day's exercises with the day attached", async () => {
    const { d1, supino } = await seed()
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByText('Dia 1'))
    const link = screen.getByText('Supino Reto').closest('a')
    expect(link).toHaveAttribute('href', `/exercise/${supino}?day=${d1}`)
  })
})
