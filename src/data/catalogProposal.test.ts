import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from '../db/db'
import {
  addPhoto,
  createCategory,
  createDay,
  createExercise,
  createGym,
  getWeight,
  listDays,
  listExercises,
  saveNote,
  saveWeight,
  setAlternatives,
  startSession,
} from '../db/repos'
import {
  ALL_SECTIONS,
  catalogSnapshot,
  type CatalogProposal,
  type ProposedCategory,
  type ProposedDay,
  type ProposedExercise,
  type SectionSelection,
} from './catalogPayload'
import { reportedProposal, seedReportedCatalog } from './__fixtures__/noisyProposal'
import { officialCategories, officialExercises } from './officialCatalog'
import {
  ProposalError,
  applyCatalogProposal,
  proposalImpact,
  requiredSections,
  validateProposal,
} from './catalogProposal'

let d: MyOneGymDB
let n = 0

beforeEach(async () => {
  d = new MyOneGymDB(`test-proposal-${Date.now()}-${n++}`)
  await d.open()
})
afterEach(async () => {
  await d.delete()
})

/* --------------------------------------------------------------- builders */

const cat = (ref: string, id: number | null, name: string): ProposedCategory => ({ ref, id, name })

const ex = (
  ref: string,
  id: number | null,
  name: string,
  extra: Partial<ProposedExercise> = {},
): ProposedExercise => ({
  ref,
  id,
  name,
  mediaUrl: null,
  categoryRefs: [],
  alternativeRefs: [],
  ...extra,
})

const day = (ref: string, id: number | null, name: string, exerciseRefs: string[] = []): ProposedDay => ({
  ref,
  id,
  name,
  exerciseRefs,
})

const proposal = (parts: Partial<CatalogProposal>): CatalogProposal => ({
  summary: 'resumo',
  categories: [],
  exercises: [],
  days: [],
  ...parts,
})

const only = (...sections: (keyof SectionSelection)[]): SectionSelection => ({
  categories: sections.includes('categories'),
  exercises: sections.includes('exercises'),
  days: sections.includes('days'),
})

/**
 * A small but complete catalog: two categories, three exercises (one pair of
 * alternatives), two days. Enough to exercise every cross-reference.
 */
async function seed() {
  const peitoral = await createCategory('Peitoral', d)
  const dorsais = await createCategory('Dorsais', d)
  const supino = await createExercise({ name: 'Supino Reto', categoryIds: [peitoral] }, d)
  const maquina = await createExercise({ name: 'Supino Máquina', categoryIds: [peitoral] }, d)
  const remada = await createExercise({ name: 'Remada', categoryIds: [dorsais] }, d)
  await setAlternatives(supino, [maquina], d)
  const dia1 = await createDay({ name: 'Dia 1', exerciseIds: [supino, maquina] }, d)
  const dia2 = await createDay({ name: 'Dia 2', exerciseIds: [remada] }, d)
  return { peitoral, dorsais, supino, maquina, remada, dia1, dia2 }
}

/** The seeded catalog restated as a proposal that changes nothing. */
function unchanged(s: Awaited<ReturnType<typeof seed>>): CatalogProposal {
  return proposal({
    categories: [cat('c1', s.peitoral, 'Peitoral'), cat('c2', s.dorsais, 'Dorsais')],
    exercises: [
      ex('e1', s.supino, 'Supino Reto', { categoryRefs: ['c1'], alternativeRefs: ['e2'] }),
      ex('e2', s.maquina, 'Supino Máquina', { categoryRefs: ['c1'], alternativeRefs: ['e1'] }),
      ex('e3', s.remada, 'Remada', { categoryRefs: ['c2'] }),
    ],
    days: [day('d1', s.dia1, 'Dia 1', ['e1', 'e2']), day('d2', s.dia2, 'Dia 2', ['e3'])],
  })
}

/* ------------------------------------------------------------- what we send */

