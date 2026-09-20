import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import { createGym } from '../../db/repos'
import { exportBackup } from '../../data/portability'
import { consumeSignInReturn, DRIVE_SCOPE, initGoogleAuth, nav } from '../../lib/googleAuth'
import { useActiveGym } from '../../state/activeGym'
import { useGoogleAccount } from '../../state/googleAccount'
import { useOnboarding } from '../../state/onboarding'

const ana = { name: 'Ana Souza', email: 'ana@exemplo.com', picture: '' }
const CLOUD_AT = '2026-09-12T17:03:00.000Z'
const cloudFile = { id: 'f1', modifiedTime: CLOUD_AT, size: '10' }
const cloudStamp = new Date(CLOUD_AT).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '')

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init })
const listing = (files: unknown[]) => json({ files })
const session = () => new Response('', { status: 200, headers: { Location: 'https://up/s' } })

let fetchMock: ReturnType<typeof vi.fn>

function haveToken(scopes = [DRIVE_SCOPE]) {
  sessionStorage.setItem(
    'myonegym.googleAuth.token',
    JSON.stringify({ token: 'tok', expiresAt: Date.now() + 3600_000, scopes }),
  )
}

function connected(extra: Partial<ReturnType<typeof useGoogleAccount.getState>> = {}) {
  useGoogleAccount.setState({ profile: ana, driveGranted: true, lastBackupAt: null, lastRestoreAt: null, ...extra })
  haveToken()
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const driveGroup = () => screen.getByText('Google Drive').nextElementSibling as HTMLElement

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useOnboarding.getState().markPromptSeen()
  useGoogleAccount.setState({ profile: null, driveGranted: false, lastBackupAt: null, lastRestoreAt: null })
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
  vi.spyOn(nav, 'go').mockImplementation(() => {})
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  consumeSignInReturn()
  await Promise.all([db.gyms, db.categories, db.exercises, db.days, db.weights].map((t) => t.clear()))
  useActiveGym.setState({ activeGymId: null })
})

