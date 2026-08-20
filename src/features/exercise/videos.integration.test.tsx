import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  createDay,
  createExercise,
  createGym,
  createWarmup,
  listSessionEntries,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

/**
 * The Vídeos tab, end to end: registered inside the exercise form, listed on
 * both exercise details, opened in the shared full-screen viewer.
 *
 * The unit tests already prove the record and the URL handling. What only this
 * level can prove is the wiring — that the form writes to the exercise, that
 * both screens mount the tab, and that tapping the third row opens the third
 * video rather than the first.
 */

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const IG = 'https://www.instagram.com/reel/Cabc123/'

beforeEach(() => {
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.sessions, db.sessionEntries, db.warmups].map((t) =>
      t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

async function seedGym() {
  const gym = await createGym('A', db)
  useActiveGym.setState({ activeGymId: gym })
  return gym
}

describe('registering videos in the exercise form', () => {
  it('adds a video with a label and a range, and persists it on the exercise', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/settings/exercises/${id}/edit`)
    await user.type(await screen.findByLabelText('URL do vídeo'), YT)
    await user.type(screen.getByLabelText('Rótulo do vídeo'), 'pegada fechada')
    await user.type(screen.getByLabelText('Início do trecho'), '2:10')
    await user.type(screen.getByLabelText('Fim do trecho'), '2:45')
    await user.click(screen.getByRole('button', { name: /Adicionar vídeo/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const ex = await db.exercises.get(id)
    expect(ex?.videos).toHaveLength(1)
    // The form speaks clock, the record stores seconds.
    expect(ex?.videos[0]).toMatchObject({ url: YT, title: 'pegada fechada', startSec: 130, endSec: 165 })
  })

  it('hides the range fields for an Instagram URL, and says why', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/settings/exercises/${id}/edit`)
    await user.type(await screen.findByLabelText('URL do vídeo'), IG)

    // A field the player would ignore is a promise the screen cannot keep.
    expect(screen.queryByLabelText('Início do trecho')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Fim do trecho')).not.toBeInTheDocument()
    expect(screen.getByText(/não permite escolher o trecho/)).toBeInTheDocument()
  })

  it('offers the range again once the URL is a YouTube one', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/settings/exercises/${id}/edit`)
    const url = await screen.findByLabelText('URL do vídeo')
    await user.type(url, IG)
    expect(screen.queryByLabelText('Início do trecho')).not.toBeInTheDocument()

    await user.clear(url)
    await user.type(url, YT)
    expect(screen.getByLabelText('Início do trecho')).toBeInTheDocument()
  })

  it('refuses an end at or before the start', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/settings/exercises/${id}/edit`)
    await user.type(await screen.findByLabelText('URL do vídeo'), YT)
    await user.type(screen.getByLabelText('Início do trecho'), '2:00')
    await user.type(screen.getByLabelText('Fim do trecho'), '1:00')
    await user.click(screen.getByRole('button', { name: /Adicionar vídeo/ }))

    expect(screen.getByText(/fim deve ser maior que o início/)).toBeInTheDocument()
    expect((await db.exercises.get(id))?.videos).toEqual([])
  })

  it('reorders and removes, because the order is the paging order', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: YT, title: 'A' }, { url: IG, title: 'B' }] },
      db,
    )

    renderAt(`/settings/exercises/${id}/edit`)
    await user.click(await screen.findByRole('button', { name: 'Mover B para cima' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await db.exercises.get(id))?.videos.map((v) => v.title)).toEqual(['B', 'A'])

    cleanup()
    renderAt(`/settings/exercises/${id}/edit`)
    await user.click(await screen.findByRole('button', { name: 'Remover B' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await db.exercises.get(id))?.videos.map((v) => v.title)).toEqual(['A'])
  })
})

