import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  saveWeight,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'

/**
 * The weight history opens in a modal, from a button stacked above Editar on the
 * weight card. What it shows once open is unchanged — this is about WHERE and
 * WHEN it shows.
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

/** An exercise whose weight has moved three times. */
async function seed({ entries = 3 }: { entries?: number } = {}) {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const supino = await createExercise({ name: 'Supino Reto' }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
  for (let i = 0; i < entries; i++) {
    await saveWeight(gym, supino, 20 + i * 2.5, 'KG', 'global', db)
  }
  return { gym, supino, day }
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const card = () => document.querySelector('.weight-card') as HTMLElement
// The button only exists once the history live query has answered, which is a
// gyms read, a resolveWeight and a useHistory deep. The default second is a race
// on a loaded machine, and none of these tests are about how fast Dexie is.
const findOpenBtn = () =>
  screen.findByRole('button', { name: /Histórico/ }, { timeout: 3000 })
const sheet = () => screen.queryByRole('dialog')
const timeline = () => document.querySelector('.timeline')
const spark = () => document.querySelector('.spark')

describe('Weight history opens in a modal', () => {
  it('sits on the card\'s top line, beside "Peso alvo", carrying the count', async () => {
    const { supino, day } = await seed()
    renderAt(`/exercise/${supino}?day=${day}`)

    const btn = await findOpenBtn()
    // On the card: the history is a fact about the target weight.
    expect(btn.closest('.weight-card')).toBe(card())
    // On the top line, sharing it with the eyebrow label — not down beside the
    // figure, which is what the eye should land on.
    const head = btn.closest('.wc-head')
    expect(head).not.toBeNull()
    expect(head).toHaveTextContent('Peso alvo')
    // The count answers "is there anything in there?" before the modal costs a tap.
    expect(btn).toHaveTextContent('3')
    // …and nothing of the history itself is on the card.
    expect(timeline()).toBeNull()
    expect(spark()).toBeNull()
    expect(sheet()).toBeNull()
  })

  it('opens a modal with the chart and every entry, and closes again', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await findOpenBtn())

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Histórico')
    expect(spark()).not.toBeNull()
    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)
    // The content is untouched: value, unit, delta and relative date.
    expect(within(timeline() as HTMLElement).getByText('25')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(sheet()).toBeNull())
    expect(timeline()).toBeNull()
  })

  it('starts closed again on every visit — it is never remembered', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await findOpenBtn())
    expect(timeline()).not.toBeNull()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))

    // Away and back, through the app rather than by remounting: the point is
    // that nothing about the open state is carried anywhere.
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    await screen.findByText(/^Dia 1/)
    await user.click(await screen.findByText('Supino Reto'))

    await findOpenBtn()
    expect(sheet()).toBeNull()
    expect(timeline()).toBeNull()
  })

  it('shows no row at all when nothing has been recorded', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const supino = await createExercise({ name: 'Supino Reto' }, db)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [supino] }, db)
    renderAt(`/exercise/${supino}?day=${day}`)

    // A button whose only trick is opening an empty modal does not earn its place.
    expect(await screen.findByText('Peso alvo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Histórico/ })).toBeNull()
  })

  it('stays reachable while the weight is being edited', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)
    await findOpenBtn()

    await user.click(await screen.findByRole('button', { name: /Editar/ }, { timeout: 3000 }))

    // From the top line, opening a modal, it costs the edit form no height — so
    // Cancelar and Salvar still clear the fold, which is what the scroll-to-top
    // exists to protect. And what you lifted last time is exactly what you want
    // while deciding what to type.
    expect(screen.getByRole('button', { name: /Salvar/ })).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /Histórico/ })
    expect(btn.closest('.wc-head')).not.toBeNull()

    await user.click(btn)
    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)
    // Closing hands the edit form back, untouched.
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(sheet()).toBeNull())
    expect(screen.getByRole('button', { name: /Salvar/ })).toBeInTheDocument()
  })

  it('still deletes an entry from inside the modal', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await findOpenBtn())
    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)

    // Destructive and rare, so a tap deeper is the right direction — but it must
    // still work exactly as before, confirmation included. The confirmation is
    // itself a sheet, stacked over this one.
    await user.click(screen.getAllByRole('button', { name: 'Excluir registro' })[0])
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(2))
    // Deleting the most recent reverts the weight to the one before it. Scoped
    // to the headline figure: "22,5" is also a row in the timeline below.
    await waitFor(() =>
      expect(card().querySelector('.wc-value')).toHaveTextContent('22,5'),
    )
  })

  it('names no gym on a global history', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await findOpenBtn())
    // A global history belongs to no gym in particular.
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Histórico')
  })

  it('closes itself when the last entry is deleted — nothing left to show', async () => {
    const { supino, day } = await seed({ entries: 1 })
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    await user.click(await findOpenBtn())
    await user.click(screen.getByRole('button', { name: 'Excluir registro' }))
    await user.click(await screen.findByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(sheet()).toBeNull())
    // And the button goes with it: there is no history left to open.
    await waitFor(() => expect(screen.queryByRole('button', { name: /Histórico/ })).toBeNull())
  })

  it('reveals, without offering deletion, on a completed session', async () => {
    const { gym, day } = await seed()
    const sessionId = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sessionId, db)
    await setEntryDone(entry.id!, true, db)
    await completeSession(sessionId, db)
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entry.id}`)

    await user.click(await findOpenBtn())

    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Excluir registro' })).toBeNull()
  })

  it('works the same on the in-session detail as on the catalog one', async () => {
    const { gym, day } = await seed()
    const sessionId = await startSession(gym, day, db)
    const [entry] = await listSessionEntries(sessionId, db)
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entry.id}`)

    const btn = await findOpenBtn()
    expect(btn).toHaveTextContent('3')
    expect(sheet()).toBeNull()

    await user.click(btn)
    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)
  })
})
