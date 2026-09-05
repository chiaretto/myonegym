import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  resolveWeight,
  saveWeight,
} from '../../db/repos'
import { GLOBAL_GYM_ID } from '../../db/types'
import { useActiveGym } from '../../state/activeGym'

/**
 * "Só nessa academia" decides **where a save lands**: on the exercise's global
 * weight (the default, shared by every gym) or on this gym's exception. The
 * checkbox always opens on the scope already in effect, and the gym's name is
 * shown only while an exception is what the screen is displaying.
 */

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
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', db)
  const other = await createGym('Academia B', db)
  useActiveGym.setState({ activeGymId: gym })
  const supino = await createExercise({ name: 'Supino Reto' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, other, supino, day }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const scopeBox = () => screen.getByRole('checkbox', { name: /Só nessa academia/ })
const weightCard = () => document.querySelector('.weight-card') as HTMLElement

/** Open the editor and type a value into the weight field. */
async function typeWeight(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(await screen.findByRole('button', { name: /Editar|Definir/ }))
  const input = screen.getByLabelText('Peso')
  await user.clear(input)
  await user.type(input, value)
}

describe('Weight scope on the catalog exercise detail', () => {
  it('saves globally by default — no gym label, and the other gym sees it', async () => {
    const { gym, other, supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await typeWeight(user, '20')
    expect(scopeBox()).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () =>
      expect(await db.weights.where('gymId').equals(GLOBAL_GYM_ID).count()).toBe(1),
    )
    expect(await db.weights.where('gymId').equals(gym).count()).toBe(0)
    // The same weight applies in the gym that was never opened.
    expect(await resolveWeight(other, supino, db)).toMatchObject({
      scope: 'global',
      weight: { value: 20 },
    })
    // A global weight carries no gym label — it is just the exercise's weight.
    expect(within(weightCard()).queryByText('Academia A')).toBeNull()
  })

  it('checking the box saves an exception and starts labelling the card', async () => {
    const { gym, other, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await typeWeight(user, '15')
    await user.click(scopeBox())
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () =>
      expect(await resolveWeight(gym, supino, db)).toMatchObject({
        scope: 'gym',
        weight: { value: 15 },
      }),
    )
    // The global weight is untouched, so the other gym keeps 20.
    expect(await resolveWeight(other, supino, db)).toMatchObject({
      scope: 'global',
      weight: { value: 20 },
    })
    // Now the label means something, and the history says whose it is — inside
    // the modal, not in its title: the title stopped naming a gym when the modal
    // gained a selector that can point it at any of them.
    expect(await within(weightCard()).findByText('Academia A')).toBeInTheDocument()
    await user.click(within(weightCard()).getByRole('button', { name: /Histórico/ }))
    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAccessibleName('Histórico')
    expect(within(modal).getByText(/só desta academia/i)).toBeInTheDocument()
  })

  it('reopens with the box already checked where an exception exists', async () => {
    const { gym, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    await saveWeight(gym, supino, 15, 'KG', 'gym', db)
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await screen.findByRole('button', { name: /Editar/ }))
    expect(scopeBox()).toBeChecked()
    expect(screen.getByLabelText('Peso')).toHaveValue(15)
  })

  it('unchecking the box hands the weight back to every gym', async () => {
    const { gym, other, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    await saveWeight(gym, supino, 17.5, 'KG', 'gym', db)
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await screen.findByRole('button', { name: /Editar/ }))
    await user.click(scopeBox()) // uncheck
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () =>
      expect(await db.weights.where('gymId').equals(gym).count()).toBe(0),
    )
    expect(await resolveWeight(other, supino, db)).toMatchObject({
      scope: 'global',
      weight: { value: 17.5 },
    })
    // The label goes with the exception.
    await waitFor(() => expect(within(weightCard()).queryByText('Academia A')).toBeNull())
  })
})

describe('Weight scope on the in-session exercise detail', () => {
  it('offers the same checkbox and creates the exception for the session gym', async () => {
    const { gym, other, supino } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    const user = userEvent.setup()
    renderAt('/')

    await user.click((await screen.findAllByRole('button', { name: 'Iniciar' }))[0])
    await user.click(await screen.findByRole('link', { name: /Supino Reto/ }))

    await typeWeight(user, '18')
    expect(scopeBox()).not.toBeChecked()
    await user.click(scopeBox())
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () =>
      expect(await resolveWeight(gym, supino, db)).toMatchObject({
        scope: 'gym',
        weight: { value: 18 },
      }),
    )
    expect(await resolveWeight(other, supino, db)).toMatchObject({
      scope: 'global',
      weight: { value: 20 },
    })
  })
})
