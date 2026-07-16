import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  completeSession,
  createCategory,
  createDay,
  createExercise,
  createGym,
  saveWeight,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { listSessionEntries } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import type { ShareCard } from './share/shareModel'

// jsdom has no 2D context, so the painter is stubbed — what it *paints* is
// verified manually (see tasks 5.2). What matters here is that the page feeds it
// the right card and routes the result correctly.
const renderCard = vi.hoisted(() =>
  vi.fn(async (_card: unknown) => new Blob(['png'], { type: 'image/png' })),
)
vi.mock('./share/renderCard', () => ({ renderCard }))

const lastCard = () => renderCard.mock.calls.at(-1)![0] as ShareCard

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  renderCard.mockClear()
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

beforeEach(() => {
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
})

/** A completed "Dia 1" in gym "Academia A": Supino Reto (done, 40 KG) + Crucifixo (not done, no target). */
async function seedCompleted() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const peito = await createCategory('Peito', db)
  const supino = await createExercise({ name: 'Supino Reto', categoryId: peito }, db)
  const crucifixo = await createExercise({ name: 'Crucifixo', categoryId: peito }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [supino, crucifixo] }, db)
  await saveWeight(gym, supino, 40, 'KG', db)
  const sessionId = await startSession(gym, day, db)
  const entries = await listSessionEntries(sessionId, db)
  await setEntryDone(entries[0].id!, true, db)
  await completeSession(sessionId, db)
  return { sessionId }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Share a completed session as an image', () => {
  it('offers both share actions on a completed session', async () => {
    const { sessionId } = await seedCompleted()
    renderAt(`/session/${sessionId}`)

    expect(await screen.findByRole('button', { name: /^Compartilhar$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compartilhar sem pesos/ })).toBeInTheDocument()
  })

  it('offers no share action while a session is in progress', async () => {
    const gym = await createGym('Academia A', undefined, db)
    useActiveGym.setState({ activeGymId: gym })
    const ex = await createExercise({ name: 'Supino Reto' }, db)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
    const sessionId = await startSession(gym, day, db)

    renderAt(`/session/${sessionId}`)

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Compartilhar/ })).not.toBeInTheDocument()
  })

  it('builds a detailed card with weights and duration', async () => {
    const { sessionId } = await seedCompleted()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}`)

    await user.click(await screen.findByRole('button', { name: /^Compartilhar$/ }))
    await waitFor(() => expect(renderCard).toHaveBeenCalledOnce())

    const card = lastCard()
    expect(card.title).toBe('Dia 1')
    expect(card.gymName).toBe('Academia A')
    expect(card.doneLabel).toBe('1 de 2 concluídos')
    expect(card.durationLabel).toBeTruthy()
    expect(card.rows.map((r) => r.name)).toEqual(['Supino Reto', 'Crucifixo'])
    expect(card.rows[0].weight).toBe('40 KG')
    // No target for Crucifixo → no badge, and never the "definir" hint.
    expect(card.rows[1].weight).toBeUndefined()
  })

  it('builds a simplified card with neither weights nor duration', async () => {
    const { sessionId } = await seedCompleted()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}`)

    await user.click(await screen.findByRole('button', { name: /Compartilhar sem pesos/ }))
    await waitFor(() => expect(renderCard).toHaveBeenCalledOnce())

    const card = lastCard()
    expect(card.title).toBe('Dia 1')
    expect(card.rows.map((r) => r.name)).toEqual(['Supino Reto', 'Crucifixo'])
    expect(card.rows.every((r) => r.weight === undefined)).toBe(true)
    expect(card.durationLabel).toBeUndefined()
  })

  it('shares through the platform sheet when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })

    const { sessionId } = await seedCompleted()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}`)

    await user.click(await screen.findByRole('button', { name: /^Compartilhar$/ }))
    await waitFor(() => expect(share).toHaveBeenCalledOnce())

    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toMatch(/^myonegym-dia-1-\d{4}-\d{2}-\d{2}\.png$/)
    // The sheet handled it — no "saved" toast.
    expect(screen.queryByText('Imagem salva.')).not.toBeInTheDocument()
  })

  it('falls back to a download and confirms with a toast', async () => {
    Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:fake', configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
    // Spy on the anchor's click rather than on document.createElement — the
    // router renders <a> elements too, and a stub would leak into the tree.
    let downloaded: string | undefined
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      if (this.download) downloaded = this.download
    })

    const { sessionId } = await seedCompleted()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}`)

    await user.click(await screen.findByRole('button', { name: /^Compartilhar$/ }))

    expect(await screen.findByText('Imagem salva.')).toBeInTheDocument()
    expect(downloaded).toMatch(/^myonegym-dia-1-\d{4}-\d{2}-\d{2}\.png$/)
  })

  it('reports an error when the image cannot be generated', async () => {
    renderCard.mockRejectedValueOnce(new Error('boom'))
    const { sessionId } = await seedCompleted()
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}`)

    await user.click(await screen.findByRole('button', { name: /^Compartilhar$/ }))

    expect(await screen.findByText('Não foi possível gerar a imagem.')).toBeInTheDocument()
  })
})
