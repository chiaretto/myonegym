import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { db } from '../db/db'
import { createGym } from '../db/repos'
import { exportBackup, PortabilityError } from '../data/portability'
import { useGoogleAccount } from '../state/googleAccount'
import {
  backupToDrive,
  disconnectAccount,
  finishSignIn,
  restoreFromDrive,
  useSignInReturn,
  type SignInReturnHandlers,
} from './cloudBackup'
import { consumeSignInReturn, DRIVE_SCOPE, getToken, nav } from './googleAuth'

const TOKEN_KEY = 'myonegym.googleAuth.token'
const ana = { name: 'Ana', email: 'ana@x.y', picture: '' }

let fetchMock: ReturnType<typeof vi.fn>
let confirm: ReturnType<typeof vi.fn<(o: { title: string; message?: string }) => Promise<boolean>>>

function haveToken(scopes = [DRIVE_SCOPE]) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: 'tok', expiresAt: Date.now() + 3600_000, scopes }))
}

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init })
const listing = (files: unknown[]) => json({ files })
const CLOUD_AT = '2026-09-12T17:03:00.000Z'
const cloudFile = { id: 'f1', modifiedTime: CLOUD_AT, size: '10' }

function deps(returnTo = '/settings/data') {
  return { confirm, returnTo, db, now: () => 1_700_000_000_000 }
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
  vi.spyOn(nav, 'go').mockImplementation(() => {})
  confirm = vi.fn(async () => true)
  sessionStorage.clear()
  localStorage.clear()
  useGoogleAccount.setState({ profile: ana, driveGranted: true, lastBackupAt: null, lastRestoreAt: null })
})
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  consumeSignInReturn()
  await Promise.all([db.gyms, db.categories, db.exercises, db.days, db.weights].map((t) => t.clear()))
})

describe('backupToDrive', () => {
  it('goes to Google silently when there is no token, keeping the intent and the screen', async () => {
    await expect(backupToDrive(deps())).resolves.toEqual({ kind: 'redirected' })
    expect(fetchMock).not.toHaveBeenCalled()
    const url = new URL(vi.mocked(nav.go).mock.calls[0][0])
    expect(url.searchParams.get('prompt')).toBe('none')
    expect(url.searchParams.get('login_hint')).toBe('ana@x.y')
    expect(JSON.parse(sessionStorage.getItem('myonegym.googleAuth.pending')!)).toMatchObject({
      intent: 'backup',
      returnTo: '/settings/data',
    })
  })

  it('creates the file with the export document and records the date — no dialog on a first backup', async () => {
    haveToken()
    await createGym('Academia A', db)
    fetchMock
      .mockResolvedValueOnce(listing([]))
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { Location: 'https://up/s' } }))
      .mockResolvedValueOnce(json({ id: 'new' }))

    await expect(backupToDrive(deps())).resolves.toEqual({ kind: 'done', missingPhotos: 0 })
    expect(confirm).not.toHaveBeenCalled()
    const put = fetchMock.mock.calls[2] as [string, RequestInit]
    const sent = JSON.parse(String(put[1].body))
    const expected = await exportBackup(db)
    expect({ ...sent, exportedAt: 0 }).toEqual({ ...expected, exportedAt: 0 })
    expect(sent.gyms).toHaveLength(1)
    expect(useGoogleAccount.getState().lastBackupAt).toBe(1_700_000_000_000)
  })

  it('says which copy goes before overwriting, and does nothing when refused', async () => {
    haveToken()
    confirm.mockResolvedValue(false)
    fetchMock.mockResolvedValueOnce(listing([cloudFile]))

    await expect(backupToDrive(deps())).resolves.toEqual({ kind: 'cancelled' })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0].message).toContain(
      new Date(CLOUD_AT).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ''),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1) // the listing only
    expect(useGoogleAccount.getState().lastBackupAt).toBeNull()
  })

  it('overwrites the existing file once agreed', async () => {
    haveToken()
    fetchMock
      .mockResolvedValueOnce(listing([cloudFile]))
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { Location: 'https://up/s' } }))
      .mockResolvedValueOnce(json({ id: 'f1' }))
    await expect(backupToDrive(deps())).resolves.toMatchObject({ kind: 'done' })
    const open = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(open[0]).toContain('/files/f1?uploadType=resumable')
    expect(open[1].method).toBe('PATCH')
  })

  it('leaves the date alone when the upload fails', async () => {
    haveToken()
    useGoogleAccount.getState().markBackup(42)
    fetchMock
      .mockResolvedValueOnce(listing([]))
      .mockResolvedValueOnce(new Response('', { status: 200, headers: { Location: 'https://up/s' } }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(backupToDrive(deps())).rejects.toMatchObject({ code: 'failed' })
    expect(useGoogleAccount.getState().lastBackupAt).toBe(42)
  })

  it('forgets a refused token and goes back to Google with the same intent', async () => {
    haveToken()
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(backupToDrive(deps('/settings/data'))).resolves.toEqual({ kind: 'redirected' })
    expect(getToken()).toBeNull()
    expect(JSON.parse(sessionStorage.getItem('myonegym.googleAuth.pending')!)).toMatchObject({
      intent: 'backup',
      silent: true,
    })
  })

  it('does not go back to Google for a permission the token never had', async () => {
    haveToken()
    fetchMock.mockResolvedValueOnce(new Response('', { status: 403 }))
    await expect(backupToDrive(deps())).rejects.toMatchObject({ code: 'forbidden' })
    expect(nav.go).not.toHaveBeenCalled()
    expect(getToken()).toBe('tok')
  })
})

