/**
 * The boot splash artworks the user can pick between, in Aparência.
 *
 * A **governed list**, like the accents: the splash is not a free image field.
 * Each entry is generated from a versioned master by `npm run splash`
 * (`scripts/gen-splash.mjs`), so the app only ever offers pictures that were
 * built for it — full-bleed, dark, with the lockup where the composition puts
 * it — and never a URL that could 404 on a cold, offline start.
 *
 * The choice reaches the screen through `index.html`, not through React: the
 * splash paints on the very first frame, long before the bundle has parsed. See
 * the inline script there.
 *
 * **Only the in-app splash follows the choice.** iOS's own launch image is
 * declared statically in `index.html` and resolved when the app is installed —
 * there is no way to swap it at runtime, and cutting twenty exact-pixel files
 * per artwork would cost ~9 MB each for a picture the OS shows for an instant.
 * So the launch images come from the **default** artwork: an iPhone left on the
 * default sees one continuous picture, and one switched to the other sees the
 * default for the instant the OS owns and then the chosen one. Android has no
 * native launch image at all, so it only ever sees the chosen one.
 */

export type SplashId = 'vazio' | 'homem' | 'mulher'

export interface Splash {
  id: SplashId
  /** Shown in the picker. */
  name: string
  /** File in `public/`, written by `scripts/gen-splash.mjs`. */
  file: string
}

/**
 * The default is **first**, and it is also the artwork the iOS launch images are
 * cut from — so an iPhone that never had the setting touched shows one
 * continuous picture from tap to first render. Reordering this list therefore
 * means re-running `npm run splash`.
 */
export const SPLASHES: Splash[] = [
  // The one without a person is the default: a fresh install should not assign
  // its owner a figure before they have said anything.
  { id: 'vazio', name: 'Vazio', file: 'splash-vazio.webp' },
  { id: 'homem', name: 'Homem', file: 'splash-homem.webp' },
  { id: 'mulher', name: 'Mulher', file: 'splash-mulher.webp' },
]

export const DEFAULT_SPLASH_ID: SplashId = 'vazio'

export function isSplashId(value: unknown): value is SplashId {
  return SPLASHES.some((s) => s.id === value)
}

/** The chosen artwork, or the default — an id this version does not know about
 *  (tampered storage, or one a later release dropped) must not leave the app
 *  with no splash at all. */
export function resolveSplash(id: string | null | undefined): Splash {
  return SPLASHES.find((s) => s.id === id) ?? SPLASHES[0]
}
