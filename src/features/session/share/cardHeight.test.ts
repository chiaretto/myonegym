import { describe, expect, it } from 'vitest'
import { cardHeight, portraitHeight } from './renderCard'
import type { ShareCard, ShareRow } from './shareModel'

/**
 * The card is painted onto a canvas whose height is computed **before** the
 * canvas exists — so `cardHeight` and the drawing have to agree, or the image
 * gets a black band under it or a cropped photo.
 *
 * jsdom has no canvas, so the drawing itself cannot be tested here and the pixel
 * agreement is a thing for the eye. What *is* testable is the branching: that a
 * portrait is measured as a portrait, that a missing title is not paid for, and
 * that the caption's second line is only charged when there is one. Forgetting
 * one of those branches is the realistic mistake, and it is the one that leaves
 * the band.
 */
const row = (over: Partial<ShareRow> = {}): ShareRow => ({
  name: 'Corrida Externa',
  category: 'Cardio',
  done: true,
  mediaUrl: 'https://x.test/a.webp',
  ...over,
})

const card = (over: Partial<ShareCard> = {}): ShareCard => ({
  layout: 'list',
  title: 'Dia 1',
  dateLabel: '16 jul 2026',
  doneLabel: '1 de 1 concluídos',
  rows: [row()],
  ...over,
})

describe('cardHeight', () => {
  it('measures a portrait as a portrait, not as a one-row list', () => {
    const list = cardHeight(card())
    const portrait = cardHeight(card({ layout: 'portrait', title: undefined }))
    // The photo is worth far more than the 64px row it replaces, so this is a
    // taller card — measured as such rather than left to overflow.
    expect(portrait).toBeGreaterThan(list)
  })

  it('does not pay for a title that is not drawn', () => {
    const withTitle = cardHeight(card({ layout: 'portrait' }))
    const without = cardHeight(card({ layout: 'portrait', title: undefined }))
    // 34 for the line plus the 12 gap under it — the block `renderCard` skips.
    expect(withTitle - without).toBe(46)
  })

  it('charges the caption’s second line only when there is one', () => {
    const withCat = card({ layout: 'portrait', title: undefined })
    const without = card({ layout: 'portrait', title: undefined, rows: [row({ category: undefined })] })
    expect(cardHeight(withCat) - cardHeight(without)).toBe(
      portraitHeight(withCat) - portraitHeight(without),
    )
    expect(portraitHeight(withCat)).toBeGreaterThan(portraitHeight(without))
  })

  it('still grows a list one row at a time', () => {
    const one = cardHeight(card())
    const two = cardHeight(card({ rows: [row(), row()] }))
    // ROW_H + ROW_GAP, untouched by this change.
    expect(two - one).toBe(70)
  })

  it('counts the duration line only on the detailed variant', () => {
    const lite = cardHeight(card())
    const full = cardHeight(card({ durationLabel: '48 min' }))
    expect(full - lite).toBe(26)
  })
})
