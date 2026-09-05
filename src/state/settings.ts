import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type AccentId, DEFAULT_ACCENT_ID, isAccentId, resolveAccent } from './accents'
import { type SplashId, DEFAULT_SPLASH_ID, isSplashId } from './splashes'

/** Global font-size multiplier bounds — see the app-foundation typography spec.
 *  Floor is 1.0 so inputs stay >=16px effective (no iOS zoom-on-focus). */
export const FONT_SCALE_MIN = 1.0
export const FONT_SCALE_MAX = 2.0
/** Keep in sync with --font-scale in src/styles/tokens.css, or the app paints at
 *  one size and then jumps to the other on hydration. */
export const FONT_SCALE_DEFAULT = 1.25
export const FONT_SCALE_STEP = 0.05

export function clampFontScale(v: number): number {
  if (!Number.isFinite(v)) return FONT_SCALE_DEFAULT
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, v))
}

/** Write the multiplier to the document root; every --fs-* token reads it. */
export function applyFontScale(v: number): void {
  document.documentElement.style.setProperty('--font-scale', String(clampFontScale(v)))
}

/** Write the chosen accent to the document root. Three properties is the whole
 *  job: tint, border, text, fill and the gradient all derive from them in
 *  tokens.css. An unknown id resolves to the brand red rather than leaving the
 *  app with no accent. */
export function applyAccent(id: string | null | undefined): void {
  const { accent, accent2, rgb } = resolveAccent(id)
  const root = document.documentElement.style
  root.setProperty('--accent', accent)
  root.setProperty('--accent-2', accent2)
  root.setProperty('--accent-rgb', rgb)
}

interface SettingsState {
  fontScale: number
  accent: AccentId
  /**
   * Which boot-splash artwork to paint. Deliberately has **no `apply*`
   * function**, unlike the font scale and the accent: this one is not read by
   * React at all. The splash is gone before the bundle has finished parsing, so
   * the value is consumed by the inline script in `index.html`, straight out of
   * this store's persisted JSON — which is why it lives here and not in its own
   * key. It takes effect on the **next** launch, and the picker says so.
   */
  splash: SplashId
  setFontScale: (v: number) => void
  setAccent: (id: AccentId) => void
  setSplash: (id: SplashId) => void
  reset: () => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      fontScale: FONT_SCALE_DEFAULT,
      accent: DEFAULT_ACCENT_ID,
      splash: DEFAULT_SPLASH_ID,
      setFontScale: (v) => set({ fontScale: clampFontScale(v) }),
      setAccent: (id) => set({ accent: isAccentId(id) ? id : DEFAULT_ACCENT_ID }),
      setSplash: (id) => set({ splash: isSplashId(id) ? id : DEFAULT_SPLASH_ID }),
      // Aparência's single reset covers everything the screen offers.
      reset: () =>
        set({
          fontScale: FONT_SCALE_DEFAULT,
          accent: DEFAULT_ACCENT_ID,
          splash: DEFAULT_SPLASH_ID,
        }),
    }),
    {
      name: 'myonegym.settings',
      // Sanitise whatever was persisted (guards against tampered/legacy storage,
      // and against a colour that a later version dropped from the list).
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.fontScale = clampFontScale(state.fontScale)
        if (!isAccentId(state.accent)) state.accent = DEFAULT_ACCENT_ID
        if (!isSplashId(state.splash)) state.splash = DEFAULT_SPLASH_ID
      },
    },
  ),
)
