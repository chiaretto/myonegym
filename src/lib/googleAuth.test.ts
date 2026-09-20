import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginSignIn,
  clearToken,
  consumeSignInReturn,
  DRIVE_SCOPE,
  fetchProfile,
  getToken,
  hasDriveScope,
  initGoogleAuth,
  isConfigured,
  nav,
  redirectUri,
  signOut,
} from './googleAuth'

const PENDING = 'myonegym.googleAuth.pending'

function pending() {
  return JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as {
    state: string
    intent: string
    returnTo: string
    silent: boolean
  } | null
}

/** Simulates Google sending the user back: the fragment on the app's root. */
function arrive(fragment: Record<string, string>) {
  window.history.replaceState(null, '', '/')
  window.location.hash = new URLSearchParams(fragment).toString()
}

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
  sessionStorage.clear()
  vi.spyOn(nav, 'go').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
  consumeSignInReturn()
})

describe('configuration', () => {
  it('is configured only with a client id', () => {
    expect(isConfigured()).toBe(true)
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '  ')
    expect(isConfigured()).toBe(false)
  })

  it('goes nowhere without a client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    expect(beginSignIn('connect', '/settings/data')).toBe(false)
    expect(nav.go).not.toHaveBeenCalled()
    expect(pending()).toBeNull()
  })

  it('redirects to the app root, the only registered URI', () => {
    expect(redirectUri()).toBe(`${window.location.origin}/`)
  })
})

describe('leaving for Google', () => {
  it('builds the implicit-flow URL with exactly the four scopes and a state', () => {
    expect(beginSignIn('backup', '/settings/data')).toBe(true)
    const url = new URL(vi.mocked(nav.go).mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('response_type')).toBe('token')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri())
    expect(url.searchParams.get('scope')?.split(' ')).toEqual(['openid', 'email', 'profile', DRIVE_SCOPE])
    expect(url.searchParams.get('include_granted_scopes')).toBe('true')
    const p = pending()!
    expect(url.searchParams.get('state')).toBe(p.state)
    expect(p.state).toMatch(/^[0-9a-f]{32}$/)
    expect(p).toMatchObject({ intent: 'backup', returnTo: '/settings/data', silent: false })
  })

  it('asks for no UI on a silent renewal, with the account as a hint', () => {
    beginSignIn('backup', '/settings/data', { silent: true, loginHint: 'a@b.c' })
    const url = new URL(vi.mocked(nav.go).mock.calls[0][0])
    expect(url.searchParams.get('prompt')).toBe('none')
    expect(url.searchParams.get('login_hint')).toBe('a@b.c')
    expect(pending()!.silent).toBe(true)
  })

  it('lets the user pick an account when connecting, not when renewing', () => {
    beginSignIn('connect', '/settings/data')
    beginSignIn('restore', '/settings/data')
    const [a, b] = vi.mocked(nav.go).mock.calls.map((c) => new URL(c[0]))
    expect(a.searchParams.get('prompt')).toBe('select_account')
    expect(b.searchParams.has('prompt')).toBe(false)
  })

  it('only honours an in-app return path', () => {
    beginSignIn('connect', 'https://evil.example/')
    expect(pending()!.returnTo).toBe('/settings/data')
    beginSignIn('connect', '//evil.example/')
    expect(pending()!.returnTo).toBe('/settings/data')
    beginSignIn('connect', '/settings/account')
    expect(pending()!.returnTo).toBe('/settings/account')
  })

  it('is a fresh state every time', () => {
    beginSignIn('connect', '/settings/data')
    const first = pending()!.state
    beginSignIn('connect', '/settings/data')
    expect(pending()!.state).not.toBe(first)
  })
})

