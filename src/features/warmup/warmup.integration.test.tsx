import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createExercise, createGym, createWarmup } from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.warmups].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

/** Three warm-ups: an image, a local video, and a URL with no extension. */
async function seedThree() {
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  const img = await createWarmup({ name: 'Rotação', url: 'https://x.com/a.gif' }, db)
  const vid = await createWarmup({ name: 'Mobilidade', url: 'https://x.com/b.mp4' }, db)
  const plain = await createWarmup({ name: 'Sem extensão', url: 'https://cdn.x.com/abc123' }, db)
  const ex = await createExercise({ name: 'Supino', warmupIds: [img, vid, plain] }, db)
  return { gym, ex, img, vid, plain }
}

describe('Warmups catalogue', () => {
  it('creates one and shows how many exercises use it', async () => {
    const user = userEvent.setup()
    renderAt('/settings/warmups/new')

    await user.type(await screen.findByLabelText('Nome'), 'Rotação de ombro')
    await user.type(screen.getByLabelText(/URL/), 'https://x.com/a.gif')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect(await db.warmups.count()).toBe(1))
    expect(await screen.findByText('Rotação de ombro')).toBeInTheDocument()
    // Nothing links it yet, and the list says so rather than staying silent.
    expect(screen.getByText('Nenhum exercício')).toBeInTheDocument()
  })

  it('tells the user what the URL will become before saving', async () => {
    const user = userEvent.setup()
    renderAt('/settings/warmups/new')

    const url = await screen.findByLabelText(/URL/)
    // Embedded player, local video and plain image behave very differently, and
    // the address alone does not say which one it is.
    await user.type(url, 'https://youtube.com/watch?v=dQw4w9WgXcQ')
    expect(await screen.findByText(/será embutido no visualizador/i)).toBeInTheDocument()

    await user.clear(url)
    await user.type(url, 'https://cdn.x.com/abc123')
    expect(await screen.findByText(/Imagem — será exibida/i)).toBeInTheDocument()
  })

  it('rejects a URL that is not http(s)', async () => {
    const user = userEvent.setup()
    renderAt('/settings/warmups/new')

    await user.type(await screen.findByLabelText('Nome'), 'A')
    await user.type(screen.getByLabelText(/URL/), 'x.com/a.gif')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/URL inválida/)).toBeInTheDocument()
    expect(await db.warmups.count()).toBe(0)
  })

  it('deleting unlinks it from the exercises that used it', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt('/settings/warmups')

    const row = (await screen.findByText('Rotação')).closest('.row') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Excluir' }))
    // The confirmation says how many exercises lose it — not a vague warning.
    expect(await screen.findByText(/sairá de 1 exercício/i)).toBeInTheDocument()
    // Each row has its own Excluir; this one is the sheet's.
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: 'Excluir' }))

    await waitFor(async () => expect(await db.warmups.count()).toBe(2))
    expect((await db.exercises.get(ex))?.warmupIds).toHaveLength(2)
  })
})

