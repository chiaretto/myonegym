import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Global font-size multiplier bounds — see the app-foundation typography spec.
 *  Floor is 1.0 so inputs stay >=16px effective (no iOS zoom-on-focus). */
export const FONT_SCALE_MIN = 1.0
export const FONT_SCALE_MAX = 2.0
export const FONT_SCALE_DEFAULT = 1.5
export const FONT_SCALE_STEP = 0.05

export function clampFontScale(v: number): number {
  if (!Number.isFinite(v)) return FONT_SCALE_DEFAULT
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, v))
}

/** Write the multiplier to the document root; every --fs-* token reads it. */
export function applyFontScale(v: number): void {
  document.documentElement.style.setProperty('--font-scale', String(clampFontScale(v)))
}

interface SettingsState {
  fontScale: number
  setFontScale: (v: number) => void
  reset: () => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      fontScale: FONT_SCALE_DEFAULT,
      setFontScale: (v) => set({ fontScale: clampFontScale(v) }),
      reset: () => set({ fontScale: FONT_SCALE_DEFAULT }),
    }),
    {
      name: 'myonegym.settings',
      // Clamp whatever was persisted (guards against tampered/legacy storage).
      onRehydrateStorage: () => (state) => {
        if (state) state.fontScale = clampFontScale(state.fontScale)
      },
    },
  ),
)
