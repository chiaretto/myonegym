// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MAX_WIDTH,
  extensionFor,
  slug,
  slugsByExercise,
} from './exerciseMedia.mjs'

/**
 * The naming rules, which is where this module can quietly go wrong.
 *
 * A slug that changes is a picture that disappears: the file on disk keeps the
 * old name, the catalog asks for the new one, and nothing raises — the exercise
 * simply shows up without an image, and the generator lists it among the ones it
 * found no master for.
 */
describe('slug', () => {
  it('strips accents and punctuation, because these travel in URLs', () => {
    expect(slug('Supino Reto com Barra')).toBe('supino-reto-com-barra')
    expect(slug('Crucifixo Reto (voador Peck deck)')).toBe('crucifixo-reto-voador-peck-deck')
    expect(slug('Elevação de Pernas na Barra Fixa')).toBe('elevacao-de-pernas-na-barra-fixa')
    expect(slug('Leg press 45°')).toBe('leg-press-45')
    expect(slug('Panturrilha em pé')).toBe('panturrilha-em-pe')
  })

  it('leaves no leading or trailing separator', () => {
    expect(slug('(Graviton)')).toBe('graviton')
    expect(slug('  Stiff com Barra  ')).toBe('stiff-com-barra')
    expect(slug('45°')).toBe('45')
  })

  it('produces only characters that survive an address unescaped', () => {
    for (const name of ['Tríceps Testa com Barra Reta', 'Mergulho em paralelas (Graviton)']) {
      expect(slug(name)).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

describe('slugsByExercise', () => {
  it('names each exercise after itself', () => {
    const slugs = slugsByExercise([
      { id: 1, name: 'Supino Reto com Barra' },
      { id: 2, name: 'Rosca Direta com Barra' },
    ])
    expect(slugs.get(1)).toBe('supino-reto-com-barra')
    expect(slugs.get(2)).toBe('rosca-direta-com-barra')
  })

  it('keeps both files when two names slug the same', () => {
    // Without the id, one would silently overwrite the other's picture — and
    // the loser would be whichever the loop reached first.
    const slugs = slugsByExercise([
      { id: 7, name: 'Rosca Direta' },
      { id: 9, name: 'rosca direta!' },
    ])
    expect(slugs.get(7)).toBe('rosca-direta-7')
    expect(slugs.get(9)).toBe('rosca-direta-9')
    expect(slugs.get(7)).not.toBe(slugs.get(9))
  })

  it('does not append the id when nothing collides', () => {
    const slugs = slugsByExercise([
      { id: 11, name: 'Barra Fixa Braço Fechado (Graviton)' },
      { id: 51, name: 'Barra fixa braço fechado' },
    ])
    // These two are one hyphen apart, and getting it wrong once served exercise
    // 11 the picture of exercise 51.
    expect(slugs.get(11)).toBe('barra-fixa-braco-fechado-graviton')
    expect(slugs.get(51)).toBe('barra-fixa-braco-fechado')
  })
})

describe('extensionFor', () => {
  it('reads the format off the address, query string and all', () => {
    expect(extensionFor('https://x.test/a.gif')).toBe('gif')
    expect(extensionFor('https://x.test/a.PNG')).toBe('png')
    expect(extensionFor('https://x.test/a.jpeg?resize=675%2C811&ssl=1')).toBe('jpg')
    expect(extensionFor('https://x.test/a.webp#frag')).toBe('webp')
  })

  it('falls back rather than refusing an address with no extension', () => {
    // Plenty of real image URLs carry none — a CDN path, a signed resource.
    expect(extensionFor('https://x.test/imagem')).toBe('jpg')
  })
})

describe('the width cap', () => {
  it('is the phone hero at 2x, not the source', () => {
    // 720 covers a 360pt screen at 2x. Beyond it the file grows and the screen
    // cannot show it — one master here is a 4864x3389 photograph.
    expect(MAX_WIDTH).toBe(720)
  })
})