describe('Linking warmups to an exercise', () => {
  it('links the same warmup to two exercises, keeping one record', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const w = await createWarmup({ name: 'Rotação', url: 'https://x.com/a.gif' }, db)
    const supino = await createExercise({ name: 'Supino' }, db)
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${supino}/edit`)

    const group = await screen.findByRole('group', { name: 'Aquecimentos' })
    await user.click(within(group).getByRole('button', { name: 'Rotação' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      expect((await db.exercises.get(supino))?.warmupIds).toEqual([w])
    })
    // The record was not copied — it is shared.
    expect(await db.warmups.count()).toBe(1)
  })
})

describe('Warmup viewer', () => {
  it('is not offered when the exercise has none', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const ex = await createExercise({ name: 'Rosca' }, db)
    renderAt(`/exercise/${ex}`)

    expect(await screen.findByRole('heading', { name: 'Rosca' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aquecimento/ })).not.toBeInTheDocument()
  })

  it('pages with the arrows and loops around at both ends', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))

    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })
    const next = within(viewer).getByRole('button', { name: 'Próximo' })
    const prev = within(viewer).getByRole('button', { name: 'Anterior' })
    expect(within(viewer).getByText('1 de 3')).toBeInTheDocument()
    expect(within(viewer).getByText('Rotação')).toBeInTheDocument()
    // Nothing is ever dead: it is a loop, not a line with two ends.
    expect(prev).toBeEnabled()
    expect(next).toBeEnabled()

    await user.click(next)
    expect(within(viewer).getByText('2 de 3')).toBeInTheDocument()
    expect(within(viewer).getByText('Mobilidade')).toBeInTheDocument()

    await user.click(next)
    expect(within(viewer).getByText('3 de 3')).toBeInTheDocument()

    // Past the last comes the first...
    await user.click(next)
    expect(within(viewer).getByText('1 de 3')).toBeInTheDocument()
    expect(within(viewer).getByText('Rotação')).toBeInTheDocument()

    // ...and back from the first comes the last.
    await user.click(prev)
    expect(within(viewer).getByText('3 de 3')).toBeInTheDocument()
  })

  it('floats the arrows over the media instead of beside it', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })

    // They are siblings of the stage, positioned over it — jsdom computes no
    // layout, so what is assertable here is that they are not inside the stage
    // and carry the overlay class. The geometry is checked in the browser.
    const stage = viewer.querySelector('.wu-stage')!
    const arrows = viewer.querySelectorAll('.wu-nav')
    expect(arrows).toHaveLength(2)
    arrows.forEach((a) => expect(stage.contains(a)).toBe(false))
  })

  it('offers no arrows when there is only one warm-up', async () => {
    // A loop of one would be two controls that visibly do nothing.
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const w = await createWarmup({ name: 'Único', url: 'https://x.com/a.gif' }, db)
    const ex = await createExercise({ name: 'Supino', warmupIds: [w] }, db)
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })
    expect(within(viewer).getByText('1 de 1')).toBeInTheDocument()
    expect(within(viewer).queryByRole('button', { name: 'Próximo' })).toBeNull()
    expect(within(viewer).queryByRole('button', { name: 'Anterior' })).toBeNull()
  })

  it('closes back to the exercise it was opened from', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })
    await user.click(within(viewer).getByRole('button', { name: 'Fechar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Supino' })).toBeInTheDocument()
  })

  it('answers the keyboard: arrows page, Escape closes', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })

    await user.keyboard('{ArrowRight}')
    expect(within(viewer).getByText('2 de 3')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(within(viewer).getByText('1 de 3')).toBeInTheDocument()
    // The keyboard loops like the arrows do.
    await user.keyboard('{ArrowLeft}')
    expect(within(viewer).getByText('3 de 3')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows each media kind in its own form', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })

    // 1 — image
    expect(viewer.querySelector('img.wu-media')).toBeTruthy()

    // 2 — video, and deliberately not pre-downloading
    await user.click(within(viewer).getByRole('button', { name: 'Próximo' }))
    const video = viewer.querySelector('video.wu-media') as HTMLVideoElement
    expect(video).toBeTruthy()
    expect(video.getAttribute('preload')).toBe('none')
    expect(video.hasAttribute('autoplay')).toBe(false)

    // 3 — no extension and no known provider: tried as an image rather than
    // pushed out of the app, because that is what such URLs usually are.
    await user.click(within(viewer).getByRole('button', { name: 'Próximo' }))
    expect(viewer.querySelector('iframe')).toBeNull()
    const img = viewer.querySelector('img.wu-media') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('https://cdn.x.com/abc123')
  })

  it('offers the address when the optimistic image turns out not to be one', async () => {
    const { ex } = await seedThree()
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })
    await user.click(within(viewer).getByRole('button', { name: 'Próximo' }))
    await user.click(within(viewer).getByRole('button', { name: 'Próximo' }))

    // jsdom never loads images, so fire what a real failure fires.
    const img = viewer.querySelector('img.wu-media') as HTMLImageElement
    fireEvent.error(img)

    // The guess was wrong, and the user is not left at a dead end.
    expect(await within(viewer).findByText(/Não foi possível exibir/)).toBeInTheDocument()
    const out = within(viewer).getByRole('link', { name: /Abrir cdn\.x\.com/ })
    expect(out).toHaveAttribute('href', 'https://cdn.x.com/abc123')
    expect(out).toHaveAttribute('target', '_blank')
    expect(out).toHaveAttribute('rel', expect.stringContaining('noopener'))
    // Navigation still works from the failure state.
    expect(within(viewer).getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(within(viewer).getByRole('button', { name: 'Próximo' })).toBeEnabled()
  })

  it('gives a Short the tall box, and a normal video the wide one', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const short = await createWarmup(
      { name: 'Short', url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' },
      db,
    )
    const wide = await createWarmup(
      { name: 'Normal', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      db,
    )
    const ex = await createExercise({ name: 'Supino', warmupIds: [short, wide] }, db)
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })

    // A vertical video in a 16:9 box is a thin strip; this one leads with height.
    expect(viewer.querySelector('iframe')!.className).toContain('portrait')

    await user.click(within(viewer).getByRole('button', { name: 'Próximo' }))
    // And a landscape video must NOT be pillarboxed into a tall box.
    expect(viewer.querySelector('iframe')!.className).not.toContain('portrait')
  })

  it('embeds a YouTube warm-up in the viewer instead of sending the user away', async () => {
    const gym = await createGym('Academia A', db)
    useActiveGym.setState({ activeGymId: gym })
    const w = await createWarmup(
      { name: 'Aquecimento guiado', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      db,
    )
    const ex = await createExercise({ name: 'Supino', warmupIds: [w] }, db)
    const user = userEvent.setup()
    renderAt(`/exercise/${ex}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })

    const frame = viewer.querySelector('iframe') as HTMLIFrameElement
    expect(frame).toBeTruthy()
    // The player URL, on the no-cookie host — not the watch page, which refuses
    // to be framed.
    expect(frame.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    // Same rule as the local video: nothing plays or downloads unasked.
    expect(frame.getAttribute('allow') ?? '').not.toContain('autoplay')
    expect(frame.getAttribute('loading')).toBe('lazy')
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin')
    // And the user is not pushed out of the app for it: the player is there, no
    // failure state and no escape hatch offered.
    expect(viewer.querySelector('.wu-failed')).toBeNull()
    expect(within(viewer).queryByRole('link')).toBeNull()
  })

  it('is offered from inside a session too', async () => {
    const { gym, ex } = await seedThree()
    const { createDay, startSession, listSessionEntries } = await import('../../db/repos')
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
    const sid = await startSession(gym, day, db)
    const entry = (await listSessionEntries(sid, db))[0]

    const user = userEvent.setup()
    renderAt(`/session/${sid}/entry/${entry.id}`)

    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const viewer = await screen.findByRole('dialog', { name: 'Aquecimento' })
    expect(within(viewer).getByText('1 de 3')).toBeInTheDocument()

    // Closing must not disturb the workout.
    await user.click(within(viewer).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await db.sessions.get(sid))?.status).toBe('active')
    expect((await listSessionEntries(sid, db))[0].done).toBe(false)
  })
})