describe('catalogSnapshot', () => {
  it('carries only categories, exercises and days', async () => {
    const s = await seed()
    const gym = await createGym('Academia', d)
    await saveWeight(gym, s.supino, 60, 'KG', 'global', d)
    await saveNote(gym, s.supino, 'banco na altura 3', d)
    await addPhoto(gym, s.supino, new Blob(['jpeg'], { type: 'image/jpeg' }), 10, 10, d)
    await startSession(gym, s.dia1, d)

    const snapshot = await catalogSnapshot(d)

    expect(Object.keys(snapshot).sort()).toEqual(['categories', 'days', 'exercises'])

    // Nothing personal anywhere in the payload — asserted by the **shape**, so
    // that a field carrying a weight, a note or a gym could not ride along
    // unnoticed. Searching the serialized text for the weight's value used to
    // stand in for this, and the day an official exercise took id 60 that
    // search started matching `"id":60`.
    for (const c of snapshot.categories) {
      expect(Object.keys(c).filter((k) => !['id', 'name', 'readOnly'].includes(k))).toEqual([])
    }
    for (const e of snapshot.exercises) {
      const allowed = ['id', 'name', 'mediaUrl', 'categoryIds', 'alternativeIds', 'readOnly']
      expect(Object.keys(e).filter((k) => !allowed.includes(k))).toEqual([])
    }
    for (const day of snapshot.days) {
      expect(Object.keys(day).filter((k) => !['id', 'name', 'exerciseIds'].includes(k))).toEqual([])
    }

    // And the personal values themselves, by name, where they cannot collide.
    const json = JSON.stringify(snapshot)
    expect(json).not.toContain('banco na altura 3')
    expect(json).not.toContain('Academia')
  })

  it('reports an exercise with no media as null rather than omitting it', async () => {
    const rosca = await createExercise({ name: 'Rosca' }, d)
    const snapshot = await catalogSnapshot(d)
    expect(snapshot.exercises.find((e) => e.id === rosca)?.mediaUrl).toBeNull()
  })

  it('carries both sources, marking the official half read-only', async () => {
    const mine = await createExercise({ name: 'Supino Caseiro' }, d)
    const snapshot = await catalogSnapshot(d)

    // The official catalog is context, so the model can place an exercise in a
    // day instead of proposing a second one just like it.
    const official = snapshot.exercises.find((e) => e.id === officialExercises()[0].id)
    expect(official?.readOnly).toBe(true)
    expect(snapshot.categories.find((c) => c.id === officialCategories()[0].id)?.readOnly).toBe(true)

    // The user's own carry no marker at all.
    expect(snapshot.exercises.find((e) => e.id === mine)?.readOnly).toBeUndefined()
  })
})

/* ------------------------------------------------------------ dependencies */

describe('requiredSections', () => {
  it('does not require exercises when the days only reorder existing ones', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.days = [day('d1', s.dia1, 'Dia 1', ['e2', 'e1']), day('d2', s.dia2, 'Dia 2', ['e3'])]

    expect([...requiredSections(p, only('days'))]).toEqual([])
  })

  it('requires exercises when a day places an exercise the proposal creates', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises.push(ex('novo', null, 'Crucifixo', { categoryRefs: ['c1'] }))
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1', 'novo']), day('d2', s.dia2, 'Dia 2', ['e3'])]

    expect([...requiredSections(p, only('days'))]).toEqual(['exercises'])
  })

  it('pulls in categories transitively through a required exercises section', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.categories.push(cat('nova', null, 'Deltoides'))
    p.exercises.push(ex('novo', null, 'Desenvolvimento', { categoryRefs: ['nova'] }))
    p.days = [day('d1', s.dia1, 'Dia 1', ['novo']), day('d2', s.dia2, 'Dia 2', ['e3'])]

    const required = requiredSections(p, only('days'))
    expect([...required].sort()).toEqual(['categories', 'exercises'])
  })
})

/* ----------------------------------------------------------------- impact */

describe('proposalImpact', () => {
  it('reports nothing for a proposal that changes nothing', async () => {
    const s = await seed()
    const impact = proposalImpact(await catalogSnapshot(d), unchanged(s))

    for (const section of ['categories', 'exercises', 'days'] as const) {
      expect(impact[section]).toMatchObject({ created: 0, updated: 0, removed: 0 })
    }
  })

  it('names what disappears', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises = p.exercises.filter((e) => e.ref !== 'e2')
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3'])]

    const impact = proposalImpact(await catalogSnapshot(d), p)
    expect(impact.exercises.removed).toBe(1)
    expect(impact.exercises.removedNames).toEqual(['Supino Máquina'])
  })

  it('counts a moved exercise as a day update, not an exercise update', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3', 'e2'])]

    const impact = proposalImpact(await catalogSnapshot(d), p)
    expect(impact.exercises.updated).toBe(0)
    expect(impact.days.updated).toBe(2)
  })

  it('does not report a phantom update for a one-sided alternative', async () => {
    const s = await seed()
    const p = unchanged(s)
    // Same relation as stored, declared from one side only.
    p.exercises[1].alternativeRefs = []

    expect(proposalImpact(await catalogSnapshot(d), p).exercises.updated).toBe(0)
  })
})