describe('restoreFromDrive', () => {
  it('redirects without a token, with the restore intent', async () => {
    await expect(restoreFromDrive(deps())).resolves.toEqual({ kind: 'redirected' })
    expect(JSON.parse(sessionStorage.getItem('myonegym.googleAuth.pending')!)).toMatchObject({ intent: 'restore' })
  })

  it('says there is nothing in the cloud, and asks nothing', async () => {
    haveToken()
    fetchMock.mockResolvedValueOnce(listing([]))
    await expect(restoreFromDrive(deps())).resolves.toEqual({ kind: 'none' })
    expect(confirm).not.toHaveBeenCalled()
  })

  it('refuses a document that is not a backup before any dialog', async () => {
    haveToken()
    await createGym('Fica', db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(new Response('{"hello":1}'))
    await expect(restoreFromDrive(deps())).rejects.toBeInstanceOf(PortabilityError)
    expect(confirm).not.toHaveBeenCalled()
    expect(await db.gyms.count()).toBe(1)
  })

  it('confirms with the cloud date and touches nothing when refused', async () => {
    haveToken()
    await createGym('Fica', db)
    confirm.mockResolvedValue(false)
    const doc = await exportBackup(db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(new Response(JSON.stringify(doc)))

    await expect(restoreFromDrive(deps())).resolves.toEqual({ kind: 'cancelled' })
    const opts = confirm.mock.calls[0][0] as { danger?: boolean; message?: string }
    expect(opts.danger).toBe(true)
    expect(opts.message).toContain('TODOS')
    expect(opts.message).toContain('12/09/2026')
    expect(await db.gyms.count()).toBe(1)
    expect(useGoogleAccount.getState().lastRestoreAt).toBeNull()
  })

  it('replaces everything with the cloud copy once agreed, and records the date', async () => {
    haveToken()
    await createGym('Da nuvem', db)
    const doc = await exportBackup(db)
    await db.gyms.clear()
    await createGym('Local', db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(new Response(JSON.stringify(doc)))

    await expect(restoreFromDrive(deps())).resolves.toEqual({ kind: 'done', from: Date.parse(CLOUD_AT) })
    const gyms = await db.gyms.toArray()
    expect(gyms.map((g) => g.name)).toEqual(['Da nuvem'])
    expect(useGoogleAccount.getState().lastRestoreAt).toBe(1_700_000_000_000)
  })
})

describe('the account', () => {
  it('finishSignIn writes the profile and whether Drive was granted', async () => {
    haveToken()
    useGoogleAccount.setState({ profile: null, driveGranted: false })
    fetchMock.mockResolvedValueOnce(json({ name: 'Bia', email: 'bia@x.y', picture: 'https://p/bia' }))
    await finishSignIn({ intent: 'connect', returnTo: '/settings/data', outcome: 'token', driveGranted: false })
    expect(useGoogleAccount.getState()).toMatchObject({
      profile: { name: 'Bia', email: 'bia@x.y', picture: 'https://p/bia' },
      driveGranted: false,
    })
  })

  it('finishSignIn ignores a return without a token', async () => {
    useGoogleAccount.setState({ profile: null })
    await finishSignIn({ intent: 'connect', returnTo: '/settings/data', outcome: 'denied', driveGranted: false })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(useGoogleAccount.getState().profile).toBeNull()
  })

  it('disconnectAccount revokes and forgets, leaving the database alone', async () => {
    haveToken()
    await createGym('Fica', db)
    useGoogleAccount.getState().markBackup(1)
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    await disconnectAccount()
    expect(getToken()).toBeNull()
    expect(useGoogleAccount.getState()).toMatchObject({ profile: null, lastBackupAt: null })
    expect(await db.gyms.count()).toBe(1)
  })
})

describe('useSignInReturn', () => {
  function Probe({ handlers }: { handlers: SignInReturnHandlers }) {
    useSignInReturn(handlers)
    return null
  }

  function park(ret: Parameters<typeof finishSignIn>[0]) {
    // Arrive through the real parser so the hook consumes a genuinely parked return.
    sessionStorage.setItem(
      'myonegym.googleAuth.pending',
      JSON.stringify({ state: 's1', intent: ret.intent, returnTo: ret.returnTo, silent: false }),
    )
    window.history.replaceState(null, '', '/')
    const frag = new URLSearchParams(
      ret.outcome === 'token'
        ? { access_token: 'tok', expires_in: '3599', scope: ret.driveGranted ? DRIVE_SCOPE : 'email', state: 's1' }
        : { error: ret.outcome === 'denied' ? 'access_denied' : 'server_error', state: 's1' },
    )
    window.location.hash = frag.toString()
  }

  const flush = () => act(async () => {})

  it('resumes a backup after the profile is written, once, even under StrictMode', async () => {
    const { initGoogleAuth } = await import('./googleAuth')
    park({ intent: 'backup', returnTo: '/settings/data', outcome: 'token', driveGranted: true })
    initGoogleAuth()
    fetchMock.mockResolvedValue(json({ name: 'Ana', email: 'ana@x.y' }))
    const handlers: SignInReturnHandlers = { backup: vi.fn(), restore: vi.fn(), connected: vi.fn(), failed: vi.fn() }

    const view = render(
      <StrictMode>
        <Probe handlers={handlers} />
      </StrictMode>,
    )
    await flush()
    expect(handlers.backup).toHaveBeenCalledTimes(1)
    expect(handlers.failed).not.toHaveBeenCalled()
    expect(useGoogleAccount.getState().profile?.email).toBe('ana@x.y')

    view.unmount()
    render(<Probe handlers={handlers} />)
    await flush()
    expect(handlers.backup).toHaveBeenCalledTimes(1)
  })

  it('reports a cancelled login and a consent without Drive instead of resuming', async () => {
    const { initGoogleAuth } = await import('./googleAuth')
    const handlers: SignInReturnHandlers = { backup: vi.fn(), restore: vi.fn(), failed: vi.fn() }

    park({ intent: 'restore', returnTo: '/settings/data', outcome: 'denied', driveGranted: false })
    initGoogleAuth()
    render(<Probe handlers={handlers} />)
    await flush()
    expect(handlers.failed).toHaveBeenLastCalledWith('Login cancelado.')

    cleanup()
    park({ intent: 'restore', returnTo: '/settings/data', outcome: 'token', driveGranted: false })
    initGoogleAuth()
    fetchMock.mockResolvedValue(json({ name: 'Ana', email: 'ana@x.y' }))
    render(<Probe handlers={handlers} />)
    await flush()
    expect(handlers.failed).toHaveBeenLastCalledWith('O acesso ao Google Drive não foi concedido.')
    expect(handlers.restore).not.toHaveBeenCalled()
    expect(useGoogleAccount.getState().driveGranted).toBe(false)
  })
})
