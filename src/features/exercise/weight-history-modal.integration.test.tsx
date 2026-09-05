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

    // The editor is a popup now, so the card's own history button is behind it —
    // and the popup carries one of its own, on its title line. What you lifted
    // last time is exactly what you want while deciding what to type.
    const editor = screen.getByRole('dialog', { name: 'Peso alvo' })
    expect(within(editor).getByRole('button', { name: /Salvar/ })).toBeInTheDocument()
    const btn = within(editor).getByRole('button', { name: /Histórico/ })
    expect(btn.closest('.sheet-head')).not.toBeNull()

    await user.click(btn)
    expect(timeline()!.querySelectorAll('.tl-item')).toHaveLength(3)

    // Closing the history hands the edit popup back, untouched — and Escape
    // reaches only the top sheet, so it does not take the editor with it.
    const historyModal = screen.getByRole('dialog', { name: 'Histórico' })
    await user.click(within(historyModal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Histórico' })).toBeNull())
    expect(
      within(screen.getByRole('dialog', { name: 'Peso alvo' })).getByRole('button', {
        name: /Salvar/,
      }),
    ).toBeInTheDocument()
  })

  it('Escape closes the history without closing the editor under it', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)
    await findOpenBtn()

    await user.click(await screen.findByRole('button', { name: /Editar/ }, { timeout: 3000 }))
    const editor = screen.getByRole('dialog', { name: 'Peso alvo' })
    await user.click(within(editor).getByRole('button', { name: /Histórico/ }))
    expect(screen.getByRole('dialog', { name: 'Histórico' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Histórico' })).toBeNull())
    // One keystroke, one sheet: a half-typed weight is not thrown away to
    // dismiss a list.
    expect(screen.getByRole('dialog', { name: 'Peso alvo' })).toBeInTheDocument()
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

/**
 * Looking at another gym's weight without leaving the one you are in. The
 * selector points the timeline elsewhere; everything behind the modal — the
 * card, the editor, the save — stays about the active gym.
 */
describe('The history modal reaches the other gyms', () => {
  /** Gym A active with a global weight, gym B with an exception of its own. */
  async function seedTwoGyms() {
    const a = await createGym('Academia A', db)
    const b = await createGym('Academia B', db)
    useActiveGym.setState({ activeGymId: a })
    const supino = await createExercise({ name: 'Supino Reto' }, db)
    await saveWeight(a, supino, 20, 'KG', 'global', db)
    await saveWeight(a, supino, 22.5, 'KG', 'global', db)
    await saveWeight(b, supino, 60, 'KG', 'gym', db)
    return { a, b, supino }
  }

  const openHistory = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await findOpenBtn())
    return screen.getByRole('dialog')
  }

  /** Open the pill's list and pick a gym from it. */
  const pickGym = async (
    user: ReturnType<typeof userEvent.setup>,
    modal: HTMLElement,
    name: string,
  ) => {
    await user.click(within(modal).getByLabelText('Ver outra academia'))
    const list = within(modal).getByRole('group', { name: 'Academias' })
    await user.click(within(list).getByRole('button', { name: new RegExp(name) }))
  }

  it('names the gym it is showing, on the title line, and starts on the active one', async () => {
    const { supino } = await seedTwoGyms()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}`)

    const modal = await openHistory(user)
    const pill = within(modal).getByLabelText('Ver outra academia')
    expect(pill).toHaveTextContent('Academia A')
    // On the same line as the title, not above the timeline.
    expect(pill.closest('.sheet-head')).toBeTruthy()
    // Shut until asked: the list is a detour, not the content.
    expect(within(modal).queryByRole('group', { name: 'Academias' })).not.toBeInTheDocument()

    // Gym A has no exception, so what it shows IS the global timeline — and the
    // modal says so, which is what keeps two gyms showing the same entries from
    // reading as a bug.
    expect(within(modal).getByText(/Peso global/)).toBeInTheDocument()
    expect(within(modal).getByText(/22,5 KG/)).toBeInTheDocument()
  })

  it('switches to the other gym’s own weight and history', async () => {
    const { supino } = await seedTwoGyms()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}`)

    const modal = await openHistory(user)
    await pickGym(user, modal, 'Academia B')

    await waitFor(() => expect(within(modal).getByText(/só desta academia/i)).toBeInTheDocument())
    expect(within(modal).getByText(/60 KG/)).toBeInTheDocument()
    // B's exception has one entry; A's global has two.
    expect(within(modal).getAllByRole('listitem')).toHaveLength(1)
  })

  it('does not move the card behind it', async () => {
    const { supino } = await seedTwoGyms()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}`)

    const modal = await openHistory(user)
    await pickGym(user, modal, 'Academia B')
    await waitFor(() => expect(within(modal).getByText(/60 KG/)).toBeInTheDocument())

    await user.click(within(modal).getByRole('button', { name: 'Fechar' }))

    // Still gym A's weight on the card: the selector was a lookup, not a move.
    await waitFor(() => expect(within(card()).getByText(/22,5/)).toBeInTheDocument())
    expect(within(card()).queryByText(/60/)).not.toBeInTheDocument()
  })

  it('reopens on the active gym, not on the last one looked at', async () => {
    const { supino } = await seedTwoGyms()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}`)

    let modal = await openHistory(user)
    await pickGym(user, modal, 'Academia B')
    await waitFor(() => expect(within(modal).getByText(/60 KG/)).toBeInTheDocument())
    await user.click(within(modal).getByRole('button', { name: 'Fechar' }))

    modal = await openHistory(user)
    expect(within(modal).getByLabelText('Ver outra academia')).toHaveTextContent('Academia A')
  })

  it('offers no delete while looking at another gym', async () => {
    const { supino } = await seedTwoGyms()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}`)

    const modal = await openHistory(user)
    // Deletable in the gym the screen is about…
    expect(within(modal).getAllByLabelText('Excluir registro').length).toBeGreaterThan(0)

    await pickGym(user, modal, 'Academia B')
    await waitFor(() => expect(within(modal).getByText(/60 KG/)).toBeInTheDocument())

    // …and not in one that is only being looked at.
    expect(within(modal).queryByLabelText('Excluir registro')).not.toBeInTheDocument()
  })

  it('shows no selector when there is only one gym', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    const modal = await openHistory(user)
    expect(within(modal).queryByLabelText('Ver outra academia')).not.toBeInTheDocument()
  })
})
