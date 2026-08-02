import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createExercise, setAlternatives } from '../../db/repos'
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

/** The alternatives picker in the exercise form (waits for the form to load). */
const picker = () => screen.findByRole('group', { name: 'Alternativas' })

describe('Exercise form — declaring alternatives', () => {
  it('registers SEVERAL kinds of variation without mixing them', async () => {
    // The case that motivated this: the barbell bench swaps for the machine
    // (same movement) and for the fly (same muscle). Those two must not become
    // alternatives of each other just because both belong to the barbell.
    const reto = await createExercise({ name: 'Supino Reto' }, db)
    const maq = await createExercise({ name: 'Supino Máquina' }, db)
    const cruc = await createExercise({ name: 'Crucifixo' }, db)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/settings/exercises/${reto}/edit`]}>
        <App />
      </MemoryRouter>,
    )

    await user.click(within(await picker()).getByRole('button', { name: 'Supino Máquina' }))
    await user.click(within(await picker()).getByRole('button', { name: 'Crucifixo' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      expect((await db.exercises.get(reto))?.alternativeIds).toEqual([maq, cruc])
      expect((await db.exercises.get(maq))?.alternativeIds).toEqual([reto])
      expect((await db.exercises.get(cruc))?.alternativeIds).toEqual([reto])
    })
  })

  it('links both sides, and the list shows it on each of them', async () => {
    await createExercise({ name: 'Supino Reto' }, db)
    const maq = await createExercise({ name: 'Supino Máquina' }, db)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/settings/exercises/${maq}/edit`]}>
        <App />
      </MemoryRouter>,
    )

    await user.click(within(await picker()).getByRole('button', { name: 'Supino Reto' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const chips = await screen.findAllByText(/Supino/, { selector: '.chip' })
    expect(chips.map((n) => n.textContent?.trim())).toEqual(
      expect.arrayContaining(['Supino Reto', 'Supino Máquina']),
    )
  })

  it('unticking one alternative leaves the others alone', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, db)
    const maq = await createExercise({ name: 'Supino Máquina' }, db)
    const cruc = await createExercise({ name: 'Crucifixo' }, db)
    await setAlternatives(reto, [maq, cruc], db)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/settings/exercises/${reto}/edit`]}>
        <App />
      </MemoryRouter>,
    )

    const chip = within(await picker()).getByRole('button', { name: /Crucifixo/ })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      expect((await db.exercises.get(reto))?.alternativeIds).toEqual([maq])
      expect((await db.exercises.get(cruc))?.alternativeIds).toEqual([])
      expect((await db.exercises.get(maq))?.alternativeIds).toEqual([reto])
    })
  })

  it('never offers the exercise itself', async () => {
    const reto = await createExercise({ name: 'Supino Reto' }, db)
    await createExercise({ name: 'Supino Máquina' }, db)
    render(
      <MemoryRouter initialEntries={[`/settings/exercises/${reto}/edit`]}>
        <App />
      </MemoryRouter>,
    )

    within(await picker()).getByRole('button', { name: 'Supino Máquina' })
    expect(within(await picker()).queryByRole('button', { name: 'Supino Reto' })).not.toBeInTheDocument()
  })
})
