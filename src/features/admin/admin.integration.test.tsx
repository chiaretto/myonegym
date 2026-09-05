import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createExercise } from '../../db/repos'
import { useOnboarding } from '../../state/onboarding'
import type { AdminCatalog } from './adminClient'

/**
 * The catalog maintenance screen, end to end against a faked API.
 *
 * `fetch` is the seam: the real other side is a Vite plugin that rewrites
 * `officialCatalog.json` and runs sharp, which is exactly what a test must not
 * do. What is worth checking here is that the screen sends what the maintainer
 * meant, shows what came back, and — the part that is easy to get wrong quietly
 * — never lets an exercise be deleted without saying what deleting means.
 */

let catalog: AdminCatalog
let calls: { method: string; path: string; body: unknown }[]
/** Set to make the next write answer with a refusal, the way the API does. */
let refuseWith: string | null = null
/** Set to make a save answer "saved, but the picture did not come down". */
let warnWith: string | null = null

function seed(): AdminCatalog {
  return {
    categories: [
      { id: 1, name: 'Peitoral' },
      { id: 2, name: 'Dorsais' },
    ],
    exercises: [
      {
        id: 1,
        name: 'Supino Reto',
        kind: 'strength',
        categoryIds: [1],
        alternativeIds: [],
        videos: [],
        mediaFile: 'supino-reto.webp',
      },
      {
        id: 11,
        name: 'Barra Fixa',
        kind: 'strength',
        categoryIds: [2],
        alternativeIds: [],
        videos: [],
      },
    ],
    retiredCategoryIds: [],
    retiredExerciseIds: [10],
  }
}

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
  catalog = seed()
  calls = []
  refuseWith = null
  warnWith = null

  vi.stubGlobal('fetch', async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    calls.push({ method, path, body })

    if (method === 'GET') return Response.json(catalog)
    if (refuseWith) return Response.json({ error: refuseWith }, { status: 400 })

    // A crude stand-in for the real handlers: enough for the screen to have
    // something to re-render from, since every write answers with the file.
    if (path === '/api/admin/catalog/exercise') {
      const at = catalog.exercises.findIndex((e) => e.id === body.id)
      const id = body.id ?? 12
      const saved = { ...body, id, mediaFile: catalog.exercises[at]?.mediaFile }
      if (at >= 0) catalog.exercises[at] = saved
      else catalog.exercises.push(saved)
      return Response.json({ catalog, id, ...(warnWith ? { warning: warnWith } : {}) })
    }
    if (path === '/api/admin/catalog/category') {
      const at = catalog.categories.findIndex((c) => c.id === body.id)
      if (at >= 0) catalog.categories[at] = { id: body.id, name: body.name }
      else catalog.categories.push({ id: 3, name: body.name })
      return Response.json({ catalog })
    }
    if (path.startsWith('/api/admin/catalog/exercise/')) {
      const id = Number(path.split('/').pop())
      catalog.exercises = catalog.exercises.filter((e) => e.id !== id)
      catalog.retiredExerciseIds = [...(catalog.retiredExerciseIds ?? []), id]
      return Response.json({ catalog })
    }
    if (path.startsWith('/api/admin/catalog/category/')) {
      const id = Number(path.split('/').pop())
      catalog.categories = catalog.categories.filter((c) => c.id !== id)
      return Response.json({ catalog })
    }
    return Response.json({ error: 'Rota desconhecida.' }, { status: 404 })
  })
})

afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  await Promise.all([db.exercises, db.categories].map((t) => t.clear()))
})

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <App />
    </MemoryRouter>,
  )
}

/** One of the two panels, so a name can be looked up where it belongs: category
 *  names also appear as options in the exercise filter. */
const panel = (name: 'Categorias' | 'Exercícios') => screen.getByRole('region', { name })

/** Open one exercise's form and hand back a scope limited to it. */
async function openExercise(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = (await screen.findByRole('button', { name: new RegExp(name) })).closest(
    '.admin-item',
  ) as HTMLElement
  await user.click(within(row).getByRole('button', { name: new RegExp(name) }))
  return row
}

