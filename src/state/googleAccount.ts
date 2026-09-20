import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The Google account connected for the Drive backup, and what this device
 * last did with it.
 *
 * Optional, and only for the backup: nothing in the app asks the user to sign
 * in, and a device that never connected an account finds every screen as it
 * was (see openspec cloud-backup).
 *
 * What lives here is **identity and dates, never the token**. The access token
 * lasts about an hour and belongs to the browser session (see lib/googleAuth);
 * the identity is what lets the Backup screen open saying who is connected
 * without going to the network, and the two dates are what its buttons show —
 * "Último backup" and "Última restauração" are records of THIS device, written
 * when the action finished, which is why they cost no request.
 *
 * Like the assistant key, this is a device preference, not user data: it is
 * outside the JSON backup (a restore must not sign another device into the
 * source's account) and outside `resetAll`, which erases registered data only
 * — "connected as X" and "last backup at Y" stay true after a reset.
 */
export interface GoogleProfile {
  name: string
  email: string
  /** Avatar URL as Google serves it; may be empty. */
  picture: string
}

interface GoogleAccountState {
  profile: GoogleProfile | null
  /**
   * Whether the consent granted `drive.appdata`. Google lets the user untick
   * individual scopes, and a connected account without the Drive one cannot
   * back up — the screen offers signing in again instead of trying and
   * failing.
   */
  driveGranted: boolean
  lastBackupAt: number | null
  lastRestoreAt: number | null
  connect: (profile: GoogleProfile, driveGranted: boolean) => void
  setDriveGranted: (v: boolean) => void
  markBackup: (at: number) => void
  markRestore: (at: number) => void
  /** Forgets identity and dates. The cloud copy and the local data stay. */
  disconnect: () => void
}

export const useGoogleAccount = create<GoogleAccountState>()(
  persist(
    (set) => ({
      profile: null,
      driveGranted: false,
      lastBackupAt: null,
      lastRestoreAt: null,
      connect: (profile, driveGranted) => set({ profile, driveGranted }),
      setDriveGranted: (v) => set({ driveGranted: v }),
      markBackup: (at) => set({ lastBackupAt: at }),
      markRestore: (at) => set({ lastRestoreAt: at }),
      disconnect: () =>
        set({ profile: null, driveGranted: false, lastBackupAt: null, lastRestoreAt: null }),
    }),
    {
      name: 'myonegym.googleAccount',
      // Guards against a tampered/legacy value being read back in a shape the
      // screens would trip on at the point of use instead of here.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const p = state.profile as unknown
        if (
          !p ||
          typeof p !== 'object' ||
          typeof (p as GoogleProfile).email !== 'string' ||
          typeof (p as GoogleProfile).name !== 'string'
        ) {
          state.profile = null
        } else if (typeof (p as GoogleProfile).picture !== 'string') {
          ;(p as GoogleProfile).picture = ''
        }
        if (typeof state.driveGranted !== 'boolean') state.driveGranted = false
        if (typeof state.lastBackupAt !== 'number') state.lastBackupAt = null
        if (typeof state.lastRestoreAt !== 'number') state.lastRestoreAt = null
      },
    },
  ),
)

/** True when an account is connected — the gate for showing the Drive buttons. */
export function hasGoogleAccount(): boolean {
  return useGoogleAccount.getState().profile !== null
}