/* ------------------------------------------------------------- validation */

describe('validateProposal', () => {
  it('rejects a reference to an unknown ref', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.days[0].exerciseRefs = ['e1', 'fantasma']

    const snapshot = await catalogSnapshot(d)
    expect(() => validateProposal(snapshot, p, ALL_SECTIONS)).toThrow(ProposalError)
  })

  it('rejects an id that is not in the catalog', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises[0].id = 9999

    const snapshot = await catalogSnapshot(d)
    expect(() => validateProposal(snapshot, p, ALL_SECTIONS)).toThrow(/9999/)
  })

  it('rejects a media URL the exercise form would reject', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises[0].mediaUrl = 'não-é-url'

    const snapshot = await catalogSnapshot(d)
    expect(() => validateProposal(snapshot, p, ALL_SECTIONS)).toThrow()
  })

  it('rejects two categories with the same name', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.categories[1].name = 'peitoral'

    const snapshot = await catalogSnapshot(d)
    expect(() => validateProposal(snapshot, p, ALL_SECTIONS)).toThrow(/duas categorias/i)
  })

  it('ignores problems in a section that is not being applied', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.days[0].name = '' // invalid, but days are not selected
    const snapshot = await catalogSnapshot(d)

    expect(() => validateProposal(snapshot, p, only('categories'))).not.toThrow()
    expect(() => validateProposal(snapshot, p, only('days'))).toThrow(ProposalError)
  })

  it('refuses a selection that drops a section another one depends on', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises.push(ex('novo', null, 'Crucifixo', { categoryRefs: ['c1'] }))
    p.days[0].exerciseRefs = ['e1', 'novo']

    await expect(async () =>
      validateProposal(await catalogSnapshot(d), p, only('days')),
    ).rejects.toThrow(/depende/i)
  })
})

/* ------------------------------------------------------------------ apply */

describe('applyCatalogProposal', () => {
  it('keeps weight, note and photo when an exercise moves between days', async () => {
    const s = await seed()
    const gym = await createGym('Academia', d)
    await saveWeight(gym, s.maquina, 45, 'KG', 'global', d)
    await saveNote(gym, s.maquina, 'pino 7', d)
    await addPhoto(gym, s.maquina, new Blob(['jpeg'], { type: 'image/jpeg' }), 8, 8, d)

    const p = unchanged(s)
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3', 'e2'])]
    await applyCatalogProposal(p, ALL_SECTIONS, d)

    expect((await getWeight(gym, s.maquina, d))?.value).toBe(45)
    expect((await d.exerciseNotes.where({ gymId: gym, exerciseId: s.maquina }).first())?.text).toBe('pino 7')
    expect(await d.exercisePhotos.where({ gymId: gym, exerciseId: s.maquina }).count()).toBe(1)

    const days = await listDays(d)
    expect(days.map((x) => x.exerciseIds)).toEqual([[s.supino], [s.remada, s.maquina]])
  })

  it('creates new entities and reports the ids they received', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.categories.push(cat('nova', null, 'Deltoides'))
    p.exercises.push(ex('novo', null, 'Desenvolvimento', { categoryRefs: ['nova'] }))
    p.days.push(day('novo-dia', null, 'Dia 3', ['novo']))

    const outcome = await applyCatalogProposal(p, ALL_SECTIONS, d)

    const created = outcome.catalog.exercises.find((e) => e.name === 'Desenvolvimento')!
    expect(created.id).toBeGreaterThan(0)
    const ombros = outcome.catalog.categories.find((c) => c.name === 'Deltoides')!
    expect(created.categoryIds).toEqual([ombros.id])
    expect(outcome.catalog.days.at(-1)).toMatchObject({ name: 'Dia 3', exerciseIds: [created.id] })
    expect(outcome.skipped).toEqual([])
  })

  it('cascades an exercise removal into days and alternatives', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises = p.exercises.filter((e) => e.ref !== 'e2')
    p.exercises[0].alternativeRefs = []
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3'])]

    await applyCatalogProposal(p, ALL_SECTIONS, d)

    const exercises = await listExercises(d)
    expect(exercises.map((e) => e.name)).not.toContain('Supino Máquina')
    expect(exercises.find((e) => e.id === s.supino)!.alternativeIds).toEqual([])
    expect((await listDays(d)).every((x) => !x.exerciseIds.includes(s.maquina))).toBe(true)
  })

  it('mirrors a one-sided alternative instead of dropping it', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises[0].alternativeRefs = ['e3'] // Supino Reto <-> Remada, declared once
    p.exercises[1].alternativeRefs = []
    p.exercises[2].alternativeRefs = []

    await applyCatalogProposal(p, ALL_SECTIONS, d)

    const exercises = await listExercises(d)
    expect(exercises.find((e) => e.id === s.supino)!.alternativeIds).toEqual([s.remada])
    expect(exercises.find((e) => e.id === s.remada)!.alternativeIds).toEqual([s.supino])
  })

  it('writes nothing when the proposal fails validation', async () => {
    const s = await seed()
    const before = await catalogSnapshot(d)
    const p = unchanged(s)
    p.categories[0].name = 'Peitoral'
    p.exercises[0].id = 9999 // fails after the categories would have been renamed

    await expect(applyCatalogProposal(p, ALL_SECTIONS, d)).rejects.toThrow(ProposalError)
    expect(await catalogSnapshot(d)).toEqual(before)
  })

  it('rolls back an already-written change when a later write fails', async () => {
    const s = await seed()
    const before = await catalogSnapshot(d)
    const p = unchanged(s)
    // Swapping two category names is legal as a *proposal* — the names are
    // distinct on both sides — but not as a sequence of renames: the first one
    // collides with the name the second has not released yet. The create ahead
    // of it succeeds, so this only passes if the failure takes it back out.
    p.categories = [
      cat('nova', null, 'Deltoides'),
      cat('c1', s.peitoral, 'Dorsais'),
      cat('c2', s.dorsais, 'Peitoral'),
    ]

    await expect(applyCatalogProposal(p, only('categories'), d)).rejects.toThrow()
    expect(await catalogSnapshot(d)).toEqual(before)
  })
})

