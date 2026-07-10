import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyFontScale,
  clampFontScale,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  useSettings,
} from './settings'

beforeEach(() => {
  localStorage.clear()
  useSettings.getState().reset()
  document.documentElement.style.removeProperty('--font-scale')
})
afterEach(() => {
  document.documentElement.style.removeProperty('--font-scale')
})

describe('clampFontScale', () => {
  it('keeps in-range values, clamps out-of-range, and defaults on NaN', () => {
    expect(clampFontScale(1.3)).toBe(1.3)
    expect(clampFontScale(0.5)).toBe(FONT_SCALE_MIN)
    expect(clampFontScale(4)).toBe(FONT_SCALE_MAX)
    expect(clampFontScale(Number.NaN)).toBe(FONT_SCALE_DEFAULT)
  })
})

describe('useSettings store', () => {
  it('defaults to 150%', () => {
    expect(useSettings.getState().fontScale).toBe(FONT_SCALE_DEFAULT)
    expect(FONT_SCALE_DEFAULT).toBe(1.5)
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
})

describe('applyFontScale', () => {
  it('writes the clamped value to the --font-scale custom property', () => {
    applyFontScale(1.8)
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.8')
    applyFontScale(9) // out of range -> clamped to max
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe(String(FONT_SCALE_MAX))
  })
})
