import { describe, expect, it } from 'vitest'
import type {
  CatalogProposal,
  CatalogSnapshot,
  ProposedDay,
  ProposedExercise,
} from './catalogPayload'
import { officialCategories, officialExercises } from './officialCatalog'
import { repairProposal, type RepairKind } from './proposalRepair'

/* --------------------------------------------------------------- builders */

const GIF = 'https://exemplo.test/supino.gif'
const JPG = 'https://exemplo.test/rosca.jpg'

const snapshot = (over: Partial<CatalogSnapshot> = {}): CatalogSnapshot => ({
  categories: [
    { id: 10001, name: 'Peito' },
    { id: 10007, name: 'Cardio' },
  ],
  exercises: [
    { id: 10001, name: 'Supino Reto', mediaUrl: GIF, categoryIds: [10001], alternativeIds: [] },
    { id: 10002, name: 'Corrida', mediaUrl: null, categoryIds: [10007], alternativeIds: [] },
  ],
  days: [{ id: 10001, name: 'Dia 1', exerciseIds: [10001, 10002] }],
  ...over,
})

const ex = (over: Partial<ProposedExercise> = {}): ProposedExercise => ({
  ref: '10001',
  id: 10001,
  name: 'Supino Reto',
  mediaUrl: GIF,
  categoryRefs: ['10001'],
  alternativeRefs: [],
  ...over,
})

const day = (over: Partial<ProposedDay> = {}): ProposedDay => ({
  ref: '10001',
  id: 10001,
  name: 'Dia 1',
  exerciseRefs: ['10001'],
  ...over,
})

const proposal = (over: Partial<CatalogProposal> = {}): CatalogProposal => ({
  summary: 'Ajustei.',
  categories: [{ ref: '10001', id: 10001, name: 'Peito' }],
  exercises: [ex()],
  days: [day()],
  ...over,
})

const kinds = (repairs: { kind: RepairKind }[]) => repairs.map((r) => r.kind)

/* ------------------------------------------------------------------ media */

describe('mediaUrl', () => {
  it('reads the text "null" as the null it was meant to be', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: 'null' })] }),
    )

    expect(out.exercises[0].mediaUrl).toBeNull()
    expect(kinds(repairs)).toEqual(['media-cleared'])
    expect(repairs[0].text).toContain('Supino Reto')
  })

  it('reads "undefined" the same way', () => {
    const { repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: 'undefined' })] }),
    )
    expect(kinds(repairs)).toEqual(['media-cleared'])
  })

  it('says nothing about an empty string — it already meant no image', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: '   ' })] }),
    )

    expect(out.exercises[0].mediaUrl).toBeNull()
    expect(repairs).toEqual([])
  })

  it('keeps the stored image when the proposed url is garbage', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: 'a foto do supino' })] }),
    )

    expect(out.exercises[0].mediaUrl).toBe(GIF)
    expect(kinds(repairs)).toEqual(['media-kept'])
  })

  it('keeps the stored image when the url is not an image', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: 'https://exemplo.test/pagina' })] }),
    )

    expect(out.exercises[0].mediaUrl).toBe(GIF)
    expect(kinds(repairs)).toEqual(['media-kept'])
  })

  it('has nothing to keep for an exercise that has no image', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({
        exercises: [ex({ ref: '10002', id: 10002, name: 'Corrida', mediaUrl: 'sei lá' })],
        days: [day({ exerciseRefs: ['10002'] })],
      }),
    )

    expect(out.exercises[0].mediaUrl).toBeNull()
    expect(kinds(repairs)).toEqual(['media-cleared'])
  })

  it('has nothing to keep for a new exercise', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({
        exercises: [ex({ ref: 'novo1', id: null, name: 'Novo', mediaUrl: 'sei lá' })],
        days: [day({ exerciseRefs: ['novo1'] })],
      }),
    )

    expect(out.exercises[0].mediaUrl).toBeNull()
    expect(kinds(repairs)).toEqual(['media-cleared'])
  })

  it('leaves a valid url alone, query string and all', () => {
    const url = 'https://exemplo.test/foto.gif?fit=720%2C720&ssl=1'
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ mediaUrl: url })] }),
    )

    expect(out.exercises[0].mediaUrl).toBe(url)
    expect(repairs).toEqual([])
  })
})