/* ---------------------------------------------------------- partial accept */

describe('applyCatalogProposal — partial accept', () => {
  it('applies only the selected section and leaves the rest untouched', async () => {
    const s = await seed()
    const before = await catalogSnapshot(d)
    const p = unchanged(s)
    p.categories[0].name = 'Peitoral'
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3', 'e2'])]

    const outcome = await applyCatalogProposal(p, only('categories'), d)

    expect((await d.categories.toArray()).map((c) => c.name).sort()).toEqual(['Dorsais', 'Peitoral'])
    expect((await listDays(d)).map((x) => x.exerciseIds)).toEqual(
      before.days.map((x) => x.exerciseIds),
    )
    expect(outcome.applied).toEqual(['categories'])
    expect(outcome.skipped).toEqual(['exercises', 'days'])
  })

  it('still unlinks a removed exercise from the days when days are skipped', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.exercises = p.exercises.filter((e) => e.ref !== 'e2')
    p.exercises[0].alternativeRefs = []
    // The days section still lists the exercise being removed — and is skipped.
    const outcome = await applyCatalogProposal(p, only('exercises'), d)

    const days = await listDays(d)
    expect(days.every((x) => !x.exerciseIds.includes(s.maquina))).toBe(true)
    // ...but the days are otherwise exactly as they were.
    expect(days.map((x) => x.name)).toEqual(['Dia 1', 'Dia 2'])
    expect(days[0].exerciseIds).toEqual([s.supino])
    expect(outcome.skipped).toContain('days')
  })

  it('leaves an unselected categories section completely alone', async () => {
    const s = await seed()
    const p = unchanged(s)
    p.categories = [cat('c1', s.peitoral, 'Renomeada'), cat('c2', s.dorsais, 'Outra')]
    p.days = [day('d1', s.dia1, 'Dia 1', ['e1']), day('d2', s.dia2, 'Dia 2', ['e3', 'e2'])]

    await applyCatalogProposal(p, only('days'), d)

    expect((await d.categories.toArray()).map((c) => c.name).sort()).toEqual(['Dorsais', 'Peitoral'])
  })

  it('refuses a selection with no section at all', async () => {
    const s = await seed()
    await expect(applyCatalogProposal(unchanged(s), only(), d)).rejects.toThrow(ProposalError)
  })
})

