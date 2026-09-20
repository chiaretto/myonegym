import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_FILE_NAME, downloadBackup, DriveError, findBackup, uploadBackup } from './driveBackup'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init })

function call(i: number): { url: URL; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[i] as [string, RequestInit]
  return { url: new URL(url), init }
}

describe('findBackup', () => {
  it('looks in the hidden app folder for the one file, by name', async () => {
    fetchMock.mockResolvedValue(
      json({ files: [{ id: 'f1', modifiedTime: '2026-09-12T17:03:00.000Z', size: '1234' }] }),
    )
    await expect(findBackup('tok')).resolves.toEqual({
      id: 'f1',
      modifiedAt: Date.parse('2026-09-12T17:03:00.000Z'),
      size: 1234,
    })
    const { url, init } = call(0)
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/drive/v3/files')
    expect(url.searchParams.get('spaces')).toBe('appDataFolder')
    expect(url.searchParams.get('q')).toContain(`name = '${BACKUP_FILE_NAME}'`)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('is null when the account never backed up', async () => {
    fetchMock.mockResolvedValue(json({ files: [] }))
    await expect(findBackup('tok')).resolves.toBeNull()
  })
})

describe('uploadBackup', () => {
  it('creates the file in appDataFolder with a resumable session, then PUTs the body', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { Location: 'https://up/session-1' } }))
      .mockResolvedValueOnce(json({ id: 'new-id' }))
    await expect(uploadBackup('tok', '{"app":"myonegym"}')).resolves.toBe('new-id')

    const open = call(0)
    expect(open.url.origin + open.url.pathname).toBe('https://www.googleapis.com/upload/drive/v3/files')
    expect(open.url.searchParams.get('uploadType')).toBe('resumable')
    expect(open.init.method).toBe('POST')
    expect(JSON.parse(String(open.init.body))).toEqual({
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      parents: ['appDataFolder'],
    })

    const put = call(1)
    expect(put.url.href).toBe('https://up/session-1')
    expect(put.init.method).toBe('PUT')
    expect(put.init.body).toBe('{"app":"myonegym"}')
  })

  it('overwrites an existing file with PATCH and no parents', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { Location: 'https://up/session-2' } }))
      .mockResolvedValueOnce(json({ id: 'f1' }))
    await expect(uploadBackup('tok', '{}', 'f1')).resolves.toBe('f1')
    const open = call(0)
    expect(open.url.pathname).toBe('/upload/drive/v3/files/f1')
    expect(open.init.method).toBe('PATCH')
    expect(JSON.parse(String(open.init.body))).not.toHaveProperty('parents')
  })

  it('fails when Drive opens no session', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    await expect(uploadBackup('tok', '{}')).rejects.toMatchObject({ code: 'failed' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('downloadBackup', () => {
  it('fetches the media and returns the text untouched', async () => {
    fetchMock.mockResolvedValue(new Response('{"app":"myonegym","kind":"backup"}'))
    await expect(downloadBackup('tok', 'f1')).resolves.toBe('{"app":"myonegym","kind":"backup"}')
    const { url } = call(0)
    expect(url.pathname).toBe('/drive/v3/files/f1')
    expect(url.searchParams.get('alt')).toBe('media')
  })
})

describe('errors', () => {
  it.each([
    [401, 'unauthorized', 'O acesso ao Google Drive venceu. Entre de novo.'],
    [403, 'forbidden', 'O Google Drive recusou o acesso. Confira se o acesso ao Drive foi concedido à conta.'],
    [404, 'not-found', 'Nenhum backup na nuvem para esta conta.'],
    [500, 'failed', 'O Google Drive respondeu com erro 500.'],
  ])('maps HTTP %i to %s, in Portuguese', async (status, code, message) => {
    fetchMock.mockResolvedValue(new Response('', { status }))
    const err = await findBackup('tok').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DriveError)
    expect(err).toMatchObject({ code, message })
  })

  it('reports a transport failure as being offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(downloadBackup('tok', 'f1')).rejects.toMatchObject({
      code: 'offline',
      message: 'Sem conexão com o Google Drive.',
    })
  })
})