/* ------------------------------------------------------------------- refs */

describe('dangling references', () => {
  it('unlinks a category the proposal itself dropped, naming it', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ categoryRefs: ['10001', '10007'] })] }),
    )

    expect(out.exercises[0].categoryRefs).toEqual(['10001'])
    expect(kinds(repairs)).toEqual(['category-unlinked'])
    expect(repairs[0].text).toContain('Cardio')
  })

  it('unlinks an alternative that is not in the proposal', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ alternativeRefs: ['10002'] })] }),
    )

    expect(out.exercises[0].alternativeRefs).toEqual([])
    expect(kinds(repairs)).toEqual(['alternative-unlinked'])
    expect(repairs[0].text).toContain('Corrida')
  })

  it('drops an alternative pointing at its own exercise, without a word', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ exercises: [ex({ alternativeRefs: ['10001'] })] }),
    )

    expect(out.exercises[0].alternativeRefs).toEqual([])
    expect(repairs).toEqual([])
  })

  it('takes an unknown exercise out of the day it was placed in', () => {
    const { proposal: out, repairs } = repairProposal(
      snapshot(),
      proposal({ days: [day({ exerciseRefs: ['10001', '10002'] })] }),
    )

    expect(out.days[0].exerciseRefs).toEqual(['10001'])
    expect(kinds(repairs)).toEqual(['exercise-unlinked'])
    expect(repairs[0].text).toContain('Corrida')
  })

  it('falls back to the ref itself when the catalog cannot name it', () => {
    const { repairs } = repairProposal(
      snapshot(),
      proposal({ days: [day({ exerciseRefs: ['novo9'] })] }),
    )

    expect(repairs[0].text).toContain('novo9')
  })
})

/* --------------------------------------------------------------- the line */

describe('what the repair must never do', () => {
  const noisy = () =>
    proposal({
      categories: [{ ref: '10001', id: 10001, name: 'Peito' }],
      exercises: [
        ex({ mediaUrl: 'null', categoryRefs: ['10001', '10007'], alternativeRefs: ['10002'] }),
        ex({ ref: 'novo1', id: null, name: 'Novo', mediaUrl: 'xx', categoryRefs: ['novo9'] }),
      ],
      days: [day({ exerciseRefs: ['10001', '10002', 'novo1'] })],
    })

  it('never changes how many categories, exercises or days there are', () => {
    const before = noisy()
    const { proposal: after } = repairProposal(snapshot(), before)

    expect(after.categories).toHaveLength(before.categories.length)
    expect(after.exercises).toHaveLength(before.exercises.length)
    expect(after.days).toHaveLength(before.days.length)
  })

  it('never changes an id, a name, the order or the summary', () => {
    const before = noisy()
    const { proposal: after } = repairProposal(snapshot(), before)

    const identity = (p: CatalogProposal) => ({
      summary: p.summary,
      categories: p.categories.map((c) => [c.ref, c.id, c.name]),
      exercises: p.exercises.map((e) => [e.ref, e.id, e.name]),
      days: p.days.map((x) => [x.ref, x.id, x.name]),
    })
    expect(identity(after)).toEqual(identity(before))
  })

  it('does not touch the proposal it was given', () => {
    const before = noisy()
    const copy = structuredClone(before)
    repairProposal(snapshot(), before)

    expect(before).toEqual(copy)
  })

  it('leaves a clean proposal exactly as it was', () => {
    const clean = proposal({
      exercises: [ex({ mediaUrl: JPG })],
      days: [day({ exerciseRefs: ['10001'] })],
    })
    const { proposal: after, repairs } = repairProposal(snapshot(), clean)

    expect(after).toEqual(clean)
    expect(repairs).toEqual([])
  })

  it('leaves a repeated ref for the validation to refuse', () => {
    const twice = proposal({ exercises: [ex(), ex({ name: 'Outro' })] })
    const { proposal: after, repairs } = repairProposal(snapshot(), twice)

    expect(after.exercises.map((e) => e.ref)).toEqual(['10001', '10001'])
    expect(repairs).toEqual([])
  })

  it('leaves an id that is gone from the catalog for the validation to refuse', () => {
    const stale = proposal({ exercises: [ex({ ref: '10099', id: 10099, name: 'Sumiu' })] })
    const { proposal: after } = repairProposal(snapshot(), stale)

    expect(after.exercises[0].id).toBe(10099)
  })
})

