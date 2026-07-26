import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  deleteGym,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { dayIndexInWeek, startOfWeek } from '../../lib/week'

/**
 * The weekly summary answers "did I train this week?", not "did I train this
 * week *here*?". It used to read the active gym's history, so two workouts at
 * two gyms showed as one.
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

async function seedTwoGyms() {
  const a = await createGym('Smart Fit', undefined, db)
  const b = await createGym('Bio Ritmo', undefined, db)
  const ex = await createExercise({ name: 'Supino' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  useActiveGym.setState({ activeGymId: a })
  return { a, b, day }
}

/**
 * Timestamp for a weekday of the CURRENT week, at midday.
 *
 * Anchored to startOfWeek rather than to "yesterday": on a Monday, "yesterday"
 * lands in the previous week and the assertion would flap once every seven days.
 * Only indices at or before today are safe to use — a future cell is never done.
 */
function dayOfThisWeek(index: number): number {
  return startOfWeek(Date.now()) + index * 86_400_000 + 12 * 3_600_000
}

async function completeAt(gym: number, dayId: number, completedAt: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
  await db.sessions.update(sid, { completedAt })
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

const doneCells = () => document.querySelectorAll('.wd.done').length

/**
 * The headline counts DAYS trained, not sessions, so proving that two gyms add
 * up needs two distinct days of the current week. On a Monday there is only one
 * — and a day borrowed from last week would not count toward this one — so the
 * two tests that need it are skipped rather than silently returning, which would
 * report as a pass. The third test below runs every day.
 */
const today = dayIndexInWeek(Date.now())
const needsTwoDays = it.skipIf(today < 1)

describe('Weekly summary spans every gym', () => {
  needsTwoDays('adds up workouts done at different gyms', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, dayOfThisWeek(today - 1))
    await completeAt(b, day, dayOfThisWeek(today))

    renderHome()

    await waitFor(() => expect(doneCells()).toBe(2))
    // The count is split across elements ("2" + "/ 7 treinos"), so read the
    // headline number from its own element.
    expect(document.querySelector('.week-count')!.textContent).toContain('2')
  })

  needsTwoDays('does not change when the active gym changes', async () => {
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, dayOfThisWeek(today - 1))
    await completeAt(b, day, dayOfThisWeek(today))

    renderHome()
    await waitFor(() => expect(doneCells()).toBe(2))

    useActiveGym.setState({ activeGymId: b })
    await waitFor(() => expect(doneCells()).toBe(2))
  })

  it('keeps counting a workout whose gym was deleted', async () => {
    // The workout happened. Deleting the gym does not un-happen it, and
    // deleteGym leaves the session behind anyway.
    const { a, b, day } = await seedTwoGyms()
    await completeAt(a, day, dayOfThisWeek(today))
    await deleteGym(a, db)
    useActiveGym.setState({ activeGymId: b })

    renderHome()

    expect(await screen.findByText('Dia 1')).toBeInTheDocument()
    await waitFor(() => expect(doneCells()).toBe(1))
  })
})
