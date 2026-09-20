/**
 * The backup's home in Google Drive: one file, `myonegym-backup.json`, in the
 * account's **appDataFolder** — the hidden folder the Drive UI never shows and
 * only this app (this OAuth client) can see. Plain `fetch` against Drive API
 * v3; an SDK would bring a script the offline bundle has no use for.
 *
 * Every upload is **resumable**, whatever the size. Drive's simple and
 * multipart uploads stop at 5 MB, and a backup with photos routinely passes
 * that; one path that carries any size beats two of which only the second is
 * ever exercised. Resumable here is two requests, not a chunked protocol:
 * open the session with the metadata, then PUT the whole body to the session
 * URL. A backup of a few megabytes does not need more.
 */

export const BACKUP_FILE_NAME = 'myonegym-backup.json'

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export type DriveErrorCode = 'offline' | 'unauthorized' | 'forbidden' | 'not-found' | 'failed'

/** A failure already phrased for the user, with a code the caller can act on
 *  (`unauthorized` is what sends the user back to Google). */
export class DriveError extends Error {
  constructor(
    public readonly code: DriveErrorCode,
    message: string,
  ) {
    super(message)
  }
}

export interface DriveBackupInfo {
  id: string
  /** Epoch ms of the copy in the cloud. */
  modifiedAt: number
  size: number
}

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

/** Runs a request and turns transport and HTTP failures into DriveErrors. */
async function request(input: string, init: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    throw new DriveError('offline', 'Sem conexão com o Google Drive.')
  }
  if (res.ok) return res
  // 401 is a token that no longer works — a new one fixes it, so the caller
  // goes back to Google. 403 is a permission the token never had (the Drive
  // scope unticked, the API not enabled): a new token would be refused too.
  if (res.status === 401) {
    throw new DriveError('unauthorized', 'O acesso ao Google Drive venceu. Entre de novo.')
  }
  if (res.status === 403) {
    throw new DriveError(
      'forbidden',
      'O Google Drive recusou o acesso. Confira se o acesso ao Drive foi concedido à conta.',
    )
  }
  if (res.status === 404) throw new DriveError('not-found', 'Nenhum backup na nuvem para esta conta.')
  throw new DriveError('failed', `O Google Drive respondeu com erro ${res.status}.`)
}

/** The cloud copy, or null when the account never backed up. */
export async function findBackup(token: string): Promise<DriveBackupInfo | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
    fields: 'files(id,modifiedTime,size)',
    pageSize: '1',
  })
  const res = await request(`${FILES}?${params}`, { headers: auth(token) })
  const body = (await res.json()) as {
    files?: { id: string; modifiedTime?: string; size?: string }[]
  }
  const f = body.files?.[0]
  if (!f) return null
  return {
    id: f.id,
    modifiedAt: f.modifiedTime ? Date.parse(f.modifiedTime) : Date.now(),
    size: Number(f.size ?? '0'),
  }
}

/**
 * Sends the document, creating the file or overwriting `existingId`. Returns
 * the file id. The caller decides whether overwriting was agreed to — this
 * function does not ask.
 */
export async function uploadBackup(token: string, json: string, existingId?: string): Promise<string> {
  // Opening the session: metadata only. `parents` is set at creation and never
  // on update — Drive refuses a parent change on a PATCH.
  const opened = await request(
    existingId ? `${UPLOAD}/${existingId}?uploadType=resumable` : `${UPLOAD}?uploadType=resumable`,
    {
      method: existingId ? 'PATCH' : 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(
        existingId
          ? { name: BACKUP_FILE_NAME, mimeType: 'application/json' }
          : { name: BACKUP_FILE_NAME, mimeType: 'application/json', parents: ['appDataFolder'] },
      ),
    },
  )
  const location = opened.headers.get('Location')
  if (!location) throw new DriveError('failed', 'O Google Drive não abriu o envio.')

  const done = await request(location, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  })
  const body = (await done.json()) as { id?: string }
  return body.id ?? existingId ?? ''
}

/** The document's text, to be handed to `parseBackup` untouched. */
export async function downloadBackup(token: string, id: string): Promise<string> {
  const res = await request(`${FILES}/${id}?alt=media`, { headers: auth(token) })
  return res.text()
}
