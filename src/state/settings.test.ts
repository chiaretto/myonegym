import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT, DEFAULT_ACCENT_ID } from './accents'
import { DEFAULT_SPLASH_ID } from './splashes'
import {
  applyAccent,
  applyFontScale,
  clampFontScale,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  useSettings,
} from './settings'

const ACCENT_PROPS = ['--accent', '--accent-2', '--accent-rgb'] as const
function clearRoot() {
  document.documentElement.style.removeProperty('--font-scale')
  for (const p of ACCENT_PROPS) document.documentElement.style.removeProperty(p)
}

beforeEach(() => {
  localStorage.clear()
  useSettings.getState().reset()
  clearRoot()
})
afterEach(clearRoot)

describe('clampFontScale', () => {
  it('keeps in-range values, clamps out-of-range, and defaults on NaN', () => {
    expect(clampFontScale(1.3)).toBe(1.3)
    expect(clampFontScale(0.5)).toBe(FONT_SCALE_MIN)
    expect(clampFontScale(4)).toBe(FONT_SCALE_MAX)
    expect(clampFontScale(Number.NaN)).toBe(FONT_SCALE_DEFAULT)
  })
})

describe('useSettings store', () => {
  it('defaults to 125%', () => {
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_DEFAULT)
    // Pinned on purpose: this value is duplicated as --font-scale in
    // src/styles/tokens.css, and if the two drift the app flashes at one size
    // and then jumps to the other. Changing it here means changing it there.
    expect(FONT_SCALE_DEFAULT).toBe(1.25)
  })

  it('setFontScale clamps below min and above max', () => {
    useSettings.getState().setFontScale(0.2)
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_MIN)
    useSettings.getState().setFontScale(3)
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_MAX)
    useSettings.getState().setFontScale(1.75)
    expect(useSettings.getState().fontScale).toBe(1.75)
  })

  it('reset returns to the default', () => {
    useSettings.getState().setFontScale(2)
    useSettings.getState().reset()
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_DEFAULT)
  })

  it('defaults to the brand red', () => {
    expect(useSettings.getState().accent).toBe(DEFAULT_ACCENT_ID)
  })

  it('setAccent stores a listed colour and rejects anything else', () => {
    useSettings.getState().setAccent('blue')
    expect(useSettings.getState().accent).toBe('blue')
    // Not reachable through the UI, but storage and older builds are not typed.
    useSettings.getState().setAccent('mauve' as never)
    expect(useSettings.getState().accent).toBe(DEFAULT_ACCENT_ID)
  })

  it('reset restores the font size AND the accent', () => {
    useSettings.getState().setFontScale(2)
    useSettings.getState().setAccent('green')
    useSettings.getState().reset()
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_DEFAULT)
    expect(useSettings.getState().accent).toBe(DEFAULT_ACCENT_ID)
  })
})

describe('applyFontScale', () => {
  it('writes the clamped value to the --font-scale custom property', () => {
    applyFontScale(1.8)
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.8')
    applyFontScale(9) // out of range -> clamped to max
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe(String(FONT_SCALE_MAX))
  })
})

describe('applyAccent', () => {
  const read = () => ACCENT_PROPS.map((p) => document.documentElement.style.getPropertyValue(p))

  it('writes the three properties every accent token derives from', () => {
    const green = ACCENTS.find((a) => a.id === 'green')!
    applyAccent('green')
    expect(read()).toEqual([green.accent, green.accent2, green.rgb])
  })

  it('falls back to the brand red for an unknown id', () => {
    applyAccent('chartreuse')
    expect(read()).toEqual([DEFAULT_ACCENT.accent, DEFAULT_ACCENT.accent2, DEFAULT_ACCENT.rgb])
  })

  it('writes nothing else — the rest of the palette derives in CSS', () => {
    applyAccent('blue')
    // --bg-accent and friends are rgba(var(--accent-rgb), …) in tokens.css; if
    // they were ever written here instead, a future colour could half-apply.
    expect(document.documentElement.style.getPropertyValue('--bg-accent')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--text-accent')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--fill-accent')).toBe('')
  })
})

describe('boot splash choice', () => {
  it('starts on the default and takes only ids it offers', () => {
    expect(useSettings.getState().splash).toBe(DEFAULT_SPLASH_ID)

    useSettings.getState().setSplash('mulher')
    expect(useSettings.getState().splash).toBe('mulher')

    useSettings.getState().setSplash('nao-existe' as never)
    expect(useSettings.getState().splash).toBe(DEFAULT_SPLASH_ID)
  })

  it('is restored by the same reset as the font size and the accent', () => {
    useSettings.getState().setSplash('homem')
    useSettings.getState().reset()
    expect(useSettings.getState().splash).toBe(DEFAULT_SPLASH_ID)
  })

  it('paints nothing itself — the inline script in index.html reads it', () => {
    // Unlike the font scale and the accent, there is no `applySplash`: the
    // splash is gone before React runs, so a function here could only arrive
    // too late. The value's only consumer is index.html.
    expect(Object.keys(useSettings.getState())).not.toContain('applySplash')
    useSettings.getState().setSplash('homem')
    expect(document.documentElement.style.getPropertyValue('--boot-splash')).toBe('')
  })
})
