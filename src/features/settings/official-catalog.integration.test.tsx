import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { officialExercise, officialExercises } from '../../data/officialCatalog'
import { embedLinkLabel } from '../../lib/embedMedia'
import { db } from '../../db/db'
import { createExercise, createGym, saveNote, setAlternatives } from '../../db/repos'
import { GLOBAL_GYM_ID } from '../../db/types'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

/**
 * The official catalog on screen: it is listed beside the user's own exercises,
 * it is marked, and it cannot be edited — while everything the user records
 * *about* it (weight, note, photo) behaves like it does anywhere else.
 */

afterEach(async () => {
  cleanup()
  await Promise.all(
    [db.gyms, db.categories, db.exercises, db.days, db.weights, db.weightHistory, db.exerciseNotes].map(
      (t) => t.clear(),
    ),
  )
  useActiveGym.setState({ activeGymId: null })
})

const OFFICIAL = officialExercises()[0]

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

async function seedGym() {
  useOnboarding.getState().markPromptSeen()
  const gym = await createGym('Academia A', db)
  useActiveGym.setState({ activeGymId: gym })
  return gym
}

/** The list row whose title is this exact name. */
function rowFor(name: string): HTMLElement {
  return screen.getByText(name, { selector: '.row-title' }).closest('.row') as HTMLElement
}

describe('Exercises list — the two sources', () => {
  it('lists both, marks the official one, and offers it no edit or delete', async () => {
    await seedGym()
    await createExercise({ name: 'Supino Caseiro' }, db)
    renderAt('/settings/exercises')

    await screen.findByText('Supino Caseiro')
    const mine = rowFor('Supino Caseiro')
    const official = rowFor(OFFICIAL.name)

    expect(within(official).getByText('Oficial')).toBeInTheDocument()
    expect(within(mine).queryByText('Oficial')).not.toBeInTheDocument()

    // The badge is also the answer to "why can't I edit this one?".
    expect(within(official).queryByLabelText('Editar')).not.toBeInTheDocument()
    expect(within(official).queryByLabelText('Excluir')).not.toBeInTheDocument()
    expect(within(mine).getByLabelText('Editar')).toBeInTheDocument()
    expect(within(mine).getByLabelText('Excluir')).toBeInTheDocument()

    // What it offers instead: a way to look at it.
    expect(within(official).getByLabelText(`Ver ${OFFICIAL.name}`)).toBeInTheDocument()
  })

  it('marks the official ones in the day picker, where the two can be confused', async () => {
    await seedGym()
    // A device that came through the upgrade has its own exercises alongside a
    // catalog that may well carry a similarly named movement.
    await createExercise({ name: 'Supino Caseiro' }, db)
    renderAt('/settings/days/new')

    const official = (await screen.findAllByLabelText(`Adicionar ${OFFICIAL.name}`))[0]
    const row = official.closest('.row') as HTMLElement
    expect(within(row).getByText('Oficial')).toBeInTheDocument()

    const mineRow = screen
      .getByLabelText('Adicionar Supino Caseiro')
      .closest('.row') as HTMLElement
    expect(within(mineRow).queryByText('Oficial')).not.toBeInTheDocument()
  })
})

describe('Official exercise detail', () => {
  it('takes a weight and a note like any other exercise', async () => {
    const gym = await seedGym()
    const user = userEvent.setup()
    renderAt(`/exercise/${OFFICIAL.id}`)

    // The screen says nothing about where the exercise came from: the detail is
    // for looking at the movement and recording against it, and the source only
    // settles a tie between two exercises with the same name — which is a
    // question the lists and pickers ask, not this page.
    expect(await screen.findByRole('heading', { name: OFFICIAL.name })).toBeInTheDocument()
    expect(screen.queryByText(/catálogo do app/)).not.toBeInTheDocument()

    // Weight is the user's, not the catalog's.
    await user.click(await screen.findByRole('button', { name: /Editar|Definir/ }))
    const input = screen.getByLabelText('Peso')
    await user.clear(input)
    await user.type(input, '60')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    await waitFor(async () =>
      expect(await db.weights.where('exerciseId').equals(OFFICIAL.id!).count()).toBe(1),
    )
    const weight = (await db.weights.toArray())[0]
    expect(weight).toMatchObject({ gymId: GLOBAL_GYM_ID, exerciseId: OFFICIAL.id, value: 60 })

    // And so is the note, per gym like any other.
    await saveNote(gym, OFFICIAL.id!, 'banco no 4', db)
    expect((await db.exerciseNotes.toArray())[0]).toMatchObject({
      exerciseId: OFFICIAL.id,
      text: 'banco no 4',
    })
  })

  it('shows a user exercise that declared it as an alternative, from its own side', async () => {
    await seedGym()
    const mine = await createExercise({ name: 'Supino Caseiro' }, db)
    // The link is stored on the user's record alone — the official one has no
    // row to write the back-link to.
    await setAlternatives(mine, [OFFICIAL.id!], db)
    expect((await db.exercises.get(mine))?.alternativeIds).toEqual([OFFICIAL.id])

    renderAt(`/exercise/${OFFICIAL.id}`)

    // Read-time symmetry: the official detail lists it back anyway.
    const section = (await screen.findByText('Alternativas')).closest('section') as HTMLElement
    expect(within(section).getByText('Supino Caseiro')).toBeInTheDocument()
  })
})

