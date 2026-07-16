import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../../App'
import { db } from '../../../db/db'
import {
  addPhoto,
  createCategory,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  startSession,
} from '../../../db/repos'
import { useActiveGym } from '../../../state/activeGym'

// jsdom can neither decode nor encode an image, so the pipeline is stubbed here.
// The real thing is exercised in a browser (see tasks 5.2); what matters in this
// suite is the wiring: pick → store → render → delete.
const downscalePhoto = vi.hoisted(() =>
  vi.fn(async (_file: unknown) => ({
    bytes: new TextEncoder().encode('fake-jpeg').buffer as ArrayBuffer,
    type: 'image/jpeg',
    width: 1600,
    height: 1200,
  })),
)
vi.mock('./downscale', async (orig) => ({
  ...(await orig<typeof import('./downscale')>()),
  downscalePhoto,
}))

const file = () => new File(['x'], 'machine.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  // jsdom implements neither of these.
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:fake', configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
})

afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
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
      db.exercisePhotos,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seed() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const cat = await createCategory('Peito', db)
  const ex = await createExercise({ name: 'Supino Reto', categoryId: cat }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  return { gym, ex, day }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const openFotoTab = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('tab', { name: 'Foto' }))

describe('Exercise photos', () => {
  it('attaches a photo from the catalog exercise detail', async () => {
    const { gym, ex } = await seed()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await openFotoTab(user)
    expect(screen.getByText(/Nenhuma foto ainda/)).toBeInTheDocument()

    await user.upload(screen.getByTestId('photo-gallery-input'), file())

    expect(await screen.findByText('Foto anexada.')).toBeInTheDocument()
    expect(downscalePhoto).toHaveBeenCalledOnce()
    await waitFor(async () =>
      expect(await db.exercisePhotos.where({ gymId: gym, exerciseId: ex }).count()).toBe(1),
    )
    expect(await screen.findByRole('button', { name: 'Ver foto' })).toBeInTheDocument()
  })

  it('attaches a photo from the session entry detail and shares it with the catalog', async () => {
    const { gym, ex, day } = await seed()
    const sessionId = await startSession(gym, day, db)
    const entry = (await listSessionEntries(sessionId, db))[0]
    const user = userEvent.setup()
    renderAt(`/session/${sessionId}/entry/${entry.id}`)

    await openFotoTab(user)
    await user.upload(screen.getByTestId('photo-camera-input'), file())
    expect(await screen.findByText('Foto anexada.')).toBeInTheDocument()

    // Same (gym, exercise) pair → the catalog detail shows it too.
    cleanup()
    renderAt(`/exercise/${ex}`)
    await openFotoTab(userEvent.setup())
    expect(await screen.findByRole('button', { name: 'Ver foto' })).toBeInTheDocument()
  })

  it('keeps photos isolated per gym', async () => {
    const { ex } = await seed()
    const other = await createGym('Academia B', undefined, db)
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await openFotoTab(user)
    await user.upload(screen.getByTestId('photo-gallery-input'), file())
    expect(await screen.findByRole('button', { name: 'Ver foto' })).toBeInTheDocument()

    // Switch the active gym: the photo belongs to "A", not to this exercise.
    cleanup()
    useActiveGym.setState({ activeGymId: other })
    renderAt(`/exercise/${ex}`)
    await openFotoTab(userEvent.setup())

    expect(await screen.findByText(/Nenhuma foto ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver foto' })).not.toBeInTheDocument()
  })

  it('views a photo full-size and deletes it after confirming', async () => {
    const { gym, ex } = await seed()
    await addPhoto(gym, ex, new TextEncoder().encode('a').buffer as ArrayBuffer, 'image/jpeg', 800, 600, db)
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await openFotoTab(user)
    await user.click(await screen.findByRole('button', { name: 'Ver foto' }))

    const viewer = await screen.findByRole('dialog', { name: 'Foto' })
    expect(within(viewer).getByAltText('Foto do exercício')).toBeInTheDocument()

    await user.click(within(viewer).getByRole('button', { name: /Excluir/ }))
    // Scope to the confirm sheet — the viewer's own "Excluir" is still mounted.
    const confirmSheet = await screen.findByRole('dialog', { name: 'Excluir foto?' })
    await user.click(within(confirmSheet).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Foto excluída.')).toBeInTheDocument()
    await waitFor(async () => expect(await db.exercisePhotos.count()).toBe(0))
  })

  it('reports a failure instead of storing a broken photo', async () => {
    const { ex } = await seed()
    const { PhotoError } = await import('./downscale')
    downscalePhoto.mockRejectedValueOnce(new PhotoError('O arquivo escolhido não é uma imagem.'))
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await openFotoTab(user)
    await user.upload(screen.getByTestId('photo-gallery-input'), file())

    expect(await screen.findByText('O arquivo escolhido não é uma imagem.')).toBeInTheDocument()
    expect(await db.exercisePhotos.count()).toBe(0)
  })

  it('prompts for a gym when none is active', async () => {
    // No gym at all: clearing activeGymId alone wouldn't do it — the app's
    // `reconcile` re-selects the first existing gym on load.
    const ex = await createExercise({ name: 'Supino Reto' }, db)
    useActiveGym.setState({ activeGymId: null })
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await openFotoTab(user)
    expect(await screen.findByText(/Crie ou selecione uma academia/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tirar foto' })).not.toBeInTheDocument()
  })
})
