// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Catalog } from './exerciseMedia.mjs'

/**
 * The catalog editor's back end.
 *
 * What is worth testing here is not the plumbing but the **invariants**: this is
 * the one thing in the repo allowed to rewrite `officialCatalog.json`, and every
 * way it can get that wrong is silent. A reused id hands a new movement somebody
 * else's weight history; a one-sided alternative shows up on one screen and not
 * the other; a renamed exercise loses its picture.
 *
 * The disk is faked so the suite never touches the real catalog or the real
 * masters — but only the *IO* is faked. The slug rules, which decide the file
 * names, are the module's own.
 */
const disk = vi.hoisted(() => ({
  catalog: null as unknown as Catalog,
  written: [] as Catalog[],
  renamed: [] as [string, string][],
  removed: [] as string[],
  downloaded: [] as [string, string][],
  /** Set to make the next download fail, the way a dead host does. */
  downloadFails: null as string | null,
}))

vi.mock('./exerciseMedia.mjs', async (importOriginal) => {
  const real = await importOriginal<typeof import('./exerciseMedia.mjs')>()
  return {
    ...real,
    readCatalog: () => structuredClone(disk.catalog),
    writeCatalog: (c: Catalog) => {
      disk.catalog = structuredClone(c)
      disk.written.push(structuredClone(c))
    },
    renameMedia: (from: string, to: string) => void disk.renamed.push([from, to]),
    removeMedia: (base: string) => void disk.removed.push(base),
    sweepServed: () => [],
    downloadMaster: async (url: string, base: string) => {
      if (disk.downloadFails) throw new Error(disk.downloadFails)
      disk.downloaded.push([url, base])
      return `${base}.gif`
    },
    convertMaster: async (_master: string, base: string) => `${base}.webp`,
  }
})

const {
  USER_ID_BASE,
  deleteCategory,
  deleteExercise,
  fromLocalhost,
  handleAdminRequest,
  mirrorAlternatives,
  nextId,
  saveCategory,
  saveExercise,
} = await import('./adminApi')

function seed(over: Partial<Catalog> = {}): Catalog {
  return {
    app: 'myonegym',
    kind: 'exerciseLibrary',
    version: 6,
    exportedAt: 1,
    retiredCategoryIds: [],
    retiredExerciseIds: [10],
    categories: [
      { id: 1, name: 'Peito' },
      { id: 2, name: 'Costas' },
    ],
    exercises: [
      { id: 1, name: 'Supino Reto', categoryIds: [1], alternativeIds: [], videos: [] },
      {
        id: 11,
        name: 'Barra Fixa',
        categoryIds: [2],
        alternativeIds: [],
        videos: [],
        mediaFile: 'barra-fixa.webp',
      },
    ],
    ...over,
  }
}

beforeEach(() => {
  disk.catalog = seed()
  disk.written = []
  disk.renamed = []
  disk.removed = []
  disk.downloaded = []
  disk.downloadFails = null
})

describe('fromLocalhost', () => {
  /**
   * The first check on every request, and the only thing standing between this
   * API and the LAN: the dev server runs with `host: true` so the PWA can be
   * opened from a phone, and this writes files into the repository and fetches
   * arbitrary URLs.
   */
  it('accepts the loopback, in every shape it arrives in', () => {
    expect(fromLocalhost('127.0.0.1')).toBe(true)
    expect(fromLocalhost('::1')).toBe(true)
    // How an IPv4 loopback looks on a dual-stack socket.
    expect(fromLocalhost('::ffff:127.0.0.1')).toBe(true)
  })

  it('refuses everything else, including the phone on the same network', () => {
    expect(fromLocalhost('192.168.0.14')).toBe(false)
    expect(fromLocalhost('10.0.0.2')).toBe(false)
    expect(fromLocalhost('::ffff:192.168.0.14')).toBe(false)
    expect(fromLocalhost(undefined)).toBe(false)
    // Not a prefix match: this is a routable address that merely starts alike.
    expect(fromLocalhost('127.0.0.1.evil.test')).toBe(false)
  })
})

describe('nextId', () => {
  it('goes past the highest ever used, not into the first gap', () => {
    expect(nextId([1, 2, 5], [])).toBe(6)
    // 10 is retired; the record is gone, so only this list remembers.
    expect(nextId([1, 2], [10])).toBe(11)
  })

  it('stops at the user range rather than writing on top of somebody', () => {
    expect(() => nextId([USER_ID_BASE - 1], [])).toThrow(/faixa oficial/)
  })

  it('agrees with the app about where that range starts', async () => {
    const app = await import('../src/data/officialCatalog')
    expect(USER_ID_BASE).toBe(app.USER_ID_BASE)
  })
})

