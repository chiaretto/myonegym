import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
 * Editing the target weight opens a **popup anchored to the top**, rather than
 * growing the card in place.
 *
 * CHANGED: the card used to expand — stepper, units, "Só nessa academia",
 * Cancelar/Salvar — and it sits below the media, so the actions ended up under
 * the fixed bar: the user typed a weight and could not see where to save it.
 * That was patched with a scroll-to-top, which fought the input's autofocus and
 * still left the page jumping. A popup takes the problem away instead of
 * chasing it.
 *
 * Top, not bottom: the field is typed into, and the keyboard claims the lower
 * half of the screen.
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

const editor = () => screen.getByRole('dialog', { name: 'Peso alvo' })
const openEditor = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /Editar|Definir/ }, { timeout: 3000 }))
  return editor()
}

describe('Editing the weight opens a popup at the top', () => {
  it('opens as a dialog anchored to the top, with the whole form inside it', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    // Nothing open until asked: the screen answers "how much do I lift" first.
    expect(screen.queryByRole('dialog')).toBeNull()

    const dialog = await openEditor(user)
    expect(dialog.closest('.sheet-backdrop')).toHaveClass('top')

    // Everything the card used to grow to hold is in here.
    expect(within(dialog).getByLabelText('Peso')).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'Unidade' })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /Só nessa academia/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Salvar/ })).toBeInTheDocument()
  })

  it('leaves the card readable behind it, and puts the value back on it after saving', async () => {
    const { supino, day } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    const dialog = await openEditor(user)
    const input = within(dialog).getByLabelText('Peso')
    await user.clear(input)
    await user.type(input, '42.5')
    await user.click(within(dialog).getByRole('button', { name: /Salvar/ }))

    // The popup goes; the card behind it carries the answer.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Peso alvo' })).toBeNull())
    const card = document.querySelector('.weight-card') as HTMLElement
    expect(await within(card).findByText(/42,5/)).toBeInTheDocument()
  })

  it('cancels without saving, and closes on Escape too', async () => {
    const { gym, supino, day } = await seed()
    await saveWeight(gym, supino, 20, 'KG', 'global', db)
    const user = userEvent.setup()
    renderAt(`/exercise/${supino}?day=${day}`)

    let dialog = await openEditor(user)
    await user.clear(within(dialog).getByLabelText('Peso'))
    await user.type(within(dialog).getByLabelText('Peso'), '99')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Peso alvo' })).toBeNull())
    expect((await db.weights.toArray())[0].value).toBe(20)

    dialog = await openEditor(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Peso alvo' })).toBeNull())
    expect((await db.weights.toArray())[0].value).toBe(20)
  })

  it('does the same from the in-session detail — the editor is one component', async () => {
    const { gym, day } = await seed()
    const sessionId = await startSession(gym, day, db)
    const entries = await listSessionEntries(sessionId, db)
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entries[0].id}`)

    const dialog = await openEditor(user)
    expect(dialog.closest('.sheet-backdrop')).toHaveClass('top')
    expect(within(dialog).getByLabelText('Peso')).toBeInTheDocument()
  })

  it('opens nothing while the card is only being read', async () => {
    const { supino, day } = await seed()
    renderAt(`/exercise/${supino}?day=${day}`)

    await screen.findByRole('button', { name: /Editar|Definir/ }, { timeout: 3000 })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
