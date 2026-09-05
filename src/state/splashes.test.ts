import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SPLASH_ID, SPLASHES, isSplashId, resolveSplash } from './splashes'

const root = resolve(__dirname, '../..')

describe('splashes', () => {
  it('offers a default that is first in the list', () => {
    expect(SPLASHES[0].id).toBe(DEFAULT_SPLASH_ID)
    expect(SPLASHES.length).toBeGreaterThan(1)
  })

  it('has unique ids, names and files', () => {
    for (const key of ['id', 'name', 'file'] as const) {
      expect(new Set(SPLASHES.map((s) => s[key])).size, key).toBe(SPLASHES.length)
    }
  })

  it('falls back to the default rather than leaving the app with no splash', () => {
    expect(resolveSplash('nao-existe').id).toBe(DEFAULT_SPLASH_ID)
    expect(resolveSplash(null).id).toBe(DEFAULT_SPLASH_ID)
    expect(resolveSplash(undefined).id).toBe(DEFAULT_SPLASH_ID)
    expect(resolveSplash('mulher').id).toBe('mulher')
  })

  it('recognises exactly the ids it offers', () => {
    for (const s of SPLASHES) expect(isSplashId(s.id)).toBe(true)
    expect(isSplashId('nao-existe')).toBe(false)
    expect(isSplashId(undefined)).toBe(false)
  })

  /**
   * The same file names are written down in three places that cannot import one
   * another: this list, the generator (a Node script), and the inline script in
   * `index.html` (which has to run before any module loads). Duplication is the
   * price of the splash painting on the first frame — this is what stops it
   * costing a silent, offline-only, cold-start-only bug.
   */
  describe('the three lists agree', () => {
    const generator = readFileSync(resolve(root, 'scripts/gen-splash.mjs'), 'utf8')
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')

    it('every artwork is a file the generator wrote into public/', () => {
      for (const s of SPLASHES) {
        expect(existsSync(resolve(root, 'public', s.file)), s.file).toBe(true)
      }
    })

    it('every artwork is produced by the generator', () => {
      for (const s of SPLASHES) {
        expect(generator, s.file).toContain(`'${s.file}'`)
      }
    })

    it('index.html knows how to paint each one before the bundle loads', () => {
      // The default is the CSS fallback; the rest are in the lookup the inline
      // script reads the stored id against.
      expect(html).toContain(`url('%BASE_URL%${SPLASHES[0].file}')`)
      for (const s of SPLASHES.slice(1)) {
        expect(html, s.id).toContain(`${s.id}: '${s.file}'`)
      }
    })

    it('reads the choice out of the key the settings store persists under', () => {
      // `myonegym.settings` is zustand's `persist` name in src/state/settings.ts,
      // and `.state.splash` is where the value sits inside it.
      expect(html).toContain("localStorage.getItem('myonegym.settings')")
      expect(html).toContain('saved.state.splash')
    })
  })
})