describe('mirrorAlternatives', () => {
  it('makes a declaration from one side true on both', () => {
    const exercises = [
      { id: 1, name: 'a', alternativeIds: [2] },
      { id: 2, name: 'b', alternativeIds: [] },
    ]
    mirrorAlternatives(exercises, 1)
    expect(exercises[1].alternativeIds).toEqual([1])
  })

  it('unlinks the other side too when the link is taken away', () => {
    const exercises = [
      { id: 1, name: 'a', alternativeIds: [] },
      { id: 2, name: 'b', alternativeIds: [1] },
    ]
    mirrorAlternatives(exercises, 1)
    expect(exercises[1].alternativeIds).toEqual([])
  })

  it('is not transitive — two alternatives of one thing are not alternatives', () => {
    const exercises = [
      { id: 1, name: 'a', alternativeIds: [2, 3] },
      { id: 2, name: 'b', alternativeIds: [] },
      { id: 3, name: 'c', alternativeIds: [] },
    ]
    mirrorAlternatives(exercises, 1)
    expect(exercises[1].alternativeIds).toEqual([1])
    expect(exercises[2].alternativeIds).toEqual([1])
  })

  it('refuses to make something its own alternative', () => {
    const exercises = [{ id: 1, name: 'a', alternativeIds: [1, 2] }]
    mirrorAlternatives(exercises, 1)
    expect(exercises[0].alternativeIds).toEqual([2])
  })
})

describe('saving an exercise', () => {
  it('gives a new one an id nobody has ever had', async () => {
    const { id } = await saveExercise({ name: 'Remada Curvada' })
    expect(id).toBe(12)
    expect(disk.catalog.exercises.at(-1)).toMatchObject({ id: 12, name: 'Remada Curvada' })
  })

  it('never hands back the id of something that was deleted', async () => {
    deleteExercise(11)
    const { id } = await saveExercise({ name: 'Remada Curvada' })
    expect(id).toBe(12)
    expect(disk.catalog.retiredExerciseIds).toContain(11)
  })

  it('defaults to strength, the way the rest of the app does', async () => {
    await saveExercise({ name: 'Remada Curvada' })
    expect(disk.catalog.exercises.at(-1)?.kind).toBe('strength')
    await saveExercise({ name: 'Corrida', kind: 'cardio' })
    expect(disk.catalog.exercises.at(-1)?.kind).toBe('cardio')
  })

  it('refuses a nameless exercise and a duplicate name', async () => {
    await expect(saveExercise({ name: '  ' })).rejects.toThrow(/Informe o nome/)
    await expect(saveExercise({ name: 'supino reto' })).rejects.toThrow(/Já existe/)
    // Saving something under its own name is not a duplicate.
    await expect(saveExercise({ id: 1, name: 'Supino Reto' })).resolves.toBeDefined()
  })

  it('drops a category or an alternative that is not there', async () => {
    // Written as-is it would surface as an exercise quietly missing a category.
    await saveExercise({ name: 'Remada', categoryIds: [1, 99], alternativeIds: [1, 99] })
    expect(disk.catalog.exercises.at(-1)).toMatchObject({
      categoryIds: [1],
      alternativeIds: [1],
    })
  })

  it('leaves the alternative true from the other side as well', async () => {
    await saveExercise({ id: 1, name: 'Supino Reto', alternativeIds: [11] })
    expect(disk.catalog.exercises.find((e) => e.id === 11)?.alternativeIds).toEqual([1])
  })

  it('keeps only the videos that are addresses', async () => {
    await saveExercise({
      name: 'Remada',
      videos: [{ url: 'https://youtu.be/x', title: ' Execução ' }, { url: 'nada' }, { url: '' }],
    })
    expect(disk.catalog.exercises.at(-1)?.videos).toEqual([
      { url: 'https://youtu.be/x', title: 'Execução' },
    ])
  })

  it('brings the picture down and names it after the exercise', async () => {
    await saveExercise({ name: 'Remada Curvada', mediaUrl: 'https://x.test/a.gif' })
    expect(disk.downloaded).toEqual([['https://x.test/a.gif', 'remada-curvada']])
    expect(disk.catalog.exercises.at(-1)?.mediaFile).toBe('remada-curvada.webp')
  })

  it('keeps the picture it already had when no new address is given', async () => {
    await saveExercise({ id: 11, name: 'Barra Fixa', categoryIds: [2] })
    expect(disk.catalog.exercises.find((e) => e.id === 11)?.mediaFile).toBe('barra-fixa.webp')
    expect(disk.downloaded).toEqual([])
  })

  it('takes the picture along when the exercise is renamed', async () => {
    await saveExercise({ id: 11, name: 'Barra Fixa Pronada' })
    expect(disk.renamed).toEqual([['barra-fixa', 'barra-fixa-pronada']])
    expect(disk.catalog.exercises.find((e) => e.id === 11)?.mediaFile).toBe(
      'barra-fixa-pronada.webp',
    )
  })

  it('renames the *other* exercise’s file when a rename creates a collision', async () => {
    // Two names that slug the same both take an id suffix — including the one
    // nobody touched, whose picture would otherwise be left under a dead name.
    await saveExercise({ id: 1, name: 'Barra fixa!' })
    expect(disk.renamed).toContainEqual(['barra-fixa', 'barra-fixa-11'])
    expect(disk.catalog.exercises.find((e) => e.id === 11)?.mediaFile).toBe('barra-fixa-11.webp')
  })

  it('saves the rest when the download fails, and says so', async () => {
    disk.downloadFails = 'HTTP 404'
    const { warning } = await saveExercise({
      id: 1,
      name: 'Supino Reto Novo',
      mediaUrl: 'https://x.test/a.gif',
    })
    expect(warning).toMatch(/HTTP 404/)
    // The edit is not lost just because the picture is.
    expect(disk.catalog.exercises.find((e) => e.id === 1)?.name).toBe('Supino Reto Novo')
  })

  it('refuses to edit an exercise that is not in the catalog', async () => {
    await expect(saveExercise({ id: 777, name: 'Fantasma' })).rejects.toThrow(/não encontrado/)
  })
})

