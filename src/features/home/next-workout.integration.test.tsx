import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
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
      db.exerciseNotes,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

/** Gym "A" active + three days (Dia 1..3), each with one exercise. */
async function seedThreeDays() {
  const gym = await createGym('A', undefined, db)
  const ex = await createExercise({ name: 'Supino' }, db)
  const d1 = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  const d2 = await createDay({ name: 'Dia 2', exerciseIds: [ex] }, db)
  const d3 = await createDay({ name: 'Dia 3', exerciseIds: [ex] }, db)
  useActiveGym.setState({ activeGymId: gym })
  return { gym, d1, d2, d3 }
}

/** Run and complete a session for the given day in the gym. */
async function completeDay(gym: number, dayId: number) {
  const sid = await startSession(gym, dayId, db)
  const entries = await listSessionEntries(sid, db)
  await setEntryDone(entries[0].id!, true, db)
  await completeSession(sid, db)
}

/** The day-name that carries the "Próximo treino" eyebrow. */
function featuredDayName(): string {
  const li = screen.getByText('Próximo treino').closest('li')!
  return within(li).getByText(/^Dia \d$/).textContent!
}

describe('Home "Próximo treino" selection', () => {
  it('features the first day when there is no session history', async () => {
    await seedThreeDays()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    await waitFor(() => expect(featuredDayName()).toBe('Dia 1'))
  })

  it('advances to the day after the most recent completed session', async () => {
    const { gym, d1 } = await seedThreeDays()
    await completeDay(gym, d1)
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    await waitFor(() => expect(featuredDayName()).toBe('Dia 2'))
  })

  it('wraps back to the first day after completing the last day', async () => {
    const { gym, d3 } = await seedThreeDays()
    await completeDay(gym, d3)
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    await waitFor(() => expect(featuredDayName()).toBe('Dia 1'))
  })

  it('uses the most recent session, not the highest day', async () => {
    const { gym, d1, d3 } = await seedThreeDays()
    await completeDay(gym, d3) // trained Dia 3 first…
    await completeDay(gym, d1) // …then Dia 1 more recently
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    await waitFor(() => expect(featuredDayName()).toBe('Dia 2'))
  })
})
