import { beforeEach, describe, expect, it } from 'vitest'
import { hasGoogleAccount, useGoogleAccount } from './googleAccount'

const KEY = 'myonegym.googleAccount'
const ana = { name: 'Ana', email: 'ana@x.y', picture: 'https://p/ana' }

beforeEach(() => {
  localStorage.clear()
  useGoogleAccount.setState({ profile: null, driveGranted: false, lastBackupAt: null, lastRestoreAt: null })
})

describe('googleAccount', () => {
  it('starts disconnected, with no dates', () => {
    expect(hasGoogleAccount()).toBe(false)
    expect(useGoogleAccount.getState()).toMatchObject({ lastBackupAt: null, lastRestoreAt: null })
  })

  it('persists identity and dates under its own key, never a token', () => {
    useGoogleAccount.getState().connect(ana, true)
    useGoogleAccount.getState().markBackup(1000)
    useGoogleAccount.getState().markRestore(2000)
    const stored = JSON.parse(localStorage.getItem(KEY)!).state
    expect(stored).toEqual({ profile: ana, driveGranted: true, lastBackupAt: 1000, lastRestoreAt: 2000 })
    expect(JSON.stringify(stored)).not.toMatch(/token/i)
    expect(hasGoogleAccount()).toBe(true)
  })

  it('forgets identity and dates on disconnect', () => {
    useGoogleAccount.getState().connect(ana, true)
    useGoogleAccount.getState().markBackup(1000)
    useGoogleAccount.getState().disconnect()
    expect(useGoogleAccount.getState()).toMatchObject({
      profile: null,
      driveGranted: false,
      lastBackupAt: null,
      lastRestoreAt: null,
    })
  })

  it('sanitises a tampered stored value on rehydration', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: { profile: { email: 'a@b.c' }, driveGranted: 'yes', lastBackupAt: '1', lastRestoreAt: 5 },
        version: 0,
      }),
    )
    await useGoogleAccount.persist.rehydrate()
    const s = useGoogleAccount.getState()
    expect(s.profile).toBeNull() // no name → not a profile
    expect(s.driveGranted).toBe(false)
    expect(s.lastBackupAt).toBeNull()
    expect(s.lastRestoreAt).toBe(5)

    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { profile: { name: 'Ana', email: 'a@b.c' } }, version: 0 }),
    )
    await useGoogleAccount.persist.rehydrate()
    expect(useGoogleAccount.getState().profile).toEqual({ name: 'Ana', email: 'a@b.c', picture: '' })
  })
})
