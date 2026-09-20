/**
 * Google sign-in for the Drive backup — OAuth 2.0 **implicit flow by full-page
 * redirect**, done by the app itself.
 *
 * No `gsi/client`, no `gapi`. Google's own library signs in through a popup and
 * talks to it with postMessage, and inside an installed (standalone) PWA on iOS
 * that popup becomes a browser sheet that cannot talk back — the sign-in never
 * finishes. A full-page redirect is what standalone browsers actually support.
 * The authorization-code flow would need a backend to hold the client secret,
 * which this app does not have. And a third-party script has no business in a
 * bundle whose whole point is to work offline.
 *
 * The shape of a sign-in:
 *
 *   1. `beginSignIn(intent, returnTo)` stores a random `state` plus what the
 *      user was trying to do in sessionStorage and navigates to Google.
 *   2. Google sends the user back to the app's root with the token in the URL
 *      **fragment**. That is a fresh boot: `initGoogleAuth()` runs from main.tsx
 *      before the first render, checks the `state`, keeps the token for the
 *      session, scrubs the fragment from the URL and rewrites it to `returnTo`
 *      so the router boots straight onto the screen the user left.
 *   3. That screen calls `consumeSignInReturn()` once and resumes the action.
 *
 * The token lasts about an hour and lives in **sessionStorage only** — it dies
 * with the tab, and a stale one is simply requested again through a silent
 * redirect (`prompt=none`) the next time an action needs it. What persists is
 * the identity, in state/googleAccount.
 */

export type AuthIntent = 'connect' | 'backup' | 'restore'

export interface SignInReturn {
  intent: AuthIntent
  returnTo: string
  /** `denied` is the user cancelling at Google; `error` is anything else. */
  outcome: 'token' | 'denied' | 'error'
  /** Whether the consent included `drive.appdata` (scopes can be unticked). */
  driveGranted: boolean
  error?: string
}

interface PendingSignIn {
  state: string
  intent: AuthIntent
  returnTo: string
  silent: boolean
}

interface SessionToken {
  token: string
  expiresAt: number
  scopes: string[]
}

export class AuthError extends Error {}

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
/** Exactly what is used: the hidden app folder, and enough to say who signed in. */
export const SCOPES = ['openid', 'email', 'profile', DRIVE_SCOPE]

const PENDING_KEY = 'myonegym.googleAuth.pending'
const TOKEN_KEY = 'myonegym.googleAuth.token'

/** Tokens this close to expiry are treated as expired: a backup must not start
 *  with a token that dies during the upload. */
const EXPIRY_MARGIN_MS = 60_000

const DEFAULT_RETURN = '/settings/data'

/**
 * Navigation seam. `window.location.assign` cannot be spied on in jsdom (the
 * property is not configurable), so the one place that leaves the page goes
 * through this object, which a test can replace.
 */
export const nav = {
  go(url: string) {
    window.location.assign(url)
  },
}

export function clientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
}

/** False in a build without VITE_GOOGLE_CLIENT_ID — the screen says so instead
 *  of showing a button that would fail. */
export function isConfigured(): boolean {
  return clientId().length > 0
}

/** The app's own root, which is the only redirect URI registered at Google. */
export function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

function randomState(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Only in-app paths are honoured: a `returnTo` that could point elsewhere
 *  falls back to the Backup screen. */
function safeReturnTo(path: string | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return DEFAULT_RETURN
  return path
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------- the token */

function readToken(): SessionToken | null {
  const t = readJson<SessionToken>(sessionStorage, TOKEN_KEY)
  if (!t || typeof t.token !== 'string' || typeof t.expiresAt !== 'number') return null
  if (!Array.isArray(t.scopes)) t.scopes = []
  return t
}

/** A token that will still be valid for a little while, or null. */
export function getToken(now = Date.now()): string | null {
  const t = readToken()
  if (!t || t.expiresAt - EXPIRY_MARGIN_MS <= now) return null
  return t.token
}

/** Whether the session token was granted the Drive scope. */
export function hasDriveScope(): boolean {
  return readToken()?.scopes.includes(DRIVE_SCOPE) ?? false
}

/** Forget the session token — after Google refuses it, or on sign-out. */
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

/* ---------------------------------------------------------------- leaving */

export interface SignInOptions {
  /** `prompt=none`: succeed without UI or come back with an error, never ask. */
  silent?: boolean
  /** The account to renew for, so a silent attempt does not have to guess. */
  loginHint?: string
}

/** The URL the app navigates to. Exported so a test can read it apart. */
export function authUrl(pending: PendingSignIn, opts: SignInOptions = {}): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPES.join(' '),
    state: pending.state,
    include_granted_scopes: 'true',
  })
  if (opts.silent) params.set('prompt', 'none')
  // Reconnecting is when the user may want a different account; a renewal for
  // a backup should not stop at a chooser.
  else if (pending.intent === 'connect') params.set('prompt', 'select_account')
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

