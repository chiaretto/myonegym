import { describe, expect, it } from 'vitest'
import { ACCENTS, DEFAULT_ACCENT } from '../../../state/accents'
import { cardAccent } from './renderCard'

/**
 * jsdom has no 2D context, so the painted pixels cannot be asserted here (the
 * card is verified by eye — see the change's manual-verification task). What IS
 * testable, and what actually used to break, is the colour handed to the
 * painter: before this change the accent was a frozen literal inside
 * `renderCard.ts`, so every shared PNG came out brand red no matter what the
 * user had chosen.
 */
describe('cardAccent', () => {
  it('expands a chosen accent into canvas-ready colours', () => {
    const green = ACCENTS.find((a) => a.id === 'green')!
    expect(cardAccent('green')).toEqual({
      accent: green.accent,
      accent2: green.accent2,
      tint: `rgba(${green.rgb}, 0.16)`,
    })
  })

  it('mirrors the --bg-accent alpha for every colour', () => {
    // 0.16 is the app's soft tint. If tokens.css ever moves it, this is the one
    // other place that has to move with it.
    for (const a of ACCENTS) {
      expect(cardAccent(a.id).tint).toBe(`rgba(${a.rgb}, 0.16)`)
    }
  })

  it('paints the brand red when nothing was chosen', () => {
    for (const id of [undefined, null, '', 'chartreuse']) {
      expect(cardAccent(id)).toEqual({
        accent: DEFAULT_ACCENT.accent,
        accent2: DEFAULT_ACCENT.accent2,
        tint: `rgba(${DEFAULT_ACCENT.rgb}, 0.16)`,
      })
    }
  })

  it('never returns the brand red for a non-default colour', () => {
    for (const a of ACCENTS.filter((x) => x.id !== DEFAULT_ACCENT.id)) {
      const c = cardAccent(a.id)
      expect(c.accent).not.toBe(DEFAULT_ACCENT.accent)
      expect(c.accent2).not.toBe(DEFAULT_ACCENT.accent2)
      expect(c.tint).not.toContain(DEFAULT_ACCENT.rgb)
    }
  })
})
