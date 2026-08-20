import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import { db } from '../db/db'
import { completeSession, createDay, createExercise, createGym, startCardioSession, startSession } from '../db/repos'
import { useActiveGym } from '../state/activeGym'
import { useOnboarding } from '../state/onboarding'

/**
 * The two kind marks on the weekly track — the musculação dot and the cardio
 * star — checked through the screens rather than through `buildWeekTrack`.
 *
 * The unit tests in lib/week.test.ts already prove the cell carries the flags.
 * What they cannot prove is that a page passes `cardioAt` at all — and that is
 * precisely the defect this covers: the track shipped without the mark while the
 * Consistência calendar had it, because nobody wired the argument. Both tabs
 * render the same widget, so both are asserted.
 */

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.sessions, db.sessionEntries].map((t) =>
      t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('A', db)
  useActiveGym.setState({ activeGymId: gym })
  const supino = await createExercise({ name: 'Supino' }, db)
  const esteira = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, supino, esteira, day }
}

async function completeCardio(gym: number, exerciseId: number) {
  const { sessionId } = await startCardioSession(gym, exerciseId, db)
  await completeSession(sessionId, db)
}

async function completeWorkout(gym: number, dayId: number) {
  const sid = await startSession(gym, dayId, db)
  await completeSession(sid, db)
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

/** The one cell of the track that is marked done — these tests train one day. */
async function doneCell(): Promise<HTMLElement> {
  const card = await screen.findByLabelText('Resumo da semana')
  const track = within(card).getByLabelText('Dias da semana')
  const cell = Array.from(track.querySelectorAll('li')).find((li) =>
    li.classList.contains('done'),
  )
  expect(cell, 'expected one day of the track to be marked done').toBeTruthy()
  return cell as HTMLElement
}

describe('kind marks on the weekly track', () => {
  it('stars a cardio day on the Treinos tab', async () => {
    const { gym, esteira } = await seed()
    await completeCardio(gym, esteira)

    renderAt('/')
    const cell = await doneCell()
    expect(cell).toHaveClass('cardio')
    expect(cell).not.toHaveClass('strength')
    expect(cell.getAttribute('aria-label')).toMatch(/cardio/)
  })

  it('stars the same day on the Cardio tab', async () => {
    // One widget, one vocabulary: a mark that showed up on only one tab would be
    // a second grammar for the same seven days.
    const { gym, esteira } = await seed()
    await completeCardio(gym, esteira)

    renderAt('/cardio')
    const cell = await doneCell()
    expect(cell).toHaveClass('cardio')
    expect(cell).not.toHaveClass('strength')
  })

  it('dots a strength-only day, and does not star it', async () => {
    const { gym, day } = await seed()
    await completeWorkout(gym, day)

    renderAt('/')
    const cell = await doneCell()
    expect(cell).toHaveClass('strength')
    expect(cell).not.toHaveClass('cardio')
    expect(cell.getAttribute('aria-label')).toMatch(/musculação/)
    expect(cell.getAttribute('aria-label')).not.toMatch(/cardio/)
  })

  it('carries both marks on a day that held both kinds', async () => {
    const { gym, day, esteira } = await seed()
    await completeWorkout(gym, day)
    await completeCardio(gym, esteira)

    renderAt('/')
    const cell = await doneCell()
    expect(cell).toHaveClass('strength', 'cardio')
    // Nothing on screen counts any more, but the spoken label still gives the
    // honest total alongside both kinds.
    expect(cell.getAttribute('aria-label')).toMatch(/2 treinos — musculação e cardio/)
  })

  it('adds no second mark for a repeated kind', async () => {
    // The dot answers "was there musculação", never "how many" — two workouts
    // and one workout look the same, on purpose.
    const { gym, day } = await seed()
    await completeWorkout(gym, day)
    await completeWorkout(gym, day)

    renderAt('/')
    const cell = await doneCell()
    expect(cell).toHaveClass('strength')
    expect(cell).not.toHaveClass('cardio')
  })
})
