import { useEffect, useRef } from 'react'
import { db as defaultDb, type MyOneGymDB } from '../db/db'
import { exportBackup, importBackupReplaceAll, parseBackup } from '../data/portability'
import { useGoogleAccount } from '../state/googleAccount'
import { downloadBackup, DriveError, findBackup, uploadBackup } from './driveBackup'
import { fmtDateTime } from './format'
import {
  beginSignIn,
  clearToken,
  consumeSignInReturn,
  fetchProfile,
  getToken,
  signOut,
  type AuthIntent,
  type SignInReturn,
} from './googleAuth'

/**
 * The two cloud actions, on top of `data/portability` and without touching it.
 *
 * Drive is a second transport for the **same document**: what goes up is what
 * "Exportar backup" writes, what comes down goes through `parseBackup` and the
 * same replace-all import as a picked file. Nothing about what a backup is, or
 * what a restore accepts, is decided here.
 *
 * Both actions take the screen's `confirm` rather than importing one: the
 * dialogs are part of the contract (overwriting says which copy goes, restoring
 * is destructive and says which copy comes), and a module that owns them is a
 * module a test can prove never skips them.
 */

export interface ConfirmOpts {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}
export type Confirm = (opts: ConfirmOpts) => Promise<boolean>

export interface CloudDeps {
  confirm: Confirm
  /** The screen to come back to when the action has to go through Google. */
  returnTo: string
  db?: MyOneGymDB
  now?: () => number
}

export type BackupOutcome =
  | { kind: 'redirected' }
  | { kind: 'cancelled' }
  | { kind: 'done'; missingPhotos: number }

export type RestoreOutcome =
  | { kind: 'redirected' }
  | { kind: 'cancelled' }
  | { kind: 'none' }
  | { kind: 'done'; from: number }

/** A valid token, or a silent trip to Google (and null) to get one. */
function tokenOrRedirect(intent: AuthIntent, returnTo: string): string | null {
  const token = getToken()
  if (token) return token
  beginSignIn(intent, returnTo, { silent: true, loginHint: useGoogleAccount.getState().profile?.email })
  return null
}

/** Google refused the token: forget it and go get another, keeping the intent. */
function recover(e: unknown, intent: AuthIntent, returnTo: string): boolean {
  if (!(e instanceof DriveError) || e.code !== 'unauthorized') return false
  clearToken()
  return beginSignIn(intent, returnTo, { silent: true, loginHint: useGoogleAccount.getState().profile?.email })
}

export async function backupToDrive(deps: CloudDeps): Promise<BackupOutcome> {
  const d = deps.db ?? defaultDb
  const now = deps.now ?? Date.now
  const token = tokenOrRedirect('backup', deps.returnTo)
  if (!token) return { kind: 'redirected' }

  try {
    const existing = await findBackup(token)
    if (existing) {
      // The only protection against backing up the wrong device over a good
      // copy: say which copy goes before it goes.
      const ok = await deps.confirm({
        title: 'Substituir o backup na nuvem?',
        message: `O backup de ${fmtDateTime(existing.modifiedAt)} será substituído pelos dados deste aparelho.`,
        confirmLabel: 'Substituir',
      })
      if (!ok) return { kind: 'cancelled' }
    }
    const doc = await exportBackup(d)
    // Same rule as the file export: a photo with no readable image is skipped,
    // and the user is told rather than left believing the copy is complete.
    const missingPhotos = (await d.exercisePhotos.count()) - doc.exercisePhotos.length
    // Compact, like the download: photos are base64 and indentation is megabytes.
    await uploadBackup(token, JSON.stringify(doc), existing?.id)
    // Only after the PUT answered: a failed upload must not move the date.
    useGoogleAccount.getState().markBackup(now())
    return { kind: 'done', missingPhotos }
  } catch (e) {
    if (recover(e, 'backup', deps.returnTo)) return { kind: 'redirected' }
    throw e
  }
}

export async function restoreFromDrive(deps: CloudDeps): Promise<RestoreOutcome> {
  const d = deps.db ?? defaultDb
  const now = deps.now ?? Date.now
  const token = tokenOrRedirect('restore', deps.returnTo)
  if (!token) return { kind: 'redirected' }

  try {
    const existing = await findBackup(token)
    if (!existing) return { kind: 'none' }
    const text = await downloadBackup(token, existing.id)
    // Validated BEFORE the destructive dialog, exactly like a picked file: a
    // document that is not a backup is refused without asking anything.
    const doc = parseBackup(text)
    const ok = await deps.confirm({
      title: 'Restaurar do Drive?',
      message: `Isto substitui TODOS os dados atuais deste aparelho pelo backup de ${fmtDateTime(existing.modifiedAt)}. Não pode ser desfeito.`,
      confirmLabel: 'Substituir tudo',
      danger: true,
    })
    if (!ok) return { kind: 'cancelled' }
    await importBackupReplaceAll(doc, d)
    useGoogleAccount.getState().markRestore(now())
    return { kind: 'done', from: existing.modifiedAt }
  } catch (e) {
    if (recover(e, 'restore', deps.returnTo)) return { kind: 'redirected' }
    throw e
  }
}

/**
 * Completes a sign-in that came back with a token: the one profile request,
 * and the identity written to the device. Also runs on renewals, which keeps
 * the name and picture current at no extra cost.
 */
export async function finishSignIn(ret: SignInReturn): Promise<void> {
  if (ret.outcome !== 'token') return
  const token = getToken()
  if (!token) return
  const profile = await fetchProfile(token)
  useGoogleAccount.getState().connect(profile, ret.driveGranted)
}

/** Sign out: revoke (best effort) and forget identity and dates. The cloud
 *  copy and the local data are not touched. */
export async function disconnectAccount(): Promise<void> {
  await signOut()
  useGoogleAccount.getState().disconnect()
}

export interface SignInReturnHandlers {
  /** The user was sent to Google for a backup; do it now. */
  backup: () => void
  /** Same, for a restore — whose confirmation the action still shows. */
  restore: () => void
  connected?: () => void
  failed: (message: string) => void
}

/**
 * Resumes what the user was doing before the redirect. Consumes the parked
 * return exactly once, so a second mount (StrictMode, a revisit) cannot run
 * the same action again; the handlers are read through a ref so the effect
 * can stay one-shot without closing over stale callbacks.
 */
export function useSignInReturn(handlers: SignInReturnHandlers): void {
  const latest = useRef(handlers)
  latest.current = handlers
  useEffect(() => {
    const ret = consumeSignInReturn()
    if (!ret) return
    void (async () => {
      const h = latest.current
      if (ret.outcome === 'denied') return h.failed('Login cancelado.')
      if (ret.outcome === 'error') return h.failed('Não foi possível entrar com o Google.')
      try {
        await finishSignIn(ret)
      } catch {
        return h.failed('Não foi possível ler a conta Google.')
      }
      if (!ret.driveGranted) return h.failed('O acesso ao Google Drive não foi concedido.')
      if (ret.intent === 'backup') h.backup()
      else if (ret.intent === 'restore') h.restore()
      else h.connected?.()
    })()
  }, [])
}
