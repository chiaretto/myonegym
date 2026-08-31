import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  setEntryDone,
  startCardioSession,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.sessions, db.sessionEntries].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seedDaySession() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const ids = []
  for (const name of ['Supino Reto', 'Crucifixo', 'Tríceps Corda']) {
    ids.push(await createExercise({ name }, db))
  }
  const day = await createDay({ name: 'Dia 1', exerciseIds: ids }, db)
  const sessionId = await startSession(gym, day, db)
  return { sessionId, entries: await listSessionEntries(sessionId, db) }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

/** The segments themselves say nothing — the bar carries one accessible name. */
const bar = (n: number, total: number, done: number) =>
  screen.getByRole('img', {
    name: `Exercício ${n} de ${total}, ${done} ${done === 1 ? 'concluído' : 'concluídos'}`,
  })

describe('Segmented progress on the session exercise screen', () => {
  it('draws one segment per exercise of the day, marking the current one', async () => {
    const { sessionId, entries } = await seedDaySession()
    renderAt(`/session/${sessionId}/entry/${entries[1].id}`)

    const strip = await screen.findByRole('img', { name: /^Exercício 2 de 3/ })
    expect(strip.querySelectorAll('.entry-seg')).toHaveLength(3)
    // Exactly one "you are here", and it is the entry being viewed.
    const segs = Array.from(strip.querySelectorAll('.entry-seg'))
    expect(segs.filter((s) => s.classList.contains('current'))).toEqual([segs[1]])
    expect(segs.some((s) => s.classList.contains('done'))).toBe(false)
  })

  it('separates the done from the pending', async () => {
    const { sessionId, entries } = await seedDaySession()
    await setEntryDone(entries[0].id!, true, db)
    renderAt(`/session/${sessionId}/entry/${entries[2].id}`)

    const strip = await screen.findByRole('img', { name: /^Exercício 3 de 3/ })
    const segs = Array.from(strip.querySelectorAll('.entry-seg'))
    expect(segs.map((s) => s.classList.contains('done'))).toEqual([true, false, false])
    expect(segs.map((s) => s.classList.contains('current'))).toEqual([false, false, true])
  })

  it('is an indicator, not navigation — no segment is a button or a link', async () => {
    const { sessionId, entries } = await seedDaySession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const strip = await screen.findByRole('img', { name: /^Exercício 1 de 3/ })
    expect(strip.querySelectorAll('button, a')).toHaveLength(0)
    // Mid-workout the thumb already lives in this band; a tap here must do
    // nothing rather than jump the user somewhere.
    await userEvent.setup().click(strip.querySelectorAll('.entry-seg')[2])
    expect(screen.getByRole('heading', { name: 'Supino Reto', level: 1 })).toBeInTheDocument()
  })

  it('repaints the moment an exercise is marked', async () => {
    const { sessionId, entries } = await seedDaySession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    expect(await screen.findByRole('img', { name: /^Exercício 1 de 3, 0 concluídos/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    // Marking advanced to the second, and the first now counts.
    expect(await screen.findByRole('img', { name: /^Exercício 2 de 3, 1 concluído$/ })).toBeInTheDocument()
    expect(bar(2, 3, 1).querySelectorAll('.entry-seg.done')).toHaveLength(1)
  })

  it('rides the floating bar, under the arrows and Concluir', async () => {
    const { sessionId, entries } = await seedDaySession()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const strip = await screen.findByRole('img', { name: /^Exercício 1 de 3/ })

    // Fixed chrome, not tab content: it must not scroll away with the body.
    const bar = strip.closest('.action-bar')
    expect(bar).not.toBeNull()
    expect(strip.closest('main.screen')).toBeNull()

    // Under the controls that move through it — they keep the edge nearest the
    // thumb, and the progress reads as the caption on what they just did.
    const row = bar!.querySelector('.entry-nav-row')!
    expect(Array.from(bar!.children)).toEqual([row, strip])
  })

  it('stays put while the user moves between tabs', async () => {
    const { sessionId, entries } = await seedDaySession()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    expect(await screen.findByRole('img', { name: /^Exercício 1 de 3/ })).toBeInTheDocument()
    for (const name of ['Notas', 'Foto']) {
      await user.click(screen.getByRole('tab', { name }))
      expect(screen.getByRole('img', { name: /^Exercício 1 de 3/ })).toBeInTheDocument()
    }
  })

  it('says nothing on a cardio session, which holds a single entry', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const ex = await createExercise({ name: 'Esteira', kind: 'cardio' }, db)
    const { sessionId, entryId } = await startCardioSession(gym, ex, db)
    renderAt(`/session/${sessionId}/entry/${entryId}`)

    // A lone full-width segment tells the user nothing — the same reason the
    // Voltar/Avançar arrows are absent here.
    expect(await screen.findByRole('heading', { name: 'Esteira', level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Exercício \d+ de/ })).toBeNull()
    expect(document.querySelectorAll('.entry-seg')).toHaveLength(0)
  })
})