/* ------------------------------------------------------- the reported bug */

describe('the proposal from the bug report', () => {
  it('reports the cause instead of leaking a foreign error type', async () => {
    const seeded = await seedReportedCatalog(d)

    // `mediaUrl: "null"` — the text, not the literal — reaches validateMediaUrl,
    // which throws ValidationError. Anything that escapes the apply has to be a
    // ProposalError, or the conversation has nothing to show the user.
    const err = await applyCatalogProposal(reportedProposal(seeded), ALL_SECTIONS, d).catch((e) => e)
    expect(err).toBeInstanceOf(ProposalError)
    expect((err as ProposalError).message).toMatch(/HIIT/)
    expect((err as ProposalError).message).toMatch(/URL/i)
  })

  it('wraps a failure that is not about the proposal, cause included', async () => {
    const seeded = await seedReportedCatalog(d)
    const p = reportedProposal(seeded)
    p.exercises.find((e) => e.name.startsWith('HIIT'))!.mediaUrl = null
    d.close() // whatever the apply hits now is Dexie's, not the proposal's

    const err = await applyCatalogProposal(p, ALL_SECTIONS, d).catch((e) => e)
    expect(err).toBeInstanceOf(ProposalError)
    expect((err as ProposalError).message).not.toBe('Não consegui aplicar a proposta.')
    expect((err as ProposalError).message.length).toBeGreaterThan(30)
  })

  it('changes nothing when it is refused', async () => {
    const seeded = await seedReportedCatalog(d)
    await applyCatalogProposal(reportedProposal(seeded), ALL_SECTIONS, d).catch(() => undefined)

    expect(await d.exercises.count()).toBe(27)
    expect(await d.categories.count()).toBe(8)
    expect(await d.days.count()).toBe(6)
  })
})

/**
 * The official catalog is context for the assistant, never payload: a proposal
 * may **use** it — place an exercise in a day, classify with an official
 * category, take one as an alternative — but never writes it, because there is
 * no row to write.
 */
describe('applyCatalogProposal — the official catalog', () => {
  it('applies a day that places an official exercise', async () => {
    const official = officialExercises()[0].id!
    const mine = await createExercise({ name: 'Supino Caseiro' }, d)

    const p = proposal({
      exercises: [ex('e1', mine, 'Supino Caseiro')],
      days: [day('d1', null, 'Dia 1', ['e1', String(official)])],
    })
    await applyCatalogProposal(p, only('exercises', 'days'), d)

    const days = await listDays(d)
    expect(days[0].exerciseIds).toEqual([mine, official])
    // Nothing official was written into the database.
    expect(await d.exercises.count()).toBe(1)
  })

  it('gives a user exercise an official alternative, without writing the official one', async () => {
    const official = officialExercises()[0].id!
    const mine = await createExercise({ name: 'Supino Caseiro' }, d)

    const p = proposal({
      exercises: [ex('e1', mine, 'Supino Caseiro', { alternativeRefs: [String(official)] })],
    })
    await applyCatalogProposal(p, only('exercises'), d)

    expect((await d.exercises.get(mine))?.alternativeIds).toEqual([official])
    expect(await d.exercises.count()).toBe(1)
  })

  it('never deletes an official entity just because the proposal omits it', async () => {
    const mine = await createExercise({ name: 'Supino Caseiro' }, d)
    const mineCat = await createCategory('Antebraço', d)

    // A full-catalog proposal that lists only the user's own — which is exactly
    // what the assistant is told to send.
    const p = proposal({
      categories: [cat('c1', mineCat, 'Antebraço')],
      exercises: [ex('e1', mine, 'Supino Caseiro')],
    })
    await applyCatalogProposal(p, only('categories', 'exercises'), d)

    const names = (await listExercises(d)).map((e) => e.name)
    expect(names).toContain(officialExercises()[0].name)
    expect(names).toContain('Supino Caseiro')
  })

  it('does not count the official catalog as removed on the card', async () => {
    const mine = await createExercise({ name: 'Supino Caseiro' }, d)
    const p = proposal({ exercises: [ex('e1', mine, 'Supino Caseiro')] })

    const impact = proposalImpact(await catalogSnapshot(d), p)
    expect(impact.exercises.removed).toBe(0)
    expect(impact.categories.removed).toBe(0)
  })
})
