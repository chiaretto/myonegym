import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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

/** "Crucifixo" is deliberately in BOTH days, so the catalog detail would
 *  otherwise have had a "2 dias" chip to show. */
async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const peito = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [peito] }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryIds: [peito] }, db)
  const d1 = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo] }, db)
  const d4 = await createDay({ name: 'Dia 4', exerciseIds: [crucifixo] }, db)
  return { gym, d1, d4, supino, crucifixo }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('Catalog exercise detail header', () => {
  it('shows the exercise name once, in the top bar', async () => {
    const { d1, crucifixo } = await seed()
    renderAt(`/exercise/${crucifixo}?day=${d1}`)

    // The one heading is the app bar's h1 — the body no longer repeats the name.
    expect(await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Crucifixo' })).toHaveLength(1)
    expect(document.querySelector('.ex-title')).toBeNull()
  })

  it('does not show the training day it was opened from', async () => {
    const { d1, crucifixo } = await seed()
    renderAt(`/exercise/${crucifixo}?day=${d1}`)

    await screen.findByRole('heading', { name: 'Crucifixo', level: 1 })
    expect(screen.queryByText('Dia 1')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ dias/)).not.toBeInTheDocument() // "2 dias" either
  })

  it('keeps the category labels', async () => {
    const { d1, crucifixo } = await seed()
    renderAt(`/exercise/${crucifixo}?day=${d1}`)

    expect(await screen.findByText('Peito')).toBeInTheDocument()
  })
})

describe('In-session exercise detail header', () => {
  it('shows the exercise name once and hides the session day', async () => {
    const { gym, d1 } = await seed()
    const sessionId = await startSession(gym, d1, db)
    const entries = await listSessionEntries(sessionId, db)
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    expect(await screen.findByRole('heading', { name: 'Supino Reto', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Supino Reto' })).toHaveLength(1)
    expect(screen.queryByText('Dia 1')).not.toBeInTheDocument()
  })

  it('keeps the "Concluído" status chip — it is status, not navigation context', async () => {
    const { gym, d1 } = await seed()
    const sessionId = await startSession(gym, d1, db)
    const entries = await listSessionEntries(sessionId, db)
    await setEntryDone(entries[0].id!, true, db)
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    await screen.findByRole('heading', { name: 'Supino Reto', level: 1 })
    expect(document.querySelector('.ex-chips .chip.accent')).toHaveTextContent('Concluído')
  })
})
