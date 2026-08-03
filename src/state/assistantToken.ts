import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The user's Gemini API key, kept on this device.
 *
 * Stored under its OWN storage key rather than inside `myonegym.settings`: a
 * credential and a font size have nothing to do with each other, and keeping
 * them apart means "apagar a chave" is a single-key operation that can never
 * take a presentation preference down with it.
 *
 * Named for the assistant rather than for Gemini: what the app needs is "the
 * credential the assistant authenticates with", and that outlives any one
 * provider.
 *
 * Like the font size, this is a **device preference, not user data** — it is
 * deliberately outside the backup (see data-portability) and outside `resetAll`,
 * which clears registered data only.
 *
 * There is no safe place for this in a backend-less app: anything running on the
 * page can read it. The screen says so rather than implying otherwise.
 */
interface AssistantTokenState {
  token: string
  setToken: (v: string) => void
  clear: () => void
}

export const useAssistantToken = create<AssistantTokenState>()(
  persist(
    (set) => ({
      token: '',
      // Trimmed on the way in: a key pasted from a password manager or a
      // console routinely arrives with a trailing newline, and the API rejects
      // it with an error that reads "the key is wrong" rather than "the key has
      // whitespace".
      setToken: (v) => set({ token: v.trim() }),
      clear: () => set({ token: '' }),
    }),
    {
      name: 'myonegym.assistantKey',
      // Guards against a tampered/legacy value being read back as a non-string
      // and blowing up at the point of use instead of here.
      onRehydrateStorage: () => (state) => {
        if (state && typeof state.token !== 'string') state.token = ''
      },
    },
  ),
)

/** True when a key is saved — the gate for sending anything to the API. */
export function hasAssistantToken(): boolean {
  return useAssistantToken.getState().token.length > 0
}
