import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createDay, createExercise, createGym, setAlternatives } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

/**
 * Voltar from an exercise detail opened off the Cardio tab.
 *
 * The origin is carried in the URL, never in the history stack — that is what
 * lets Voltar survive a reload and a shared link. The Cardio tab linked without
 * it, so the detail page had nothing to go on and fell back to Home.
 */

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

function Spy() {
  const loc = useLocation()
  return <div data-testid="url">{loc.pathname + loc.search}</div>
}
const url = () => screen.getByTestId('url').textContent

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Spy />
    </MemoryRouter>,
  )

async function seed() {
  const gym = await createGym('A', db)
  useActiveGym.setState({ activeGymId: gym })
  const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
  const bike = await createExercise({ name: 'Bicicleta', kind: 'cardio' }, db)
  return { gym, esteira, bike }
}

describe('Voltar from a cardio exercise detail', () => {
  it('returns to the Cardio tab, not to Home', async () => {
    const user = userEvent.setup()
    const { esteira } = await seed()

    renderAt('/cardio')
    await user.click(await screen.findByText('Esteira'))
    expect(url()).toBe(`/exercise/${esteira}?from=cardio`)

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(url()).toBe('/cardio')
  })

  it('keeps the way back one hop into an alternative', async () => {
    // Dropping the marker when opening an alternative is how the way back gets
    // lost one screen in — the same reason `day` is propagated there.
    const user = userEvent.setup()
    const { esteira, bike } = await seed()
    await setAlternatives(esteira, [bike], db)

    renderAt(`/exercise/${esteira}?from=cardio`)
    await user.click(await screen.findByText('Bicicleta'))
    expect(url()).toBe(`/exercise/${bike}?from=cardio`)

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(url()).toBe('/cardio')
  })

  it('lets the day win when the cardio exercise also sits in one', async () => {
    // A cardio exercise may stay in a training day. Opened from Home, Voltar
    // belongs to Home — the marker says where the visit started, and the day is
    // the richer answer.
    const user = userEvent.setup()
    const { esteira } = await seed()
    const day = await createDay({ name: 'Dia 1', exerciseIds: [esteira] }, db)

    renderAt(`/exercise/${esteira}?day=${day}&from=cardio`)
    await user.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(url()).toBe(`/?day=${day}`)
  })

  it('still falls back to Home with no marker at all', async () => {
    const user = userEvent.setup()
    const { esteira } = await seed()

    renderAt(`/exercise/${esteira}`)
    await user.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(url()).toBe('/')
  })
})
