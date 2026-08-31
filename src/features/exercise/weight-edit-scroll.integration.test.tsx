import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  saveWeight,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The weight card sits below the media and the warm-up, and it GROWS when it
 * opens — stepper, units, "Só nessa academia", Cancelar/Salvar. That used to
 * push the actions under the fixed bar: the user typed a weight and could not
 * see where to save it. Opening the editor now brings the card up to the top.
 *
 * jsdom has no layout, so what is asserted here is that the card asks to be
 * scrolled to the top; where it actually lands is a browser concern, and
 * `scroll-margin-top` (see exercise.css) is what keeps it clear of the sticky
 * app bar.
 */

let scrollIntoView: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
})

afterEach(async () => {
  scrollIntoView.mockRestore()
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
  useActiveGym.setState({ activeGymId: gym })
  const supino = await createExercise({ name: 'Supino Reto' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  return { gym, supino, day }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

/** The card that asked to be scrolled, if any. */
const scrolledCard = () =>
  scrollIntoView.mock.contexts.find((el) => (el as Element).classList?.contains('weight-card'))

describe('Editing the weight brings its card to the top', () => {
  it('scrolls the card up from the in-session detail, with the actions in view', async () => {
    const { gym, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    const sessionId = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sessionId, db)
    renderAt(`/session/${sessionId}/entry/${entry.id}`)

    // The label only flips Definir → Editar once the weight's live query has
    // answered, which is a gym read, a resolveWeight and a re-render deep. The
    // default one second is a race on a loaded machine, and what this test is
    // about is the scroll, not how fast Dexie is.
    await userEvent.setup().click(
      await screen.findByRole('button', { name: /Editar/ }, { timeout: 3000 }),
    )

    expect(await screen.findByRole('button', { name: /Salvar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    await waitFor(() => expect(scrolledCard()).toBe(document.querySelector('.weight-card')))
    // `block: 'start'` is what "as near the top as it goes" means — and it is
    // also what covers the card already near the bottom of a short page, where
    // the browser scrolls as far as it can and the actions come into view.
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'start' }),
    )
  })

  it('does the same from the catalog detail — the problem is the editor, not the session', async () => {
    const { supino, day } = await seed()
    renderAt(`/exercise/${supino}?day=${day}`)

    // No weight yet, so the control offers to define one.
    await userEvent.setup().click(await screen.findByRole('button', { name: /Definir/ }))

    expect(await screen.findByRole('button', { name: /Salvar/ })).toBeInTheDocument()
    await waitFor(() => expect(scrolledCard()).toBe(document.querySelector('.weight-card')))
  })

  it('does not scroll when the history is revealed — that is a different trigger', async () => {
    const { gym, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    renderAt(`/exercise/${supino}?day=${day}`)

    // Revealing the history also changes the card's height, but it is not the
    // gesture the scroll exists for: only entering edit hides Salvar below the
    // fold, and only that should move the page.
    await userEvent.setup().click(await screen.findByRole('button', { name: /Histórico/ }))

    expect(document.querySelector('.timeline')).not.toBeNull()
    expect(scrolledCard()).toBeUndefined()
  })

  it('does not scroll while the card is only being read', async () => {
    const { gym, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    const sessionId = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sessionId, db)
    renderAt(`/session/${sessionId}/entry/${entry.id}`)

    expect(
      await screen.findByRole('button', { name: /Editar/ }, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(scrolledCard()).toBeUndefined()
  })
})
