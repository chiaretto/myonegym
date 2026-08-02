import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
  createCategory,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  saveWeight,
  setAlternatives,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

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

/**
 * "Dia 1" holds Rosca, Supino Reto and Tríceps. The barbell bench alternates
 * with the machine press AND with the fly — two unrelated kinds of variation —
 * and **neither alternative is in the day**. That is the whole shape of the
 * feature: the day lists what the user put in it.
 */
async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  const peito = await createCategory('Peito', db)
  await createExercise({ name: 'Rosca Direta', categoryIds: [peito] }, db)
  const reto = await createExercise({ name: 'Supino Reto', categoryIds: [peito] }, db)
  const maq = await createExercise({ name: 'Supino Máquina', categoryIds: [peito] }, db)
  const cruc = await createExercise({ name: 'Crucifixo', categoryIds: [peito] }, db)
  const corda = await createExercise({ name: 'Tríceps Corda', categoryIds: [peito] }, db)
  await setAlternatives(reto, [maq, cruc], db)
  await saveWeight(gym, reto, 60, 'KG', db)
  await saveWeight(gym, maq, 45, 'KG', db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [reto, corda] }, db)
  return { gym, reto, maq, cruc, corda, day }
}

/** The "Peso alvo" card's current value on whichever detail is open. */
const targetWeight = () => document.querySelector('.wc-value')?.textContent

describe('Home and the day are untouched by alternatives', () => {
  it('lists only the exercises the day holds', async () => {
    await seed()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(await screen.findByText('Dia 1'))

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText('Tríceps Corda')).toBeInTheDocument()
    // The alternatives stayed out of the day.
    expect(screen.queryByText('Supino Máquina')).not.toBeInTheDocument()
    expect(screen.queryByText('Crucifixo')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.exercises .exercise')).toHaveLength(2)
  })
})

describe('Exercise detail — "Alternativas" section', () => {
  it('lists both kinds of variation and opens each one', async () => {
    const { reto, day } = await seed()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/exercise/${reto}?day=${day}`]}>
        <App />
      </MemoryRouter>,
    )

    const section = await screen.findByRole('heading', { name: /Alternativas/ })
    expect(section).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Supino Máquina/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Crucifixo/ })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Supino Máquina/ }))

    // Its own detail, with its own per-gym target.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Supino Máquina' })).toBeInTheDocument(),
    )
    await waitFor(() => expect(targetWeight()).toBe('45 KG'))
  })

  it('the two alternatives do not become alternatives of each other', async () => {
    const { maq } = await seed()
    render(
      <MemoryRouter initialEntries={[`/exercise/${maq}`]}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Supino Máquina' })
    // The machine press points back at the barbell only.
    expect(await screen.findByRole('link', { name: /Supino Reto/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Crucifixo/ })).not.toBeInTheDocument()
  })

  it('shows no section for an exercise with no alternatives', async () => {
    await seed()
    const rosca = (await db.exercises.where('name').equals('Rosca Direta').first())!
    render(
      <MemoryRouter initialEntries={[`/exercise/${rosca.id}`]}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Rosca Direta' })
    expect(screen.queryByRole('heading', { name: /Alternativas/ })).not.toBeInTheDocument()
  })

  it('stepping through the day ignores alternatives', async () => {
    const { reto, day } = await seed()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/exercise/${reto}?day=${day}`]}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Supino Reto' })
    await user.click(screen.getByRole('button', { name: 'Próximo exercício' }))
    // Straight to the day's next exercise — an alternative is not a stop.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Tríceps Corda' })).toBeInTheDocument(),
    )
  })
})

describe('Session — "Fiz este no lugar"', () => {
  /**
   * A running session on the bench-press entry, seeded through the repository
   * and opened straight at that entry's detail.
   *
   * Deliberately not driven from Home: starting a workout and tapping into a
   * row is covered by the session suite, costs several IndexedDB round-trips
   * per test, and is not what any of these assertions is about.
   */
  async function startAtEntry({ done = false } = {}) {
    const seeded = await seed()
    const sid = await startSession(seeded.gym, seeded.day, db)
    const [entry] = await listSessionEntries(sid, db)
    if (done) await setEntryDone(entry.id!, true, db)
    render(
      <MemoryRouter initialEntries={[`/session/${sid}/entry/${entry.id}`]}>
        <App />
      </MemoryRouter>,
    )
    return { ...seeded, sid, entryId: entry.id! }
  }

  it('swaps what the session records, keeping the entry count', async () => {
    const user = userEvent.setup()
    const { sid, entryId, maq } = await startAtEntry()

    await screen.findByRole('heading', { name: /Alternativas/ })
    await user.click(screen.getByRole('link', { name: /Supino Máquina/ }))

    // Previewing shows ITS target weight, so the choice is an informed one.
    await waitFor(() => expect(targetWeight()).toBe('45 KG'))
    await user.click(screen.getByRole('button', { name: /Fiz este no lugar/ }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Supino Máquina' })).toBeInTheDocument(),
    )
    // The line moved; the workout did not grow a line for the machine press.
    const entries = await listSessionEntries(sid, db)
    expect(entries).toHaveLength(2)
    expect(entries.find((e) => e.id === entryId)?.exerciseId).toBe(maq)
  })

  it('a swap preserves the done state', async () => {
    const user = userEvent.setup()
    const { sid, entryId } = await startAtEntry({ done: true })

    await screen.findByRole('heading', { name: /Alternativas/ })
    await user.click(screen.getByRole('link', { name: /Crucifixo/ }))
    await user.click(await screen.findByRole('button', { name: /Fiz este no lugar/ }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Crucifixo' })).toBeInTheDocument(),
    )
    // Corrected which one was done — not undone.
    const entry = (await listSessionEntries(sid, db)).find((e) => e.id === entryId)
    expect(entry?.exerciseName).toBe('Crucifixo')
    expect(entry?.done).toBe(true)
  })

  it('previewing an alternative does not claim the entry’s done state', async () => {
    const user = userEvent.setup()
    await startAtEntry({ done: true })

    // The entry is done, so its own detail says so…
    expect(await screen.findByText('Concluído', { selector: '.chip' })).toBeInTheDocument()
    // The chip renders before the catalog has answered, so the section that
    // holds the link needs its own wait.
    await screen.findByRole('heading', { name: /Alternativas/ })
    await user.click(screen.getByRole('link', { name: /Supino Máquina/ }))

    // …but the alternative being previewed has not been done.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Supino Máquina' })).toBeInTheDocument(),
    )
    expect(screen.queryByText('Concluído', { selector: '.chip' })).not.toBeInTheDocument()
    expect(screen.getByText(/Alternativa de Supino Reto/)).toBeInTheDocument()
  })

  it('offers no swap once the session is completed', async () => {
    const { gym, day } = await seed()
    const sid = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sid, db)
    await setEntryDone(entry.id!, true, db)
    await completeSession(sid, db)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[`/session/${sid}/entry/${entry.id}`]}>
        <App />
      </MemoryRouter>,
    )

    // The alternatives are still listed — they are reference, not an action.
    await screen.findByRole('heading', { name: /Alternativas/ })
    await user.click(screen.getByRole('link', { name: /Supino Máquina/ }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Supino Máquina' })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: /Fiz este no lugar/ })).not.toBeInTheDocument()
  })
})