describe('Categories list — the two sources', () => {
  it('marks the official ones and offers them no edit or delete', async () => {
    await seedGym()
    renderAt('/settings/categories')

    const official = (await screen.findByText('Peito', { selector: '.row-title' })).closest(
      '.row',
    ) as HTMLElement
    expect(within(official).getByText('Oficial')).toBeInTheDocument()
    expect(within(official).queryByLabelText('Editar')).not.toBeInTheDocument()
    expect(within(official).queryByLabelText('Excluir')).not.toBeInTheDocument()
  })

  it('refuses a new category whose name an official one already has', async () => {
    await seedGym()
    const user = userEvent.setup()
    renderAt('/settings/categories/new')

    await user.type(await screen.findByLabelText('Nome'), 'Peito')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/Já existe a categoria/)).toBeInTheDocument()
    expect(await db.categories.count()).toBe(0)
  })
})

describe('Read-only exercise view', () => {
  it('is where the list sends an official exercise, and it edits nothing', async () => {
    await seedGym()
    const user = userEvent.setup()
    renderAt('/settings/exercises')

    await user.click(await screen.findByLabelText(`Ver ${OFFICIAL.name}`))

    expect(await screen.findByRole('heading', { name: OFFICIAL.name })).toBeInTheDocument()
    // Nothing to change: no fields, no save, no delete. The screen shows the
    // exercise and says nothing about where it came from — the absence of the
    // controls is the whole message.
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Excluir')).not.toBeInTheDocument()
    expect(screen.queryByText(/catálogo do app/)).not.toBeInTheDocument()
    // It does not send the user anywhere either: this screen is for looking.
    expect(screen.queryByRole('link', { name: /Abrir o exercício/ })).not.toBeInTheDocument()
  })

  it('shows the categories, alternatives and videos the exercise came with', async () => {
    await seedGym()
    // Official exercise 1 carries a category, an alternative and no video; 3
    // carries a video. Both are read straight from the bundled file.
    const withAlt = officialExercises().find((e) => (e.alternativeIds ?? []).length > 0)!
    const alt = officialExercise(withAlt.alternativeIds[0])!

    renderAt(`/settings/exercises/${withAlt.id}/view`)

    expect(await screen.findByRole('heading', { name: withAlt.name })).toBeInTheDocument()
    // The alternatives resolve through the merged exercise map, which arrives a
    // tick after the page — waiting is the point, not a workaround.
    expect(await screen.findByText(alt.name)).toBeInTheDocument()
    expect(screen.getByText(withAlt.kind === 'cardio' ? 'Cardio' : 'Força')).toBeInTheDocument()
  })

  it('says so for an id nothing carries', async () => {
    await seedGym()
    renderAt('/settings/exercises/424242/view')

    expect(await screen.findByText('Exercício não encontrado.')).toBeInTheDocument()
  })
})

/**
 * A list of videos you cannot play is a list of strings. The read-only view
 * opens one **over** itself: the user is in Settings looking at an exercise, and
 * watching a video is not leaving that.
 */
