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

export function fetchCatalog(): Promise<AdminCatalog> {
  return request<AdminCatalog>('GET', '/api/admin/catalog')
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
 * `warning` comes back when the record was saved but the picture was not — a
 * dead host, a 404. Losing the whole edit over that would be worse.
 */
export function saveExercise(
  exercise: Partial<AdminExercise> & { mediaUrl?: string; copyMediaFrom?: number },
): Promise<{ catalog: AdminCatalog; id: number; warning?: string }> {
  return request('PUT', '/api/admin/catalog/exercise', exercise)
}

export function deleteExercise(id: number): Promise<{ catalog: AdminCatalog }> {
  return request('DELETE', `/api/admin/catalog/exercise/${id}`)
}

export function saveCategory(category: {
  id?: number
  name: string
}): Promise<{ catalog: AdminCatalog }> {
  return request('PUT', '/api/admin/catalog/category', category)
}

export function deleteCategory(id: number): Promise<{ catalog: AdminCatalog }> {
  return request('DELETE', `/api/admin/catalog/category/${id}`)
}