describe('The account is optional', () => {
  it('adds nothing to Settings but a mention on the Backup row', async () => {
    renderAt('/settings')
    await screen.findByText('Backup')
    expect(screen.queryByText(/conta google/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/entrar/i)).not.toBeInTheDocument()
    expect(screen.getByText('Exportar · importar · Google Drive · gerar exemplo')).toBeInTheDocument()
  })

  it('offers one optional row on the Backup screen when no account is connected', async () => {
    renderAt('/settings/data')
    const group = await screen.findByText('Google Drive').then(() => driveGroup())
    expect(within(group).getByText('Conectar conta Google')).toBeInTheDocument()
    expect(within(group).getByText('Opcional · guarda o backup no seu Google Drive')).toBeInTheDocument()
    expect(within(group).queryByText('Fazer backup no Drive')).not.toBeInTheDocument()
    expect(within(group).queryByText('Restaurar do Drive')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves for Google only when that row is tapped, and comes back here', async () => {
    const user = userEvent.setup()
    renderAt('/settings/data')
    await user.click(await screen.findByText('Conectar conta Google'))
    expect(nav.go).toHaveBeenCalledTimes(1)
    expect(vi.mocked(nav.go).mock.calls[0][0]).toMatch(/^https:\/\/accounts\.google\.com\//)
    expect(JSON.parse(sessionStorage.getItem('myonegym.googleAuth.pending')!)).toMatchObject({
      intent: 'connect',
      returnTo: '/settings/data',
    })
  })

  it('says the account is not configured in a build without a client id', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderAt('/settings/data')
    await screen.findByText('Google Drive')
    expect(screen.getByText(/não configurada/)).toBeInTheDocument()
    expect(screen.queryByText('Conectar conta Google')).not.toBeInTheDocument()
  })

  it('sends a visitor without an account away from the account screen', async () => {
    renderAt('/settings/account')
    expect(await screen.findByText('Google Drive')).toBeInTheDocument()
    expect(screen.queryByText('Conta Google')).not.toBeInTheDocument()
  })
})

describe('Connected', () => {
  it('shows who is connected and the dates this device recorded, without a request', async () => {
    connected({ lastBackupAt: Date.parse('2026-09-18T10:00:00'), lastRestoreAt: null })
    renderAt('/settings/data')
    const group = await screen.findByText('Google Drive').then(() => driveGroup())
    expect(within(group).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(group).getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(within(group).getByText('Último backup: 18/09/2026 10:00')).toBeInTheDocument()
    expect(within(group).getByText(/Última restauração: Nunca/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('disables both actions offline, saying why', async () => {
    connected()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderAt('/settings/data')
    const backup = await screen.findByRole('button', { name: /Fazer backup no Drive/ })
    const restore = screen.getByRole('button', { name: /Restaurar do Drive/ })
    expect(backup).toBeDisabled()
    expect(restore).toBeDisabled()
    expect(screen.getAllByText('Precisa de conexão')).toHaveLength(2)
  })

  it('offers to grant the Drive scope instead of buttons that would fail', async () => {
    connected({ driveGranted: false })
    renderAt('/settings/data')
    expect(await screen.findByText('Conceder acesso ao Drive')).toBeInTheDocument()
    expect(screen.queryByText('Fazer backup no Drive')).not.toBeInTheDocument()
  })

  it('backs up: says which cloud copy goes, uploads on yes, and the date moves', async () => {
    connected()
    await createGym('Academia A', db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(session()).mockResolvedValueOnce(json({ id: 'f1' }))
    const user = userEvent.setup()
    renderAt('/settings/data')

    await user.click(await screen.findByRole('button', { name: /Fazer backup no Drive/ }))
    expect(await screen.findByText('Substituir o backup na nuvem?')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(cloudStamp.replace(/[/]/g, '\\/')))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Substituir' }))

    await waitFor(() => expect(screen.getByText('Backup enviado ao Drive.')).toBeInTheDocument())
    const put = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(JSON.parse(String(put[1].body)).gyms).toHaveLength(1)
    expect(screen.getByText(/Último backup: \d\d\/\d\d\/\d{4} \d\d:\d\d/)).toBeInTheDocument()
  })

  it('backs up nothing when the overwrite is refused', async () => {
    connected()
    fetchMock.mockResolvedValueOnce(listing([cloudFile]))
    const user = userEvent.setup()
    renderAt('/settings/data')
    await user.click(await screen.findByRole('button', { name: /Fazer backup no Drive/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('Substituir o backup na nuvem?')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Último backup: Nunca')).toBeInTheDocument()
  })

  it('restores: confirms with the cloud date, replaces everything on yes', async () => {
    connected()
    await createGym('Da nuvem', db)
    const doc = await exportBackup(db)
    await db.gyms.clear()
    await createGym('Local', db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(new Response(JSON.stringify(doc)))
    const user = userEvent.setup()
    renderAt('/settings/data')

    await user.click(await screen.findByRole('button', { name: /Restaurar do Drive/ }))
    expect(await screen.findByText('Restaurar do Drive?')).toBeInTheDocument()
    expect(screen.getByText(/pelo backup de/)).toHaveTextContent(cloudStamp)
    await user.click(screen.getByRole('button', { name: 'Substituir tudo' }))

    await waitFor(() => expect(screen.getByText('Backup restaurado do Drive.')).toBeInTheDocument())
    expect((await db.gyms.toArray()).map((g) => g.name)).toEqual(['Da nuvem'])
    expect(screen.getByText(/Última restauração: \d\d\/\d\d\/\d{4} \d\d:\d\d/)).toBeInTheDocument()
  })

  it('restores nothing when refused', async () => {
    connected()
    await createGym('Local', db)
    const doc = await exportBackup(db)
    fetchMock.mockResolvedValueOnce(listing([cloudFile])).mockResolvedValueOnce(new Response(JSON.stringify(doc)))
    const user = userEvent.setup()
    renderAt('/settings/data')
    await user.click(await screen.findByRole('button', { name: /Restaurar do Drive/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('Restaurar do Drive?')).not.toBeInTheDocument())
    expect((await db.gyms.toArray()).map((g) => g.name)).toEqual(['Local'])
    expect(screen.getByText(/Última restauração: Nunca/)).toBeInTheDocument()
  })

  it('says so when the account has no cloud copy yet', async () => {
    connected()
    fetchMock.mockResolvedValueOnce(listing([]))
    const user = userEvent.setup()
    renderAt('/settings/data')
    await user.click(await screen.findByRole('button', { name: /Restaurar do Drive/ }))
    await waitFor(() => expect(screen.getByText('Nenhum backup na nuvem para esta conta.')).toBeInTheDocument())
  })

  it('goes back to Google for a backup when the token is gone, and resumes it on return', async () => {
    connected()
    sessionStorage.removeItem('myonegym.googleAuth.token')
    const user = userEvent.setup()
    const first = renderAt('/settings/data')
    await user.click(await screen.findByRole('button', { name: /Fazer backup no Drive/ }))
    expect(nav.go).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    const pending = JSON.parse(sessionStorage.getItem('myonegym.googleAuth.pending')!) as { state: string }
    first.unmount()

    // Google sends the user back: a fresh boot, token in the fragment.
    window.history.replaceState(null, '', '/')
    window.location.hash = new URLSearchParams({
      access_token: 'tok2',
      expires_in: '3599',
      scope: DRIVE_SCOPE,
      state: pending.state,
    }).toString()
    initGoogleAuth()
    expect(window.location.pathname).toBe('/settings/data')
    fetchMock
      .mockResolvedValueOnce(json({ name: 'Ana Souza', email: 'ana@exemplo.com' })) // profile
      .mockResolvedValueOnce(listing([]))
      .mockResolvedValueOnce(session())
      .mockResolvedValueOnce(json({ id: 'new' }))
    renderAt(window.location.pathname)
    await waitFor(() => expect(screen.getByText('Backup enviado ao Drive.')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})

describe('The account screen', () => {
  it('shows the identity and signs out without touching the cloud copy or the data', async () => {
    connected({ lastBackupAt: 5 })
    await createGym('Fica', db)
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 })) // revoke
    const user = userEvent.setup()
    renderAt('/settings/account')

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(screen.getByText(/só este app enxerga/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Sair da conta Google/ }))
    await user.click(await screen.findByRole('button', { name: 'Sair' }))

    // Back on the Backup screen, disconnected; the revoke was the only request.
    expect(await screen.findByText('Conectar conta Google')).toBeInTheDocument()
    expect(useGoogleAccount.getState()).toMatchObject({ profile: null, lastBackupAt: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://oauth2.googleapis.com/revoke')
    expect(await db.gyms.count()).toBe(1)
  })
})