describe('deleting an exercise', () => {
  it('takes the record, the picture and the links with it', async () => {
    await saveExercise({ id: 1, name: 'Supino Reto', alternativeIds: [11] })
    deleteExercise(11)
    expect(disk.catalog.exercises.map((e) => e.id)).toEqual([1])
    expect(disk.removed).toContain('barra-fixa')
    expect(disk.catalog.exercises[0].alternativeIds).toEqual([])
  })

  it('retires the id instead of freeing it', () => {
    deleteExercise(11)
    expect(disk.catalog.retiredExerciseIds).toEqual([10, 11])
  })

  it('says so rather than pretending, for one that is not there', () => {
    expect(() => deleteExercise(777)).toThrow(/não encontrado/)
  })
})

describe('categories', () => {
  it('adds, renames, and refuses a duplicate or an empty name', () => {
    saveCategory({ name: 'Ombros' })
    expect(disk.catalog.categories.at(-1)).toEqual({ id: 3, name: 'Ombros' })

    saveCategory({ id: 3, name: 'Deltoides' })
    expect(disk.catalog.categories.at(-1)).toEqual({ id: 3, name: 'Deltoides' })

    expect(() => saveCategory({ name: ' peito ' })).toThrow(/Já existe/)
    expect(() => saveCategory({ name: '' })).toThrow(/Informe o nome/)
    expect(() => saveCategory({ id: 99, name: 'Fantasma' })).toThrow(/não encontrada/)
  })

  it('unlinks every exercise when one is deleted, and retires its id', () => {
    deleteCategory(1)
    expect(disk.catalog.categories.map((c) => c.id)).toEqual([2])
    expect(disk.catalog.exercises[0].categoryIds).toEqual([])
    expect(disk.catalog.retiredCategoryIds).toEqual([1])
    // And the retired id is not handed out again.
    saveCategory({ name: 'Ombros' })
    expect(disk.catalog.categories.at(-1)?.id).toBe(3)
  })
})

describe('routing', () => {
  const body = (value: unknown) => () => Promise.resolve(value)

  it('hands the catalog over as it is on disk', async () => {
    const res = await handleAdminRequest('GET', '/api/admin/catalog', body({}))
    expect(res.status).toBe(200)
    expect(res.body).toEqual(disk.catalog)
  })

  it('routes each write to its own handler', async () => {
    await handleAdminRequest('PUT', '/api/admin/catalog/exercise', body({ name: 'Remada' }))
    expect(disk.catalog.exercises.at(-1)?.name).toBe('Remada')

    await handleAdminRequest('PUT', '/api/admin/catalog/category', body({ name: 'Ombros' }))
    expect(disk.catalog.categories.at(-1)?.name).toBe('Ombros')

    await handleAdminRequest('DELETE', '/api/admin/catalog/exercise/11', body({}))
    expect(disk.catalog.exercises.map((e) => e.id)).toEqual([1, 12])

    await handleAdminRequest('DELETE', '/api/admin/catalog/category/2', body({}))
    expect(disk.catalog.categories.map((c) => c.id)).toEqual([1, 3])
  })

  it('answers a refusal with 400 and the reason, so the screen can show it', async () => {
    const res = await handleAdminRequest('PUT', '/api/admin/catalog/exercise', body({ name: '' }))
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Informe o nome do exercício.' })
    // Nothing was written on the way to being refused.
    expect(disk.written).toEqual([])
  })

  it('does not treat an unknown path as a write', async () => {
    expect((await handleAdminRequest('GET', '/api/admin/nope', body({}))).status).toBe(404)
    expect((await handleAdminRequest('DELETE', '/api/admin/catalog/exercise/x', body({}))).status)
      .toBe(404)
    expect(disk.written).toEqual([])
  })
})

/**
 * The real file, unmocked — the invariants the tool is here to protect are
 * properties of *it*, not of the fixture above.
 */
describe('the catalog on disk', () => {
  it('remembers that id 10 is spent', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const raw = JSON.parse(
      readFileSync(resolve(__dirname, '../src/data/officialCatalog.json'), 'utf8'),
    ) as Catalog
    // It was deleted from the source database, and the record that would have
    // said so is gone with it.
    expect(raw.retiredExerciseIds).toContain(10)
    for (const id of raw.retiredExerciseIds ?? []) {
      expect(raw.exercises.some((e) => e.id === id)).toBe(false)
    }
    for (const id of raw.retiredCategoryIds ?? []) {
      expect(raw.categories.some((c) => c.id === id)).toBe(false)
    }
  })
})