/**
 * Leaves for Google. Returns false (and goes nowhere) when the build has no
 * client ID. The pending record is what lets the return be checked and the
 * action resumed.
 */
export function beginSignIn(intent: AuthIntent, returnTo: string, opts: SignInOptions = {}): boolean {
  if (!isConfigured()) return false
  const pending: PendingSignIn = {
    state: randomState(),
    intent,
    returnTo: safeReturnTo(returnTo),
    silent: opts.silent === true,
  }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  nav.go(authUrl(pending, opts))
  return true
}

/* -------------------------------------------------------------- returning */

/** Parked by `initGoogleAuth`, handed out once by `consumeSignInReturn`. */
let parked: SignInReturn | null = null

/** Errors Google returns to `prompt=none` when it cannot proceed without UI. */
const NEEDS_INTERACTION = new Set(['interaction_required', 'login_required', 'consent_required'])

/**
 * Reads a sign-in return from the URL fragment. Call once, before the first
 * render — the redirect back is a fresh boot, and the fragment must be gone
 * before anything else can see it.
 *
 * Returns what happened, or null when the URL carries no return (the normal
 * boot). A return whose `state` does not match the pending record is ignored:
 * no token is accepted, and the fragment is still scrubbed.
 */
export function initGoogleAuth(loginHint?: string): SignInReturn | null {
  parked = null
  const hash = window.location.hash
  if (!hash || hash.length < 2) return null
  const params = new URLSearchParams(hash.slice(1))
  if (!params.has('access_token') && !params.has('error')) return null

  const pending = readJson<PendingSignIn>(sessionStorage, PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  const returnTo = safeReturnTo(pending?.returnTo)
  const base = import.meta.env.BASE_URL
  // Scrub first, whatever the outcome: the token must never sit in the URL
  // bar or the history. Rewriting to `returnTo` is also what boots the router
  // straight onto the screen the user left.
  window.history.replaceState(null, '', `${base}${returnTo.replace(/^\//, '')}`)

  if (!pending || params.get('state') !== pending.state) return null

  const error = params.get('error')
  if (error) {
    if (pending.silent && NEEDS_INTERACTION.has(error)) {
      // The silent path was refused; ask properly, keeping what the user
      // wanted. This navigates away again — the boot that is happening now
      // will simply be replaced by the return of the interactive attempt.
      beginSignIn(pending.intent, pending.returnTo, { silent: false, loginHint })
      return null
    }
    parked = {
      intent: pending.intent,
      returnTo,
      outcome: error === 'access_denied' ? 'denied' : 'error',
      driveGranted: false,
      error,
    }
    return parked
  }

  const token = params.get('access_token') ?? ''
  const expiresIn = Number(params.get('expires_in') ?? '0')
  const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean)
  const session: SessionToken = {
    token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
    scopes,
  }
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  parked = {
    intent: pending.intent,
    returnTo,
    outcome: 'token',
    driveGranted: scopes.includes(DRIVE_SCOPE),
  }
  return parked
}

/** The parked return, at most once — so a re-mounted screen (or StrictMode's
 *  double effect) cannot resume the same action twice. */
export function consumeSignInReturn(): SignInReturn | null {
  const r = parked
  parked = null
  return r
}

/* --------------------------------------------------------------- the rest */

export interface UserInfo {
  name: string
  email: string
  picture: string
}

/** The single profile request that completes a sign-in. */
export async function fetchProfile(token: string): Promise<UserInfo> {
  const res = await fetch(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new AuthError('Não foi possível ler a conta Google.')
  const body = (await res.json()) as { name?: string; email?: string; picture?: string }
  if (typeof body.email !== 'string') throw new AuthError('Não foi possível ler a conta Google.')
  return { name: body.name ?? body.email, email: body.email, picture: body.picture ?? '' }
}

/**
 * Revokes the session token at Google (best effort — offline, the local
 * sign-out still happens) and forgets it. The cloud copy is untouched:
 * revoking a token is not removing the app's access, let alone its folder.
 */
export async function signOut(): Promise<void> {
  const t = readToken()
  clearToken()
  if (!t) return
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: t.token }).toString(),
    })
  } catch {
    /* offline or refused — nothing more to do locally */
  }
}
