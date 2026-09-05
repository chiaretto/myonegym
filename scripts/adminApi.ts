/**
 * The API behind `/admin`, served by the **dev server only**.
 *
 * The app is a static PWA: the browser cannot write `src/data/officialCatalog.json`
 * and cannot run sharp. So the screen that edits the official catalog talks to
 * this, which lives where the repository lives. That is not a workaround — it is
 * what the feature is. It edits the repo, not a user's data, and its undo is
 * `git checkout`.
 *
 * `apply: 'serve'` keeps every line of it out of the build. Nothing here ships.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  convertMaster,
  copyMedia,
  downloadMaster,
  readCatalog,
  removeMedia,
  renameMedia,
  slugsByExercise,
  sweepServed,
  writeCatalog,
  type Catalog,
  type CatalogExercise,
} from './exerciseMedia.mjs'

/**
 * The first id that belongs to a **user's** record; everything below it is the
 * official catalog's.
 *
 * Copied rather than imported: `src/data/officialCatalog.ts` reads
 * `import.meta.env.BASE_URL` while it builds its frozen arrays, which is a Vite
 * thing and throws under plain Node — where this file runs. `adminApi.test.ts`
 * asserts the two never drift apart.
 */
export const USER_ID_BASE = 10000

/** Thrown for a request the tool refuses; the message is shown to the user. */
export class AdminError extends Error {}

/**
 * Whether the request came from the machine running the server.
 *
 * The first thing every route checks, and the reason it exists: the dev server
 * runs with `host: true`, exposed on the LAN so the PWA can be opened from a
 * phone. This API **writes files into the repository** and **fetches arbitrary
 * URLs**. Without this, any device on that network — and any page open on one —
 * reaches both.
 */