describe('coming back', () => {
  it('is a no-op on a normal boot', () => {
    expect(initGoogleAuth()).toBeNull()
    expect(consumeSignInReturn()).toBeNull()
  })

  it('keeps the token for the session, scrubs the URL and boots onto returnTo', () => {
    beginSignIn('backup', '/settings/data')
    const { state } = pending()!
    arrive({ access_token: 'tok', expires_in: '3599', scope: `openid email profile ${DRIVE_SCOPE}`, state })

    const ret = initGoogleAuth()
    expect(ret).toEqual({ intent: 'backup', returnTo: '/settings/data', outcome: 'token', driveGranted: true })
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/settings/data')
    expect(getToken()).toBe('tok')
    expect(hasDriveScope()).toBe(true)
    expect(pending()).toBeNull() // spent
  })

  it('hands the return out once', () => {
    beginSignIn('connect', '/settings/data')
    arrive({ access_token: 'tok', expires_in: '3599', scope: DRIVE_SCOPE, state: pending()!.state })
    initGoogleAuth()
    expect(consumeSignInReturn()?.intent).toBe('connect')
    expect(consumeSignInReturn()).toBeNull()
  })

  it('ignores a return whose state does not match, and still scrubs the URL', () => {
    beginSignIn('backup', '/settings/data')
    arrive({ access_token: 'stolen', expires_in: '3599', scope: DRIVE_SCOPE, state: 'forged' })
    expect(initGoogleAuth()).toBeNull()
    expect(getToken()).toBeNull()
    expect(window.location.hash).toBe('')
    expect(consumeSignInReturn()).toBeNull()
  })

  it('ignores a token that arrives with nothing pending', () => {
    arrive({ access_token: 'stray', expires_in: '3599', scope: DRIVE_SCOPE, state: 'x' })
    expect(initGoogleAuth()).toBeNull()
    expect(getToken()).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('notices when the consent left the Drive scope out', () => {
    beginSignIn('connect', '/settings/data')
    arrive({ access_token: 'tok', expires_in: '3599', scope: 'openid email profile', state: pending()!.state })
    expect(initGoogleAuth()?.driveGranted).toBe(false)
    expect(hasDriveScope()).toBe(false)
  })

  it('retries with interaction when the silent attempt is refused, keeping the intent', () => {
    beginSignIn('restore', '/settings/data', { silent: true, loginHint: 'a@b.c' })
    arrive({ error: 'interaction_required', state: pending()!.state })
    vi.mocked(nav.go).mockClear()

    expect(initGoogleAuth('a@b.c')).toBeNull()
    expect(nav.go).toHaveBeenCalledTimes(1)
    const url = new URL(vi.mocked(nav.go).mock.calls[0][0])
    expect(url.searchParams.has('prompt')).toBe(false)
    expect(url.searchParams.get('login_hint')).toBe('a@b.c')
    expect(pending()).toMatchObject({ intent: 'restore', returnTo: '/settings/data', silent: false })
  })

  it('reports a cancelled consent instead of retrying', () => {
    beginSignIn('connect', '/settings/data')
    arrive({ error: 'access_denied', state: pending()!.state })
    vi.mocked(nav.go).mockClear()
    expect(initGoogleAuth()).toMatchObject({ outcome: 'denied', intent: 'connect' })
    expect(nav.go).not.toHaveBeenCalled()
    expect(pending()).toBeNull()
  })

  it('does not retry an interactive attempt that failed', () => {
    beginSignIn('backup', '/settings/data')
    arrive({ error: 'interaction_required', state: pending()!.state })
    vi.mocked(nav.go).mockClear()
    expect(initGoogleAuth()).toMatchObject({ outcome: 'error', error: 'interaction_required' })
    expect(nav.go).not.toHaveBeenCalled()
  })
})

describe('the token', () => {
  function arriveWithToken(expiresIn: string) {
    beginSignIn('backup', '/settings/data')
    arrive({ access_token: 'tok', expires_in: expiresIn, scope: DRIVE_SCOPE, state: pending()!.state })
    initGoogleAuth()
  }

  it('expires with a margin, so an upload never starts on a dying token', () => {
    arriveWithToken('120')
    const t0 = Date.now()
    expect(getToken(t0)).toBe('tok')
    expect(getToken(t0 + 59_000)).toBe('tok')
    expect(getToken(t0 + 61_000)).toBeNull()
  })

  it('assumes an hour when Google sends no expiry', () => {
    arriveWithToken('')
    expect(getToken(Date.now() + 3500 * 1000)).toBe('tok')
    expect(getToken(Date.now() + 3600 * 1000)).toBeNull()
  })

  it('is forgotten on clear and on sign-out, which revokes it best-effort', async () => {
    arriveWithToken('3599')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }))
    await signOut()
    expect(getToken()).toBeNull()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/revoke')
    expect(init?.method).toBe('POST')
    expect(String(init?.body)).toBe('token=tok')

    arriveWithToken('3599')
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await expect(signOut()).resolves.toBeUndefined()
    expect(getToken()).toBeNull()

    arriveWithToken('3599')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('survives a tampered session value without throwing', () => {
    sessionStorage.setItem('myonegym.googleAuth.token', '{"token":1}')
    expect(getToken()).toBeNull()
    sessionStorage.setItem('myonegym.googleAuth.token', 'not json')
    expect(getToken()).toBeNull()
    expect(hasDriveScope()).toBe(false)
  })
})

describe('the profile', () => {
  it('reads name, email and picture with the bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'Ana', email: 'ana@x.y', picture: 'https://p/ana' })),
    )
    await expect(fetchProfile('tok')).resolves.toEqual({ name: 'Ana', email: 'ana@x.y', picture: 'https://p/ana' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://www.googleapis.com/oauth2/v3/userinfo')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('falls back to the email as a name and to no picture', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ email: 'ana@x.y' })))
    await expect(fetchProfile('tok')).resolves.toEqual({ name: 'ana@x.y', email: 'ana@x.y', picture: '' })
  })

  it('fails in Portuguese when Google refuses or answers nonsense', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }))
    await expect(fetchProfile('tok')).rejects.toThrow('Não foi possível ler a conta Google.')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await expect(fetchProfile('tok')).rejects.toThrow('Não foi possível ler a conta Google.')
  })
})