/**
 * The official catalog reaches the model as context, never as payload: it ships
 * with the app, so there is no row to rename, re-categorise or delete. The
 * repair is what stops the card from *claiming* a change the apply will not
 * make.
 */
describe('the official catalog is context, not payload', () => {
  const OFFICIAL = officialExercises()[0]
  const OFFICIAL_CAT = officialCategories()[0]

  const withOfficial = (over: Partial<CatalogSnapshot> = {}): CatalogSnapshot => ({
    categories: [
      { id: OFFICIAL_CAT.id!, name: OFFICIAL_CAT.name, readOnly: true },
      { id: 10001, name: 'Peito' },
    ],
    exercises: [
      { id: OFFICIAL.id!, name: OFFICIAL.name, mediaUrl: null, categoryIds: [], alternativeIds: [], readOnly: true },
      { id: 10001, name: 'Supino Reto', mediaUrl: GIF, categoryIds: [10001], alternativeIds: [] },
    ],
    days: [{ id: 10001, name: 'Dia 1', exerciseIds: [10001] }],
    ...over,
  })

  it('takes an official exercise out of the proposal', () => {
    const p = proposal({
      exercises: [
        ex(),
        ex({ ref: String(OFFICIAL.id), id: OFFICIAL.id!, name: OFFICIAL.name, categoryRefs: [] }),
      ],
    })

    const { proposal: after, repairs } = repairProposal(withOfficial(), p)

    expect(after.exercises.map((e) => e.id)).toEqual([10001])
    // Echoed back unchanged, so there is nothing to tell the user about.
    expect(repairs).toEqual([])
  })

  it('says so when the model tried to rename one', () => {
    const p = proposal({
      exercises: [
        ex({ ref: String(OFFICIAL.id), id: OFFICIAL.id!, name: 'Outro nome', categoryRefs: [] }),
      ],
      days: [],
    })

    const { proposal: after, repairs } = repairProposal(withOfficial(), p)

    expect(after.exercises).toEqual([])
    expect(repairs.map((r) => r.kind)).toEqual(['official-kept'])
    expect(repairs[0].text).toContain(OFFICIAL.name)
  })

  it('keeps an official exercise inside a proposed day, though the list never carries it', () => {
    const p = proposal({
      exercises: [ex()],
      days: [day({ exerciseRefs: ['10001', String(OFFICIAL.id)] })],
    })

    const { proposal: after, repairs } = repairProposal(withOfficial(), p)

    // The ref resolves against the catalog, so the day keeps it.
    expect(after.days[0].exerciseRefs).toEqual(['10001', String(OFFICIAL.id)])
    expect(repairs).toEqual([])
  })

  it('takes an official category out too', () => {
    const p = proposal({
      categories: [{ ref: String(OFFICIAL_CAT.id), id: OFFICIAL_CAT.id!, name: 'Renomeada' }],
      exercises: [],
      days: [],
    })

    const { proposal: after, repairs } = repairProposal(withOfficial(), p)

    expect(after.categories).toEqual([])
    expect(repairs.map((r) => r.kind)).toEqual(['official-kept'])
  })
})
