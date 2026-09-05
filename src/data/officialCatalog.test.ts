import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  USER_ID_BASE,
  isOfficialId,
  officialCategories,
  officialCategory,
  officialExercise,
  officialExercises,
  resolveMedia,
} from './officialCatalog'

describe('officialCatalog', () => {
  it('reads the bundled file', () => {
    expect(officialCategories()).toHaveLength(12)
    expect(officialExercises()).toHaveLength(55)
  })

  it('keeps every id inside the official range', () => {
    for (const c of officialCategories()) expect(isOfficialId(c.id!)).toBe(true)
    for (const e of officialExercises()) expect(isOfficialId(e.id!)).toBe(true)
  })

  it('draws the line at USER_ID_BASE', () => {
    expect(isOfficialId(USER_ID_BASE - 1)).toBe(true)
    expect(isOfficialId(USER_ID_BASE)).toBe(false)
    expect(isOfficialId(USER_ID_BASE + 1)).toBe(false)
  })

  it('gives every exercise the fields the app expects', () => {
    for (const e of officialExercises()) {
      expect(['strength', 'cardio']).toContain(e.kind)
      expect(Array.isArray(e.categoryIds)).toBe(true)
      expect(Array.isArray(e.alternativeIds)).toBe(true)
      expect(Array.isArray(e.videos)).toBe(true)
    }
  })

  it('looks one up by id, and answers undefined for an id nothing carries', () => {
    expect(officialExercise(1)?.name).toBe('Supino Reto com Barra')
    expect(officialCategory(1)?.name).toBe('Peito')
    // 10 was deleted from the database this file was exported from.
    expect(officialExercise(10)).toBeUndefined()
    expect(officialExercise(USER_ID_BASE + 1)).toBeUndefined()
  })

  it('is frozen, so a screen cannot corrupt it for the rest of the session', () => {
    const [first] = officialExercises()
    expect(() => {
      ;(first as { name: string }).name = 'mudado'
    }).toThrow()
    expect(() => first.categoryIds.push(999)).toThrow()
    expect(officialExercises()[0].name).toBe('Supino Reto com Barra')
  })

  /**
   * The ids are a **contract**, not an implementation detail: they are what ties
   * the weight a user already recorded to the movement they did. A release may
   * add, rename, re-mediate or retire an exercise; renumbering one silently
   * hands its history to a different movement.
   *
   * So this list is frozen on purpose. Adding a catalog entry does not touch it;
   * renumbering an existing one fails here, which is exactly the moment someone
   * needs to be stopped.
   */
  describe('the id contract', () => {
    const CATEGORY_IDS: [number, string][] = [
      [1, 'Peito'],
      [2, 'Costas'],
      [3, 'Bíceps'],
      [4, 'Tríceps'],
      [5, 'Ombros'],
      [6, 'Core'],
      [7, 'Cardio'],
      [8, 'Trapézio'],
      [9, 'Quadríceps'],
      [10, 'Posterior de coxa'],
      [11, 'Glúteo'],
      [12, 'Panturrilha'],
    ]

    const EXERCISE_IDS: [number, string][] = [
      [1, 'Supino Reto com Barra'],
      [2, 'Supino Inclinado com Barra'],
      [3, 'Crucifixo Reto (voador Peck deck)'],
      [4, 'Tríceps Pulley (Barra Reta)'],
      [5, 'Tríceps Testa com Barra Reta'],
      [6, 'Mergulho em Paralelas'],
      [7, 'Prancha Abdominal (Isometria)'],
      [8, 'Elevação de Pernas na Barra Fixa'],
      [9, 'Abdominal Oblíquo solo'],
      [11, 'Barra Fixa Braço Fechado (Graviton)'],
      [12, 'Remada Curvada com Barra'],
      [13, 'Pulldown na Polia'],
      [14, 'Rosca Direta com Barra'],
      [15, 'Rosca Martelo com Halteres'],
      [16, 'Rosca Concentrada (1 Braço)'],
      [17, 'Barra Fixa Braço Aberto'],
      [18, 'Desenvolvimento com Halteres'],
      [19, 'Elevação Lateral'],
      [20, 'Elevação Frontal com Anilha'],
      [21, 'Remada Alta com Barra'],
      [22, 'Encolhimento para Trapézio (Halteres)'],
      [23, 'Puxada Frontal Aberta na Polia'],
      [24, 'Puxada com Triângulo (Pegada Fechada)'],
      [25, 'Remada Sentada na Polia (Triangulo Neutro)'],
      [26, 'Puxada Articulada Unilateral'],
      [27, 'Voador Inverso (Peck Deck Reverso)'],
      [28, 'Agachamento Hack'],
      [29, 'Leg press 45°'],
      [30, 'Cadeira Flexora'],
      [31, 'Cadeira Abdutora'],
      [32, 'Cadeira Adutora'],
      [33, 'Cadeira Extensora'],
      [34, 'Panturrilha sentada'],
      [35, 'Panturrilha em pé'],
      [36, 'Stiff com Barra'],
      [37, 'Recuo Reverso com Halteres'],
      [38, 'Agachamento Búlgaro (smith)'],
      [39, 'Supino Inclinado com Halteres'],
      [40, 'Crossover na Polia'],
      [41, 'Natação'],
      [42, 'Corrida Externa'],
      [43, 'Bike Interna'],
      [44, 'Mesa Flexora'],
      [45, 'Supino Reto Máquina'],
      [46, 'Elevação de pernas colchonete'],
      [47, 'Prancha Lateral'],
      [48, 'Banco Romano (Hiperextensão)'],
      [49, 'Elevação quadril'],
      [50, 'Mergulho em paralelas (Graviton)'],
      [51, 'Barra fixa braço fechado'],
      [52, 'Tríceps testa polia alta'],
      [53, 'Corrida Interna'],
      [54, 'Bike Trilha'],
      [55, 'Agachamento Búlgaro (halteres)'],
      [56, 'Banco Romano (Hiperextensão com peso)'],
    ]

    it('still numbers every category the way it always did', () => {
      for (const [id, name] of CATEGORY_IDS) {
        expect(officialCategory(id)?.name, `categoria ${id}`).toBe(name)
      }
    })

    it('still numbers every exercise the way it always did', () => {
      for (const [id, name] of EXERCISE_IDS) {
        expect(officialExercise(id)?.name, `exercicio ${id}`).toBe(name)
      }
    })

    it('leaves id 10 vacant forever', () => {
      // It was deleted from the source database. Reusing it would give a new
      // movement the weight history of an old one.
      expect(officialExercise(10)).toBeUndefined()
    })
  })
})

