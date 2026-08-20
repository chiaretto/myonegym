import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createCategory,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The detail views put their **tabs first** and give each tab what belongs to
 * it: the media illustrates execution, the categories describe the exercise and
 * read with the note, the photos are the machine in this gym. Only the entry's
 * status stays above the tabs, true on every one of them.
 *
 * These assertions are about **where** things are, so they lean on document
 * order and on the media/chips being absent from the other panels — the parts a
 * reordering can silently get wrong.
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
      db.exerciseNotes,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const peito = await createCategory('Peito', db)
  const triceps = await createCategory('Tríceps', db)
  const supino = await createExercise(
    { name: 'Supino Reto', mediaUrl: 'https://x.com/supino.gif', categoryIds: [peito, triceps] },
    db,
  )
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, day, supino }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const media = () => document.querySelector('.hero')
const tabList = () => document.querySelector('[role="tablist"]')

/** True when `a` comes before `b` in the rendered document. */
const comesBefore = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('In-session exercise detail — tabs first', () => {
  async function openEntry(done = false) {
    const { gym, day } = await seed()
    const sessionId = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sessionId, db)
    if (done) await setEntryDone(entry.id!, true, db)
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entry.id}`)
    await screen.findByRole('tab', { name: 'Execução' })
    return user
  }

  it('puts the tabs above the media and the weight editor', async () => {
    await openEntry()

    expect(comesBefore(tabList()!, media()!)).toBe(true)
    expect(comesBefore(tabList()!, screen.getByText('Peso alvo'))).toBe(true)
  })

  it('shows the media only on "Execução"', async () => {
    const user = await openEntry()
    expect(media()).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    expect(media()).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Foto/ }))
    expect(media()).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Execução' }))
    expect(media()).toBeInTheDocument()
  })

  it('shows the categories inside "Notas", not above the tabs', async () => {
    const user = await openEntry()
    expect(screen.queryByText('Peito')).not.toBeInTheDocument()
    expect(screen.queryByText('Tríceps')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Notas' }))

    const peito = await screen.findByText('Peito')
    expect(screen.getByText('Tríceps')).toBeInTheDocument()
    // Inside the panel, below the tabs — not back up in the header.
    expect(comesBefore(tabList()!, peito)).toBe(true)
  })

  it('keeps "Concluído" above the tabs on every tab', async () => {
    const user = await openEntry(true)
    const chip = () => document.querySelector('.ex-head .chip.accent')

    expect(chip()).toHaveTextContent('Concluído')
    expect(comesBefore(chip()!, tabList()!)).toBe(true)

    for (const name of ['Notas', 'Foto']) {
      await user.click(screen.getByRole('tab', { name }))
      expect(chip()).toHaveTextContent('Concluído')
    }
  })
})

describe('Catalog exercise detail — tabs first', () => {
  async function openExercise() {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)
    await screen.findByRole('tab', { name: 'Detalhe' })
    return user
  }

  it('puts the tabs above the media and the weight editor', async () => {
    await openExercise()

    expect(comesBefore(tabList()!, media()!)).toBe(true)
    expect(comesBefore(tabList()!, screen.getByText('Peso alvo'))).toBe(true)
  })

  it('shows the media only on "Detalhe"', async () => {
    const user = await openExercise()
    expect(media()).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /^Foto/ }))
    expect(media()).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Detalhe' }))
    expect(media()).toBeInTheDocument()
  })

  it('shows the categories inside "Notas", not above the tabs', async () => {
    const user = await openExercise()
    expect(screen.queryByText('Peito')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Notas' }))

    expect(comesBefore(tabList()!, await screen.findByText('Peito'))).toBe(true)
  })
})