export function fromLocalhost(address: string | undefined): boolean {
  // `::ffff:127.0.0.1` is how an IPv4 loopback arrives on a dual-stack socket.
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/**
 * The next id for a new record: the highest **ever** used plus one.
 *
 * Not the first gap. An id ties the weight somebody already recorded to the
 * movement they did, so one that has been handed out must never come back —
 * which is what `retiredIds` is for: deleting the record erases the only other
 * trace that its number was spent.
 */
export function nextId(used: number[], retired: number[]): number {
  const next = Math.max(0, ...used, ...retired) + 1
  if (next >= USER_ID_BASE) {
    throw new AdminError(`A faixa oficial de ids acabou — ${USER_ID_BASE} em diante é do usuário.`)
  }
  return next
}

/**
 * Make `id`'s alternatives symmetric across the catalog.
 *
 * The rule `setAlternatives` already maintains in the app: declaring B an
 * alternative of A declares A an alternative of B, so the pair is stated once,
 * from whichever side is being edited. Deliberately not transitive — A may list
 * both B and C without B and C becoming alternatives of each other.
 */
export function mirrorAlternatives(exercises: CatalogExercise[], id: number): void {
  const self = exercises.find((e) => e.id === id)
  if (!self) return
  const wanted = new Set((self.alternativeIds ?? []).filter((x) => x !== id))
  self.alternativeIds = [...wanted].sort((a, b) => a - b)

  for (const other of exercises) {
    if (other.id === id) continue
    const peers = new Set(other.alternativeIds ?? [])
    if (wanted.has(other.id)) peers.add(id)
    else peers.delete(id)
    other.alternativeIds = [...peers].sort((a, b) => a - b)
  }
}

/**
 * Move every picture whose slug changed, and tell the catalog its new name.
 *
 * Renaming one exercise can rename another's file: two names that slug the same
 * both get an id suffix, and removing one of them takes the suffix off the
 * survivor. So this compares the whole slug map before and after, rather than
 * looking only at the exercise that was edited.
 */
export function reslug(catalog: Catalog, before: Map<number, string>): Map<number, string> {
  const after = slugsByExercise(catalog.exercises)
  for (const ex of catalog.exercises) {
    const to = after.get(ex.id)
    if (!to) continue
    // Where the picture actually is *now*. What the catalog points at wins over
    // what the old name would have slugged to: the two can disagree (a
    // hand-edited entry, a file from an older naming), and it is the served copy
    // that has to be found and moved — a name it no longer answers to would
    // leave the exercise pointing at nothing.
    const from = ex.mediaFile?.replace(/\.webp$/, '') ?? before.get(ex.id)
    if (!from || from === to) continue
    renameMedia(from, to)
    if (ex.mediaFile) ex.mediaFile = `${to}.webp`
  }
  return after
}

/** Validate and normalise what the screen sent for one exercise. */
function cleanExercise(input: Partial<CatalogExercise>, catalog: Catalog): CatalogExercise {
  const name = String(input.name ?? '').trim()
  if (!name) throw new AdminError('Informe o nome do exercício.')

  const clash = catalog.exercises.find(
    (e) => e.name.toLowerCase() === name.toLowerCase() && e.id !== input.id,
  )
  if (clash) throw new AdminError(`Já existe o exercício "${clash.name}".`)

  const knownCategories = new Set(catalog.categories.map((c) => c.id))
  const knownExercises = new Set(catalog.exercises.map((e) => e.id))
  const id = input.id ?? nextId([...knownExercises], catalog.retiredExerciseIds ?? [])
  if (input.id != null && !knownExercises.has(input.id)) {
    throw new AdminError('Exercício não encontrado.')
  }

  return {
    id,
    name,
    kind: input.kind === 'cardio' ? 'cardio' : 'strength',
    // A reference to something that is not there is dropped rather than written:
    // it would surface as an exercise quietly missing a category.
    categoryIds: (input.categoryIds ?? []).filter((c) => knownCategories.has(c)),
    alternativeIds: (input.alternativeIds ?? []).filter((a) => a !== id && knownExercises.has(a)),
    videos: (input.videos ?? [])
      .map((v) => ({
        url: String(v.url ?? '').trim(),
        ...(v.title?.trim() ? { title: v.title.trim() } : {}),
        ...(v.startSec !== undefined ? { startSec: v.startSec } : {}),
        ...(v.endSec !== undefined ? { endSec: v.endSec } : {}),
      }))
      .filter((v) => /^https?:\/\//i.test(v.url)),
  }
}

/**
 * Save one exercise, picture and all.
 *
 * Saving in two places — the record here, the image by a command there — is
 * exactly the step that gets forgotten, and forgetting it is invisible: the
 * exercise ends up with no picture and nothing complains.
 *
 * A download that fails does **not** lose the save. The exercise is written
 * without a new picture — the catalog already allows one with none, and every
 * screen already renders that — and the failure comes back as a warning.
 */
export async function saveExercise(
  input: Partial<CatalogExercise> & { mediaUrl?: string; copyMediaFrom?: number },
): Promise<{ catalog: Catalog; id: number; warning?: string }> {
  const catalog = readCatalog()
  const slugsBefore = slugsByExercise(catalog.exercises)
  const clean = cleanExercise(input, catalog)

  const at = catalog.exercises.findIndex((e) => e.id === clean.id)
  // Carry the picture over: only a new URL replaces it.
  clean.mediaFile = at >= 0 ? catalog.exercises[at].mediaFile : undefined
  if (at >= 0) catalog.exercises[at] = clean
  else catalog.exercises.push(clean)

  mirrorAlternatives(catalog.exercises, clean.id)
  const base = reslug(catalog, slugsBefore).get(clean.id)!

  let warning: string | undefined
  const url = String(input.mediaUrl ?? '').trim()
  if (url) {
    try {
      clean.mediaFile = await convertMaster(await downloadMaster(url, base), base)
    } catch (err) {
      warning = `Não consegui baixar a imagem: ${err instanceof Error ? err.message : String(err)}`
    }
  } else if (at < 0 && input.copyMediaFrom != null) {
    // Saved as a new exercise: it is a variant of the one that was on screen,
    // so it inherits that one's picture. Starting it blank would be a surprise
    // rather than a decision — and the original keeps its own copy.
    const source = slugsBefore.get(input.copyMediaFrom)
    const master = source && copyMedia(source, base)
    if (master) clean.mediaFile = await convertMaster(master, base)
  }

  // The served file is named after the exercise, always: whether it was
  // renamed, downloaded fresh or inherited by a copy, this is the one name it
  // may have. Stated once here rather than trusted at each of those branches.
  if (clean.mediaFile) clean.mediaFile = `${base}.webp`

  sweepServed(catalog)
  writeCatalog(catalog)
  return { catalog, id: clean.id, warning }
}

export function deleteExercise(id: number): Catalog {
  const catalog = readCatalog()
  const slugsBefore = slugsByExercise(catalog.exercises)
  const at = catalog.exercises.findIndex((e) => e.id === id)
  if (at < 0) throw new AdminError('Exercício não encontrado.')

  // Unlink first, while the record is still there to say who its peers are.
  catalog.exercises[at].alternativeIds = []
  mirrorAlternatives(catalog.exercises, id)
  catalog.exercises.splice(at, 1)

  removeMedia(slugsBefore.get(id)!)
  reslug(catalog, slugsBefore)
  // The number is spent. Nothing else remembers that once the record is gone.
  catalog.retiredExerciseIds = [...new Set([...(catalog.retiredExerciseIds ?? []), id])].sort(
    (a, b) => a - b,
  )

  sweepServed(catalog)
  writeCatalog(catalog)
  return catalog
}

export function saveCategory(input: { id?: number; name?: string }): Catalog {
  const catalog = readCatalog()
  const name = String(input.name ?? '').trim()
  if (!name) throw new AdminError('Informe o nome da categoria.')

  const clash = catalog.categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== input.id,
  )
  if (clash) throw new AdminError(`Já existe a categoria "${clash.name}".`)

  if (input.id != null) {
    const at = catalog.categories.findIndex((c) => c.id === input.id)
    if (at < 0) throw new AdminError('Categoria não encontrada.')
    catalog.categories[at] = { id: input.id, name }
  } else {
    const id = nextId(
      catalog.categories.map((c) => c.id),
      catalog.retiredCategoryIds ?? [],
    )
    catalog.categories.push({ id, name })
  }

  writeCatalog(catalog)
  return catalog
}

export function deleteCategory(id: number): Catalog {
  const catalog = readCatalog()
  const at = catalog.categories.findIndex((c) => c.id === id)
  if (at < 0) throw new AdminError('Categoria não encontrada.')

  catalog.categories.splice(at, 1)
  // Nothing may reference a category that is gone.
  for (const ex of catalog.exercises) {
    ex.categoryIds = (ex.categoryIds ?? []).filter((c) => c !== id)
  }
  catalog.retiredCategoryIds = [...new Set([...(catalog.retiredCategoryIds ?? []), id])].sort(
    (a, b) => a - b,
  )

  writeCatalog(catalog)
  return catalog
}

/** Route one admin request. Exported so the routing can be tested without a server. */
export async function handleAdminRequest(
  method: string,
  path: string,
  body: () => Promise<unknown>,
): Promise<{ status: number; body: unknown }> {
  const tail = Number(path.split('/').pop())
  try {
    if (method === 'GET' && path === '/api/admin/catalog') {
      return { status: 200, body: readCatalog() }
    }
    if (method === 'PUT' && path === '/api/admin/catalog/exercise') {
      const saved = await saveExercise((await body()) as Partial<CatalogExercise>)
      return { status: 200, body: saved }
    }
    if (method === 'DELETE' && /^\/api\/admin\/catalog\/exercise\/\d+$/.test(path)) {
      return { status: 200, body: { catalog: deleteExercise(tail) } }
    }
    if (method === 'PUT' && path === '/api/admin/catalog/category') {
      return { status: 200, body: { catalog: saveCategory((await body()) as { name?: string }) } }
    }
    if (method === 'DELETE' && /^\/api\/admin\/catalog\/category\/\d+$/.test(path)) {
      return { status: 200, body: { catalog: deleteCategory(tail) } }
    }
    return { status: 404, body: { error: 'Rota desconhecida.' } }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // A refusal is the tool doing its job and is shown as guidance; anything
    // else is a bug, and hiding it behind the same 400 would waste an afternoon.
    return { status: err instanceof AdminError ? 400 : 500, body: { error: message } }
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

export function adminApi(): Plugin {
  return {
    name: 'myonegym-admin-api',
    // Dev server only. There is no build output for any of this.
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (!path.startsWith('/api/admin/')) return next()

        if (!fromLocalhost(req.socket.remoteAddress)) {
          send(res, 403, { error: 'O admin só responde ao próprio computador.' })
          return
        }

        void handleAdminRequest(req.method ?? 'GET', path, () => readJson(req)).then(
          ({ status, body }) => send(res, status, body),
        )
      })
    },
  }
}
