import { describe, expect, it } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT, DEFAULT_ACCENT_ID, isAccentId, resolveAccent } from './accents'

/**
 * These tests re-derive the palette's guarantees from the hex values rather
 * than restating them, so a colour added later cannot quietly break the
 * identity. Everything is measured RELATIVE TO THE DEFAULT RED: the claim is
 * not "4.8:1" (a number that would need editing if the red ever moved), it is
 * "no worse than the colour the app already shipped".
 */

/** The app background, --surface-0. */
const SURFACE_0 = '#050607'
/** The destructive colour, --danger. The accent must stay away from it. */
const DANGER = '#ffa94d'
/** 8-bit rounding moves luminance a little; this is the whole budget. */
const LUM_TOLERANCE = 0.002
/** Same, for chroma. */
const CHROMA_TOLERANCE = 0.002

function channels(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`)
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function linear(hex: string): [number, number, number] {
  return channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = linear(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** OKLCH chroma and hue (Björn Ottosson's transform). Hue in degrees. */
function oklch(hex: string): { chroma: number; hue: number } {
  const [r, g, b] = linear(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return {
    chroma: Math.hypot(a, bb),
    hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  }
}

/** Shortest angular distance between two hues, in degrees. */
function hueGap(a: number, b: number): number {
  return Math.abs((((a - b + 180) % 360) + 360) % 360 - 180)
}

/** Perceptual distance in the OKLab a/b plane. Lightness is equal across the
 *  whole palette by construction, so this is the entire difference. */
function oklabDistance(x: string, y: string): number {
  const ab = (hex: string) => {
    const [r, g, b] = linear(hex)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return [1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
  }
  const [ax, bx] = ab(x)
  const [ay, by] = ab(y)
  return Math.hypot(ax - ay, bx - by)
}

const surfaceLum = luminance(SURFACE_0)
const refLum = luminance(DEFAULT_ACCENT.accent)
const refChroma = oklch(DEFAULT_ACCENT.accent).chroma
const refDangerGap = hueGap(oklch(DEFAULT_ACCENT.accent).hue, oklch(DANGER).hue)

describe('accent palette', () => {
  it('starts from the shipped brand red', () => {
    // Pinned on purpose: these two values are duplicated as --accent and
    // --accent-2 in src/styles/tokens.css. If they drift, the app paints one
    // colour and then jumps to the other on startup.
    expect(DEFAULT_ACCENT_ID).toBe('red')
    expect(DEFAULT_ACCENT.accent).toBe('#ec2c2e')
    expect(DEFAULT_ACCENT.accent2).toBe('#ba2324')
    expect(ACCENTS[0]).toBe(DEFAULT_ACCENT)
  })

  it('offers at least 15 distinct colours', () => {
    expect(ACCENTS.length).toBeGreaterThanOrEqual(15)
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length)
    expect(new Set(ACCENTS.map((a) => a.accent)).size).toBe(ACCENTS.length)
    expect(new Set(ACCENTS.map((a) => a.name)).size).toBe(ACCENTS.length)
  })

  it('keeps every pair of colours far enough apart to tell them apart', () => {
    // Equal luminance means hue and chroma carry ALL of the difference, so a
    // crowded list would ship two swatches the user cannot distinguish. This is
    // the floor the current list clears; adding a near-duplicate fails here.
    const MIN_SEPARATION = 0.035
    for (let i = 0; i < ACCENTS.length; i++) {
      for (let j = i + 1; j < ACCENTS.length; j++) {
        const [a, b] = [ACCENTS[i], ACCENTS[j]]
        expect(oklabDistance(a.accent, b.accent), `${a.name} vs ${b.name}`).toBeGreaterThan(
          MIN_SEPARATION,
        )
      }
    }
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s sits at the red\'s luminance', (_n, a) => {
    expect(Math.abs(luminance(a.accent) - refLum)).toBeLessThanOrEqual(LUM_TOLERANCE)
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s meets AA as text on the app background', (_n, a) => {
    expect(contrast(luminance(a.accent), surfaceLum)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s keeps white on the fill as legible as today', (_n, a) => {
    // The reference CTA is white on the accent. Equal luminance means equal
    // ratio, so this is really a restatement of the invariant above — asserted
    // separately because it is the other direction users actually read.
    const white = contrast(1, luminance(a.accent))
    expect(white).toBeGreaterThanOrEqual(contrast(1, refLum) - 0.05)
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s is no more vivid than the red', (_n, a) => {
    expect(oklch(a.accent).chroma).toBeLessThanOrEqual(refChroma + CHROMA_TOLERANCE)
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s stays clear of the danger amber', (_n, a) => {
    // "Excluir" must never read as a brand action. The red is the closest the
    // app has ever been to the amber; nothing new may come closer.
    expect(hueGap(oklch(a.accent).hue, oklch(DANGER).hue)).toBeGreaterThanOrEqual(refDangerGap - 0.5)
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s derives accent2 as 0.79x accent', (_n, a) => {
    const expected = channels(a.accent).map((c) => Math.round(c * 0.79))
    channels(a.accent2).forEach((c, i) => {
      expect(Math.abs(c - expected[i])).toBeLessThanOrEqual(1)
    })
  })

  it.each(ACCENTS.map((a) => [a.name, a] as const))('%s publishes rgb matching its hex', (_n, a) => {
    expect(a.rgb).toBe(channels(a.accent).join(', '))
  })
})

describe('resolveAccent', () => {
  it('resolves every known id', () => {
    for (const a of ACCENTS) expect(resolveAccent(a.id)).toBe(a)
  })

  it('falls back to the default for anything unknown', () => {
    expect(resolveAccent('chartreuse')).toBe(DEFAULT_ACCENT)
    expect(resolveAccent('')).toBe(DEFAULT_ACCENT)
    expect(resolveAccent(null)).toBe(DEFAULT_ACCENT)
    expect(resolveAccent(undefined)).toBe(DEFAULT_ACCENT)
  })
})

describe('isAccentId', () => {
  it('accepts listed ids and rejects everything else', () => {
    expect(isAccentId('blue')).toBe(true)
    expect(isAccentId('red')).toBe(true)
    expect(isAccentId('mauve')).toBe(false)
    expect(isAccentId(3)).toBe(false)
    expect(isAccentId(undefined)).toBe(false)
  })
})
