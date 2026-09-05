/**
 * The browser half of the catalog maintenance tool.
 *
 * It talks to `scripts/adminApi.ts`, which the **dev server** mounts and which
 * answers localhost only. There is no server in production, and no `/admin`
 * either — see `AdminPage`.
 *
 * Every write answers with the whole catalog as it now is on disk, rather than
 * with the record that was written. The file is the truth, an edit can move
 * things the screen did not ask about (a rename that renumbers another
 * exercise's picture, a deleted category dropping off exercises), and re-reading
 * it is the only way the screen cannot drift from it.
 */

export interface AdminVideo {
  url: string
  title?: string
  startSec?: number
  endSec?: number
}

export interface AdminExercise {
  id: number
  name: string
  kind?: 'strength' | 'cardio'
  categoryIds?: number[]
  alternativeIds?: number[]
  videos?: AdminVideo[]
  mediaFile?: string
}

export interface AdminCategory {
  id: number
  name: string
}

export interface AdminCatalog {
  categories: AdminCategory[]
  exercises: AdminExercise[]
  retiredCategoryIds?: number[]
  retiredExerciseIds?: number[]
}

/**
 * When each served picture was last written, keyed by file name.
 *
 * The version in every image address. It has to come from the **file**, not
 * from a counter in this screen: a page reload resets a counter, and the
 * service worker caches `/exercises/` CacheFirst for a year — so the bare
 * address would go on answering with the copy from before the save, for as
 * long as that cache lives.
 */
export type MediaStamps = Record<string, number>

/** A refusal from the tool: the message is meant to be shown as it is. */
export class AdminRequestError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    })
  } catch {
    // The usual cause by far: the page was opened from the phone, or the dev
    // server is not the one serving it.
    throw new AdminRequestError('Sem resposta do servidor de desenvolvimento.')
  }

  const payload = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new AdminRequestError(payload.error ?? `Erro ${res.status}.`)
  return payload as T
}

export function fetchCatalog(): Promise<AdminCatalog & { stamps: MediaStamps }> {
  return request('GET', '/api/admin/catalog')
}

/**
 * Save one exercise. `mediaUrl` is an **instruction, not a field**: it is the
 * address to download the picture from, and what gets written to the catalog is
 * the file name the conversion produced.
 *
 * Sending **no `id`** creates one, and the id comes back from the API — the only
 * side that knows which numbers are already spent. `copyMediaFrom` names the
 * exercise a new one was derived from, so it inherits that picture.
 *
 * `media` comes back naming the file the conversion produced, and `warning`
 * when the record was saved but the picture was not — a dead host, a 404.
 * Losing the whole edit over that would be worse.
 */
export function saveExercise(
  exercise: Partial<AdminExercise> & { mediaUrl?: string; copyMediaFrom?: number },
): Promise<{
  catalog: AdminCatalog
  stamps: MediaStamps
  id: number
  warning?: string
  media?: string
}> {
  return request('PUT', '/api/admin/catalog/exercise', exercise)
}

export function deleteExercise(id: number): Promise<{ catalog: AdminCatalog; stamps: MediaStamps }> {
  return request('DELETE', `/api/admin/catalog/exercise/${id}`)
}

export function saveCategory(category: {
  id?: number
  name: string
}): Promise<{ catalog: AdminCatalog; stamps: MediaStamps }> {
  return request('PUT', '/api/admin/catalog/category', category)
}

export function deleteCategory(id: number): Promise<{ catalog: AdminCatalog; stamps: MediaStamps }> {
  return request('DELETE', `/api/admin/catalog/category/${id}`)
}