/**
 * The pictures are served by the app, not by the dozen fitness sites they came
 * from. `npm run exercise-media` downloads a master into `data/assets/exercises`
 * and writes the served copy into `public/exercises`.
 */
describe('exercise media comes from the app', () => {
  const root = resolve(__dirname, '../..')
  const raw = JSON.parse(readFileSync(resolve(root, 'src/data/officialCatalog.json'), 'utf8')) as {
    exercises: { id: number; name: string; mediaUrl?: string; mediaFile?: string }[]
  }

  it('carries no remote address at all — only the file the app serves', () => {
    // The pictures were downloaded once; the catalog ships to every device and
    // has no reason to carry a dozen third-party URLs with it. Where each one
    // came from lives beside its master, in data/assets/exercises/sources.json.
    for (const e of raw.exercises) expect(e.mediaUrl, e.name).toBeUndefined()
  })

  it('has the file the catalog names, for each of them', () => {
    for (const e of raw.exercises) {
      if (!e.mediaFile) continue
      expect(existsSync(resolve(root, 'public/exercises', e.mediaFile)), e.mediaFile).toBe(true)
    }
  })

  it('names the file after the exercise, not after a number or a remote slug', () => {
    const bySlug = raw.exercises.find((e) => e.name === 'Supino Reto com Barra')
    expect(bySlug?.mediaFile).toBe('supino-reto-com-barra.webp')
    for (const e of raw.exercises) {
      if (!e.mediaFile) continue
      // URL-safe: these travel in an address, and a percent-encoded name is
      // worse than no name.
      expect(e.mediaFile, e.name).toMatch(/^[a-z0-9-]+\.webp$/)
    }
    // One picture per exercise, and no two sharing a file.
    const files = raw.exercises.filter((e) => e.mediaFile).map((e) => e.mediaFile)
    expect(new Set(files).size).toBe(files.length)
  })

  it('leaves nothing in public/exercises that the catalog does not name', () => {
    const named = new Set(raw.exercises.map((e) => e.mediaFile).filter(Boolean))
    const onDisk = readdirSync(resolve(root, 'public/exercises'))
    // A renamed exercise leaves its old file behind; shipped forever, referenced
    // by nothing. The generator sweeps them, and this is what notices if it stops.
    expect(onDisk.filter((f) => !named.has(f))).toEqual([])
  })

  it('serves them from the app, never from the original host', () => {
    for (const e of officialExercises()) {
      if (!e.mediaUrl) continue
      expect(e.mediaUrl, e.name).not.toMatch(/^https?:/)
      expect(e.mediaUrl, e.name).toContain('/exercises/')
    }
  })

  it('records where each picture came from, beside the masters', () => {
    // Not in the catalog — but not thrown away either: it is the provenance of
    // 51 third-party images, which is the maintainer's business and nobody
    // else's.
    const sources = JSON.parse(
      readFileSync(resolve(root, 'data/assets/exercises/sources.json'), 'utf8'),
    ) as Record<string, string>
    for (const e of raw.exercises) {
      if (!e.mediaFile) continue
      const key = e.mediaFile.replace(/\.webp$/, '')
      expect(sources[key], e.name).toMatch(/^https?:/)
    }
  })

  it('has no picture for an exercise with no master, rather than a broken name', () => {
    const withoutMedia = raw.exercises.filter((e) => !e.mediaFile)
    for (const e of withoutMedia) expect(resolveMedia(e)).toBeUndefined()
  })
})