describe('the Vídeos tab is the carousel', () => {
  it('opens straight onto the first video, with no list in front of it', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: YT, title: 'pegada fechada', startSec: 130, endSec: 165 }] },
      db,
    )

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))

    // No tap between the question and the answer: the pager is the tab.
    const pager = screen.getByRole('group', { name: 'Vídeos' })
    expect(within(pager).getByText('pegada fechada · 2:10–2:45')).toBeInTheDocument()
    expect(within(pager).getByText('1 de 1')).toBeInTheDocument()
    expect(screen.queryByLabelText('Vídeos do exercício')).not.toBeInTheDocument()
  })

  it('is not a dialog, and offers nothing to close', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT, title: 'A' }] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))

    // Nothing was opened over the page, so there is nothing to dismiss — and
    // the tab strip stays reachable above it.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Vídeos/, selected: true })).toBeInTheDocument()
  })

  it('pages and wraps', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: YT, title: 'A' }, { url: IG, title: 'B' }] },
      db,
    )

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const pager = screen.getByRole('group', { name: 'Vídeos' })
    expect(within(pager).getByText('A')).toBeInTheDocument()

    await user.click(within(pager).getByRole('button', { name: 'Próximo' }))
    expect(within(pager).getByText('B')).toBeInTheDocument()
    expect(within(pager).getByText('2 de 2')).toBeInTheDocument()
    // Past the last comes the first: a stack of videos has no position in a
    // routine, so looping is the shorter way round.
    await user.click(within(pager).getByRole('button', { name: 'Próximo' }))
    expect(within(pager).getByText('1 de 2')).toBeInTheDocument()
  })

  it('hides the arrows for a single video', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT, title: 'A' }] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const pager = screen.getByRole('group', { name: 'Vídeos' })
    expect(within(pager).getByText('1 de 1')).toBeInTheDocument()
    expect(within(pager).queryByRole('button', { name: 'Próximo' })).not.toBeInTheDocument()
  })

  it('trims the video and opens the player API to loop the segment', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: YT, startSec: 130, endSec: 165 }] },
      db,
    )

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const src = new URL(document.querySelector('iframe')!.getAttribute('src')!)
    expect(src.searchParams.get('start')).toBe('130')
    expect(src.searchParams.get('end')).toBe('165')
    // Not loop=1&playlist: that repeats the VIDEO from zero and drops the trim.
    expect(src.searchParams.get('enablejsapi')).toBe('1')
    expect(src.searchParams.get('loop')).toBeNull()
  })

  it('sends the player back to the START OF THE SEGMENT when it ends', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise(
      { name: 'Supino', videos: [{ url: YT, startSec: 130, endSec: 165 }] },
      db,
    )

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const frame = document.querySelector('iframe') as HTMLIFrameElement

    // jsdom gives the frame no real contentWindow, so stand one in and speak the
    // player's protocol at it — that is the whole contract being asserted.
    const posted: string[] = []
    const fakeWindow = { postMessage: (m: string) => posted.push(m) }
    Object.defineProperty(frame, 'contentWindow', { value: fakeWindow, configurable: true })

    window.dispatchEvent(
      new MessageEvent('message', {
        source: fakeWindow as unknown as Window,
        data: JSON.stringify({ event: 'onStateChange', info: 0 }),
      }),
    )

    const commands = posted.map((m) => JSON.parse(m))
    // 130, not 0 — this is the bug the JS API exists here to fix.
    expect(commands).toContainEqual({ event: 'command', func: 'seekTo', args: [130, true] })
    expect(commands).toContainEqual({ event: 'command', func: 'playVideo', args: [] })
  })

  it('restarts at zero when the video carries no start', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT }] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    const posted: string[] = []
    const fakeWindow = { postMessage: (m: string) => posted.push(m) }
    Object.defineProperty(frame, 'contentWindow', { value: fakeWindow, configurable: true })

    window.dispatchEvent(
      new MessageEvent('message', {
        source: fakeWindow as unknown as Window,
        data: JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }),
      }),
    )
    expect(posted.map((m) => JSON.parse(m))).toContainEqual({
      event: 'command',
      func: 'seekTo',
      args: [0, true],
    })
  })

  it('ignores an ended event from someone else\'s frame', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT, startSec: 130 }] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    const posted: string[] = []
    Object.defineProperty(frame, 'contentWindow', {
      value: { postMessage: (m: string) => posted.push(m) },
      configurable: true,
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        source: { postMessage: () => {} } as unknown as Window,
        data: JSON.stringify({ event: 'onStateChange', info: 0 }),
      }),
    )
    expect(posted).toEqual([])
  })

  it('starts the video on its own, muted, with the frame allowed to', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT }] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const iframe = document.querySelector('iframe')!
    const src = new URL(iframe.getAttribute('src')!)
    // Opening the tab is the asking, so the warm-ups' "do not play before asked"
    // rule has nothing left to protect here.
    expect(src.searchParams.get('autoplay')).toBe('1')
    // Muted is the price: an audible autoplay is simply declined.
    expect(src.searchParams.get('mute')).toBe('1')
    // Without the permission the frame refuses the player's own request.
    expect(iframe.getAttribute('allow')).toMatch(/autoplay/)
  })

  it('leaves the warm-up viewer refusing to autoplay', async () => {
    // The warm-up is reached by a button and must not spend data before it is
    // asked to — the exact rule the videos tab no longer needs.
    const user = userEvent.setup()
    await seedGym()
    const w = await createWarmup({ name: 'Rotação', url: YT }, db)
    const id = await createExercise({ name: 'Supino', warmupIds: [w] }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('button', { name: /Aquecimento/ }))
    const iframe = document.querySelector('iframe')!
    expect(new URL(iframe.getAttribute('src')!).searchParams.get('autoplay')).toBeNull()
    expect(iframe.getAttribute('allow')).not.toMatch(/autoplay/)
  })

  it('shows an empty state, and does not ask for a gym', async () => {
    const user = userEvent.setup()
    // No gym at all: the videos belong to the exercise, not to (gym, exercise).
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/exercise/${id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    expect(screen.getByText('Nenhum vídeo ainda')).toBeInTheDocument()
    expect(screen.queryByText(/academia/i)).not.toBeInTheDocument()
  })

  it('is the same carousel inside a session, and touches nothing there', async () => {
    const user = userEvent.setup()
    const gym = await seedGym()
    const ex = await createExercise(
      { name: 'Supino', videos: [{ url: YT, title: 'A' }, { url: IG, title: 'B' }] },
      db,
    )
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
    const sid = await startSession(gym, day, db)
    const entries = await listSessionEntries(sid, db)

    renderAt(`/session/${sid}/entry/${entries[0].id}`)
    await user.click(await screen.findByRole('tab', { name: /^Vídeos/ }))
    const pager = screen.getByRole('group', { name: 'Vídeos' })
    await user.click(within(pager).getByRole('button', { name: 'Próximo' }))
    expect(within(pager).getByText('B')).toBeInTheDocument()

    // Watching is not doing: nothing is ticked and the stepper has not moved.
    expect((await listSessionEntries(sid, db))[0].done).toBe(false)
  })
})