describe('Playing a video from the read-only view', () => {
  const withVideos = officialExercises().find((e) => (e.videos ?? []).length > 0)!

  it('opens the clicked video in a modal, and closes back to the same screen', async () => {
    await seedGym()
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${withVideos.id}/view`)

    // The row's label is the video's title, or the provider when it has none —
    // computed here the same way the screen computes it.
    const first = withVideos.videos[0]
    const label = first.title || embedLinkLabel(first.url)
    await user.click(await screen.findByLabelText(`Assistir ${label}`))

    const dialog = await screen.findByRole('dialog', { name: 'Vídeos' })
    expect(within(dialog).getByText(`1 de ${withVideos.videos.length}`)).toBeInTheDocument()

    await user.click(within(dialog).getByLabelText('Fechar'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Back where it was, not navigated away.
    expect(screen.getByRole('heading', { name: withVideos.name })).toBeInTheDocument()
  })

  it('closes on Escape, which a dialog owes the keyboard', async () => {
    await seedGym()
    const user = userEvent.setup()
    renderAt(`/settings/exercises/${withVideos.id}/view`)

    const v = withVideos.videos[0]
    const label = v.title || embedLinkLabel(v.url)
    await user.click(await screen.findByLabelText(`Assistir ${label}`))
    await screen.findByRole('dialog', { name: 'Vídeos' })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('opens on the video that was clicked, not on the first', async () => {
    await seedGym()
    const user = userEvent.setup()
    const mine = await createExercise(
      {
        name: 'Supino Caseiro',
        videos: [
          { url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', title: 'Primeiro' },
          { url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', title: 'Segundo' },
        ],
      },
      db,
    )
    renderAt(`/settings/exercises/${mine}/view`)

    await user.click(await screen.findByLabelText('Assistir Segundo'))

    const dialog = await screen.findByRole('dialog', { name: 'Vídeos' })
    expect(within(dialog).getByText('2 de 2')).toBeInTheDocument()
    // And the rest of the list is still reachable from inside it.
    await user.click(within(dialog).getByLabelText('Próximo'))
    expect(within(dialog).getByText('1 de 2')).toBeInTheDocument()
  })
})

describe('The video list shows the address, and copies it', () => {
  const withVideos = officialExercises().find((e) => (e.videos ?? []).length > 0)!

  it('shows the URL next to the name', async () => {
    await seedGym()
    renderAt(`/settings/exercises/${withVideos.id}/view`)

    const v = withVideos.videos[0]
    expect(await screen.findByText(v.url, { selector: '.video-row-url' })).toBeInTheDocument()
    // The name line is the title, or the provider when the video has none.
    expect(
      screen.getByText(v.title || embedLinkLabel(v.url), { selector: '.video-row-title' }),
    ).toBeInTheDocument()
  })

  it('copies the address to the clipboard', async () => {
    await seedGym()
    // AFTER `setup()`, which installs a clipboard stub of its own — defining it
    // first would only have it overwritten. And `navigator.clipboard` is a
    // getter in jsdom, so it is defined over rather than assigned.
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderAt(`/settings/exercises/${withVideos.id}/view`)

    const v = withVideos.videos[0]
    const label = v.title || embedLinkLabel(v.url)
    await user.click(await screen.findByLabelText(`Copiar link de ${label}`))

    expect(writeText).toHaveBeenCalledWith(v.url)
    expect(await screen.findByText('Link copiado.')).toBeInTheDocument()
  })

  it('says so when the clipboard refuses, instead of doing nothing visible', async () => {
    await seedGym()
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    renderAt(`/settings/exercises/${withVideos.id}/view`)

    const v = withVideos.videos[0]
    await user.click(
      await screen.findByLabelText(`Copiar link de ${v.title || embedLinkLabel(v.url)}`),
    )

    expect(await screen.findByText('Não consegui copiar o link.')).toBeInTheDocument()
  })
})

/**
 * The view walks the list it was opened from. Without it the screen is a dead
 * end: moving one position costs going back, finding your place and tapping
 * again — and the catalog alone is 52 exercises long.
 */
describe('Walking the exercise list from the view', () => {
  // The names the shared stepper already uses — the same control the exercise
  // detail walks a training day with.
  const prev = () => screen.getByRole('button', { name: 'Exercício anterior' })
  const next = () => screen.getByRole('button', { name: 'Próximo exercício' })
  const title = () => screen.getByRole('heading', { level: 1 }).textContent

  /**
   * Open the view and wait for the **walk** to be there.
   *
   * The heading paints from the exercise's own read; the bar needs the whole
   * list, which arrives a tick later. Waiting on the bar is the point of the
   * test, not a workaround for it.
   */
  const openWalking = async (href: string) => {
    renderAt(href)
    await screen.findByRole('button', { name: 'Próximo exercício' }, { timeout: 3000 })
  }

  /** The list as the screen builds it: both sources, by name. */
  const byName = [...officialExercises()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  it('moves to the next exercise and back, without passing through the list', async () => {
    await seedGym()
    const user = userEvent.setup()
    const start = byName[3]
    await openWalking(`/settings/exercises/${start.id}/view`)
    expect(title()).toBe(start.name)

    await user.click(next())
    await waitFor(() => expect(title()).toBe(byName[4].name))

    await user.click(prev())
    await waitFor(() => expect(title()).toBe(start.name))
  })

  it('stays inside the filter it was opened with', async () => {
    await seedGym()
    const user = userEvent.setup()
    const cardios = byName.filter((e) => e.kind === 'cardio')
    expect(cardios.length).toBeGreaterThan(1)

    await openWalking(`/settings/exercises/${cardios[0].id}/view?kind=cardio`)

    await user.click(next())

    // The next one is another cardio — not the alphabetical neighbour it would
    // have been in the unfiltered list.
    await waitFor(() => expect(title()).toBe(cardios[1].name))
  })

  it('stops at the ends rather than wrapping', async () => {
    await seedGym()
    await openWalking(`/settings/exercises/${byName[0].id}/view`)

    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()

    cleanup()
    const last = byName[byName.length - 1]
    await openWalking(`/settings/exercises/${last.id}/view`)

    expect(next()).toBeDisabled()
    expect(prev()).toBeEnabled()
  })

  it('shows no controls for an exercise with no place in the walk', async () => {
    await seedGym()
    // A strength exercise reached with a cardio filter: a shared link, or an
    // alternative opened from inside here.
    const strength = byName.find((e) => e.kind === 'strength')!
    renderAt(`/settings/exercises/${strength.id}/view?kind=cardio`)

    await screen.findByRole('heading', { name: strength.name })
    expect(screen.queryByRole('button', { name: 'Próximo exercício' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exercício anterior' })).not.toBeInTheDocument()
  })

  it('carries the filter through every move, so a reload keeps the walk', async () => {
    await seedGym()
    const user = userEvent.setup()
    const cardios = byName.filter((e) => e.kind === 'cardio')
    await openWalking(`/settings/exercises/${cardios[0].id}/view?kind=cardio`)

    await user.click(next())
    await waitFor(() => expect(title()).toBe(cardios[1].name))

    // Still filtered after the move: the next step is the third cardio, not an
    // alphabetical neighbour.
    await user.click(next())
    await waitFor(() => expect(title()).toBe(cardios[2].name))
  })

  it('opens fine with no filters at all, walking the whole list', async () => {
    await seedGym()
    await openWalking(`/settings/exercises/${byName[1].id}/view`)

    expect(title()).toBe(byName[1].name)
    expect(next()).toBeEnabled()
    expect(prev()).toBeEnabled()
  })

  it('does not refuse to open over an unreadable filter', async () => {
    await seedGym()
    await openWalking(`/settings/exercises/${byName[1].id}/view?cat=abc&kind=voar`)

    // The screen is worth more than one narrowing nobody would miss.
    expect(title()).toBe(byName[1].name)
    expect(next()).toBeEnabled()
  })

  it('reaches the view from the list carrying the active filter', async () => {
    await seedGym()
    const user = userEvent.setup()
    renderAt('/settings/exercises')

    const group = await screen.findByRole('group', { name: 'Tipo' })
    await user.click(within(group).getByRole('button', { name: 'Cardio' }))

    const cardios = byName.filter((e) => e.kind === 'cardio')
    await user.click(await screen.findByLabelText(`Ver ${cardios[0].name}`))

    // Arrived filtered: stepping stays among the cardios.
    await screen.findByRole('button', { name: 'Próximo exercício' }, { timeout: 3000 })
    expect(title()).toBe(cardios[0].name)
    await user.click(next())
    await waitFor(() => expect(title()).toBe(cardios[1].name))
  })
})