describe('the admin screen', () => {
  it('lists what the file holds, and nothing the user created', async () => {
    // The user's own exercises live in the database and have their own screens;
    // this file does not contain them and the tool must not invent them.
    await createExercise({ name: 'Meu exercício' }, db)
    renderAdmin()

    expect(await screen.findByText('Supino Reto')).toBeInTheDocument()
    expect(within(panel('Exercícios')).getByText('Barra Fixa')).toBeInTheDocument()
    expect(within(panel('Categorias')).getByText('Peitoral')).toBeInTheDocument()
    expect(screen.queryByText('Meu exercício')).not.toBeInTheDocument()
  })

  it('says so plainly when the dev server is not there', async () => {
    // Opened from the phone, or from a production build: the API is not
    // reachable, and a blank screen would leave the maintainer guessing.
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('failed to fetch')
    })
    renderAdmin()
    expect(await screen.findByText(/Sem resposta do servidor/)).toBeInTheDocument()
  })

  it('sends the whole exercise when one is saved', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.clear(within(row).getByLabelText('Nome'))
    await user.type(within(row).getByLabelText('Nome'), 'Supino Reto com Barra')
    await user.selectOptions(within(row).getByLabelText('Tipo'), 'cardio')
    await user.click(within(row).getByLabelText('Dorsais'))
    await user.click(within(row).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('Salvo.'))
    expect(calls.at(-1)).toMatchObject({
      method: 'PUT',
      path: '/api/admin/catalog/exercise',
      body: {
        id: 1,
        name: 'Supino Reto com Barra',
        kind: 'cardio',
        categoryIds: [1, 2],
      },
    })
  })

  it('sends the image address as an instruction, and clears it once carried out', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Barra Fixa')

    const media = within(row).getByLabelText('Imagem')
    await user.type(media, 'https://x.test/barra.gif')
    await user.click(within(row).getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(calls.at(-1)?.body).toMatchObject({ mediaUrl: 'https://x.test/barra.gif' }),
    )
    // It is not a stored field — leaving it filled would read as one that never
    // matches the catalog.
    await waitFor(() => expect(media).toHaveValue(''))
  })

  it('keeps the edit and reports the failure when the picture does not come down', async () => {
    warnWith = 'Não consegui baixar a imagem: HTTP 404'
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Barra Fixa')

    await user.type(within(row).getByLabelText('Imagem'), 'https://x.test/morto.gif')
    await user.click(within(row).getByRole('button', { name: 'Salvar' }))

    expect(await within(row).findByRole('status')).toHaveTextContent('HTTP 404')
  })

  it('shows the refusal instead of pretending the save worked', async () => {
    refuseWith = 'Já existe o exercício "Barra Fixa".'
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.click(within(row).getByRole('button', { name: 'Salvar' }))
    expect(await within(row).findByRole('status')).toHaveTextContent('Já existe o exercício')
  })

  it('adds an exercise with the id the API decides, never one the screen picks', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.click(await screen.findByRole('button', { name: /Novo exercício/ }))
    await user.type(screen.getByLabelText('Nome'), 'Remada Curvada')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.getByText('Remada Curvada')).toBeInTheDocument())
    // The screen sends no id at all: handing one out is the API's job, and it
    // is the only side that knows which numbers are spent.
    expect(calls.at(-1)?.body).not.toHaveProperty('id')
  })

  it('will not delete an exercise without saying what deleting means', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Barra Fixa')
    await user.click(within(row).getByRole('button', { name: 'Excluir' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/id 11 fica vago para sempre/)
    expect(dialog).toHaveTextContent(/deixam de resolver/)

    // Backing out changes nothing — no request goes out at all.
    await user.click(within(dialog).getByRole('button', { name: /Cancelar|Voltar/ }))
    expect(calls.filter((c) => c.method === 'DELETE')).toEqual([])
    expect(screen.getByText('Barra Fixa')).toBeInTheDocument()
  })

  it('deletes once the warning has been accepted', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Barra Fixa')
    await user.click(within(row).getByRole('button', { name: 'Excluir' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.queryByText('Barra Fixa')).not.toBeInTheDocument())
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/api/admin/catalog/exercise/11' })
  })

  it('creates, renames and deletes a category', async () => {
    const user = userEvent.setup()
    renderAdmin()

    await user.click(await screen.findByRole('button', { name: /Nova categoria/ }))
    await user.type(screen.getByLabelText('Nome'), 'Ombros')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(within(panel('Categorias')).getByText('Ombros')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Editar Ombros' }))
    await user.clear(screen.getByLabelText('Nome de Ombros'))
    await user.type(screen.getByLabelText('Nome de Ombros'), 'Deltoides')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(within(panel('Categorias')).getByText('Deltoides')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Excluir Deltoides' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/id fica vago para sempre/)
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))
    await waitFor(() =>
      expect(within(panel('Categorias')).queryByText('Deltoides')).not.toBeInTheDocument(),
    )
  })

  it('narrows the list by name, because the catalog outgrows one screen', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.type(await screen.findByLabelText('Buscar exercício'), 'barra')

    expect(screen.getByText('Barra Fixa')).toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('narrows it by category, and can ask for the ones with none', async () => {
    catalog.exercises.push({
      id: 20,
      name: 'Órfão',
      kind: 'strength',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    const user = userEvent.setup()
    renderAdmin()
    const filter = await screen.findByLabelText('Filtrar por categoria')

    await user.selectOptions(filter, 'Peitoral')
    expect(screen.getByText('Supino Reto')).toBeInTheDocument()
    expect(within(panel('Exercícios')).queryByText('Barra Fixa')).not.toBeInTheDocument()

    // An exercise with no category shows up nowhere the app groups by one, so
    // finding those is the point of the filter, not an afterthought.
    await user.selectOptions(filter, 'Sem categoria')
    expect(screen.getByText('Órfão')).toBeInTheDocument()
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument()
  })

  it('narrows it by kind, treating an unset kind as strength', async () => {
    catalog.exercises.push({
      id: 21,
      name: 'Corrida',
      kind: 'cardio',
      categoryIds: [],
      alternativeIds: [],
      videos: [],
    })
    // No `kind` at all — what an exercise was before the field existed.
    catalog.exercises.push({ id: 22, name: 'Antigo', categoryIds: [], alternativeIds: [] })
    const user = userEvent.setup()
    renderAdmin()
    const filter = await screen.findByLabelText('Filtrar por tipo')

    await user.selectOptions(filter, 'Cardio')
    expect(screen.getByText('Corrida')).toBeInTheDocument()
    expect(screen.queryByText('Antigo')).not.toBeInTheDocument()

    await user.selectOptions(filter, 'Força')
    expect(screen.getByText('Antigo')).toBeInTheDocument()
    expect(screen.queryByText('Corrida')).not.toBeInTheDocument()
  })

  it('says so when nothing matches, instead of showing an empty box', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await user.type(await screen.findByLabelText('Buscar exercício'), 'zzz')
    expect(screen.getByText('Nenhum exercício com esse filtro.')).toBeInTheDocument()
  })

  it('shows the picture on the form, at the size the app gives it', async () => {
    const user = userEvent.setup()
    renderAdmin()

    // The 44px row thumbnail cannot tell a good conversion from a cropped one,
    // or from an animation flattened to a still frame.
    const withImage = await openExercise(user, 'Supino Reto')
    expect(within(withImage).getByRole('img', { name: 'Supino Reto' })).toHaveAttribute(
      'src',
      expect.stringContaining('exercises/supino-reto.webp'),
    )
    expect(withImage).toHaveTextContent('supino-reto.webp')

    // An exercise with no picture gets the empty card, not a broken image.
    const without = await openExercise(user, 'Barra Fixa')
    expect(within(without).queryByRole('img')).not.toBeInTheDocument()
    expect(without).toHaveTextContent('Sem imagem')
  })

  it('leaves every other picture’s address alone, so the list does not re-fetch', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    const others = () =>
      screen
        .getAllByRole('img', { hidden: true })
        .map((i) => i.getAttribute('src'))
        .filter((src) => src && !src.includes('supino-reto'))
    const before = others()

    await user.type(within(row).getByLabelText('Imagem'), 'https://x.test/novo.gif')
    await user.click(within(row).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('Salvo.'))

    // One shared cache-buster changed the address of all fifty thumbnails, so
    // saving one exercise made the browser re-fetch the whole list. That is
    // what read as the screen reloading.
    expect(others()).toEqual(before)
  })

  it('asks for the picture afresh after a save, instead of the cached old one', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    const hero = () => within(row).getByRole('img', { name: 'Supino Reto' })
    const before = hero().getAttribute('src')

    await user.type(within(row).getByLabelText('Imagem'), 'https://x.test/novo.gif')
    await user.click(within(row).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('Salvo.'))

    // A replaced picture keeps its file name — the name comes from the exercise
    // — so without a fresh URL the browser shows the one just replaced.
    await waitFor(() => expect(hero().getAttribute('src')).not.toBe(before))
  })

  it('previews the address as it is typed, in the picture’s own place', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.type(within(row).getByLabelText('Imagem'), 'https://x.test/novo.gif')
    const preview = within(row).getByRole('img', { name: 'Pré-visualização da URL' })
    // Straight from the source: what the conversion does to it is settled, and
    // whether it is the right picture is the part only eyes can answer.
    expect(preview).toHaveAttribute('src', 'https://x.test/novo.gif')
    expect(row).toHaveTextContent(/baixada e convertida ao salvar/)
  })

  it('does not call a picture wrong just because the page could not load it', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.type(within(row).getByLabelText('Imagem'), 'https://x.test/bloqueado.gif')
    fireEvent.error(within(row).getByRole('img', { name: 'Pré-visualização da URL' }))

    // Several of these hosts refuse a bare browser request but answer the
    // download, which sends a browser-ish user agent.
    expect(row).toHaveTextContent(/ainda pode funcionar/)
  })

  it('saves as a new exercise without touching the one on screen', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.clear(within(row).getByLabelText('Nome'))
    await user.type(within(row).getByLabelText('Nome'), 'Supino Reto Máquina')
    await user.click(within(row).getByRole('button', { name: 'Salvar novo' }))

    await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('id 12'))
    // No id goes out — that is what makes it new, and the API is the only side
    // that knows which numbers are spent. It names the source so the copy
    // inherits the picture instead of starting blank.
    expect(calls.at(-1)?.body).toMatchObject({
      name: 'Supino Reto Máquina',
      copyMediaFrom: 1,
    })
    expect(calls.at(-1)?.body).not.toHaveProperty('id')
    // The original is still there, under its own name.
    expect(within(panel('Exercícios')).getByText('Supino Reto')).toBeInTheDocument()
  })

  it('closes the form without writing anything when Cancelar is used', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    await user.clear(within(row).getByLabelText('Nome'))
    await user.type(within(row).getByLabelText('Nome'), 'Descartado')
    await user.click(within(row).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByLabelText('Imagem')).not.toBeInTheDocument())
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([])
    expect(within(panel('Exercícios')).getByText('Supino Reto')).toBeInTheDocument()
  })

  it('filters the alternatives, but never hides one that is already ticked', async () => {
    const user = userEvent.setup()
    renderAdmin()
    const row = await openExercise(user, 'Supino Reto')

    const alts = within(row).getByRole('group', { name: 'Alternativas' })
    await user.click(within(alts).getByLabelText('Barra Fixa'))

    await user.type(within(row).getByLabelText('Filtrar alternativas'), 'zzz')
    // Filtering a ticked box out of view reads as having unticked it, and the
    // next save would silently drop a link nobody touched.
    expect(within(alts).getByLabelText('Barra Fixa')).toBeChecked()

    await user.click(within(row).getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(calls.at(-1)?.body).toMatchObject({ alternativeIds: [11] }))
  })
})