describe('the notes tab is called "Notas"', () => {
  it('is labelled Notas on both details, and still saves', async () => {
    const user = userEvent.setup()
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/exercise/${id}`)
    expect(await screen.findByRole('tab', { name: 'Notas' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Observações' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Notas' }))
    await user.type(screen.getByLabelText('Notas'), 'banco no furo 3')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))
    expect((await db.exerciseNotes.toArray())[0]?.text).toBe('banco no furo 3')
  })
})

describe('the tab strip counts what is behind each tab', () => {
  it('numbers Vídeos and Foto on the catalogue detail', async () => {
    const gym = await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT }, { url: IG }] }, db)
    await db.exercisePhotos.add({
      gymId: gym,
      exerciseId: id,
      bytes: new ArrayBuffer(8),
      type: 'image/jpeg',
      width: 10,
      height: 10,
      createdAt: Date.now(),
    })

    renderAt(`/exercise/${id}`)
    expect(await screen.findByRole('tab', { name: 'Vídeos (2)' })).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Foto (1)' })).toBeInTheDocument()
  })

  it('shows no number on an empty tab', async () => {
    // "Vídeos (0)" spends width to say the tab is empty, which opening it says
    // better — the same call the warm-up button and Alternativas already make.
    await seedGym()
    const id = await createExercise({ name: 'Supino' }, db)

    renderAt(`/exercise/${id}`)
    expect(await screen.findByRole('tab', { name: 'Vídeos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Foto' })).toBeInTheDocument()
  })

  it('leaves the tabs that count nothing alone', async () => {
    await seedGym()
    const id = await createExercise({ name: 'Supino', videos: [{ url: YT }] }, db)

    renderAt(`/exercise/${id}`)
    expect(await screen.findByRole('tab', { name: 'Detalhe' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notas' })).toBeInTheDocument()
  })

  it('counts inside a session too, following the exercise shown', async () => {
    const gym = await seedGym()
    const ex = await createExercise({ name: 'Supino', videos: [{ url: YT }, { url: IG }] }, db)
    const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
    const sid = await startSession(gym, day, db)
    const entries = await listSessionEntries(sid, db)

    renderAt(`/session/${sid}/entry/${entries[0].id}`)
    expect(await screen.findByRole('tab', { name: 'Vídeos (2)' })).toBeInTheDocument()
  })
})
