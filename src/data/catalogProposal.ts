import { db, type MyOneGymDB } from '../db/db'
import {
  createCategory,
  createDay,
  createExercise,
  deleteCategory,
  deleteDay,
  deleteExercise,
  renameCategory,
  reorderDays,
  setAlternatives,
  updateDay,
  updateExercise,
  validateMediaUrl,
} from '../db/repos'
import { mirrorSymmetric } from './alternativesRepair'
import {
  SECTIONS,
  catalogSnapshot,
  type CatalogProposal,
  type CatalogSnapshot,
  type Section,
  type SectionSelection,
} from './catalogPayload'

/** Thrown when a proposal cannot be applied. User-facing message, in Portuguese. */
export class ProposalError extends Error {}

/**
 * The readable half of whatever went wrong.
 *
 * Applying reaches code that raises errors of its own — `ValidationError` from
 * the repositories, Dexie's own failures — and every one of them already says
 * something useful. "Não consegui aplicar a proposta." is what the user got
 * instead, for want of this line.
 */
function causeOf(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  return message.trim() || 'erro desconhecido'
}

/* ------------------------------------------------------------ dependencies */

/**
 * Which sections the given selection **forces on**, for this proposal.
 *
 * The rule is not "days always need exercises" — it depends on what the
 * proposal actually says. A days section that only reorders exercises which
 * already exist needs nothing; one that places an exercise the same proposal is
 * creating cannot be applied without it, because that exercise has no id until
 * its section runs.
 *
 * So the test is exactly: does a section reference a `ref` whose `id` is null?
 *
 * Walked leaf-to-root (`days` -> `exercises` -> `categories`) so a dependency
 * pulled in by one section can pull in its own in the same pass — days needing
 * new exercises, which in turn sit in new categories.
 */
export function requiredSections(
  proposal: CatalogProposal,
  selection: SectionSelection,
): Set<Section> {
  const categories = new Map(proposal.categories.map((c) => [c.ref, c]))
  const exercises = new Map(proposal.exercises.map((e) => [e.ref, e]))

  const required = new Set<Section>()
  const willApply = (s: Section) => selection[s] || required.has(s)

  if (willApply('days')) {
    const needsNew = proposal.days.some((day) =>
      day.exerciseRefs.some((ref) => exercises.get(ref)?.id === null),
    )
    if (needsNew) required.add('exercises')
  }
  if (willApply('exercises')) {
    const needsNew = proposal.exercises.some((ex) =>
      ex.categoryRefs.some((ref) => categories.get(ref)?.id === null),
    )
    if (needsNew) required.add('categories')
  }
  return required
}

/* ----------------------------------------------------------------- impact */

export interface SectionImpact {
  created: number
  updated: number
  removed: number
  /** Names of what disappears — the destructive part, spelled out. */
  removedNames: string[]
}

export type ProposalImpact = Record<Section, SectionImpact>

const byId = <T extends { id: number }>(items: T[]) => new Map(items.map((i) => [i.id, i]))

function sameOrder(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function sameSet(a: number[], b: number[]): boolean {
  const x = [...a].sort((p, q) => p - q)
  const y = [...b].sort((p, q) => p - q)
  return sameOrder(x, y)
}

/**
 * Resolve refs to the ids they already have. Returns `null` as soon as one of
 * them has no id yet — for a comparison against what is stored, "references
 * something that does not exist" is simply "different".
 */
function resolvedIds(refs: string[], known: Map<string, { id: number | null }>): number[] | null {
  const out: number[] = []
  for (const ref of refs) {
    const id = known.get(ref)?.id
    if (id == null) return null
    out.push(id)
  }
  return out
}

/** What the proposal would do, per section, against the catalog as it stands. */
export function proposalImpact(
  snapshot: CatalogSnapshot,
  proposal: CatalogProposal,
): ProposalImpact {
  const categories = new Map(proposal.categories.map((c) => [c.ref, c]))
  const exercises = new Map(proposal.exercises.map((e) => [e.ref, e]))

  const storedCategories = byId(snapshot.categories)
  const storedExercises = byId(snapshot.exercises)
  const storedDays = byId(snapshot.days)

  // Mirrored first: a one-sided declaration is a link on both sides once
  // applied, so comparing the raw lists would report phantom updates.
  const alternatives = mirrorSymmetric(
    proposal.exercises.map((e) => ({ key: e.ref, peers: e.alternativeRefs })),
  )

  const removedFrom = <T extends { id: number; name: string }>(
    stored: T[],
    proposed: { id: number | null }[],
  ) => {
    const keep = new Set(proposed.map((p) => p.id).filter((id): id is number => id !== null))
    return stored.filter((s) => !keep.has(s.id)).map((s) => s.name)
  }

  const catRemoved = removedFrom(snapshot.categories, proposal.categories)
  const exRemoved = removedFrom(snapshot.exercises, proposal.exercises)
  const dayRemoved = removedFrom(snapshot.days, proposal.days)

  const catUpdated = proposal.categories.filter((c) => {
    if (c.id === null) return false
    const before = storedCategories.get(c.id)
    return !!before && before.name !== c.name.trim()
  }).length

  const exUpdated = proposal.exercises.filter((e) => {
    if (e.id === null) return false
    const before = storedExercises.get(e.id)
    if (!before) return false
    if (before.name !== e.name.trim()) return true
    if ((before.mediaUrl ?? null) !== (e.mediaUrl?.trim() || null)) return true
    const cats = resolvedIds(e.categoryRefs, categories)
    if (cats === null || !sameSet(before.categoryIds, cats)) return true
    const alts = resolvedIds(alternatives.get(e.ref) ?? [], exercises)
    return alts === null || !sameSet(before.alternativeIds, alts)
  }).length

  const dayUpdated = proposal.days.filter((day) => {
    if (day.id === null) return false
    const before = storedDays.get(day.id)
    if (!before) return false
    if (before.name !== day.name.trim()) return true
    const ids = resolvedIds(day.exerciseRefs, exercises)
    // Order is meaningful in a day — it is the order the exercises are done in.
    return ids === null || !sameOrder(before.exerciseIds, ids)
  }).length

  return {
    categories: {
      created: proposal.categories.filter((c) => c.id === null).length,
      updated: catUpdated,
      removed: catRemoved.length,
      removedNames: catRemoved,
    },
    exercises: {
      created: proposal.exercises.filter((e) => e.id === null).length,
      updated: exUpdated,
      removed: exRemoved.length,
      removedNames: exRemoved,
    },
    days: {
      created: proposal.days.filter((day) => day.id === null).length,
      updated: dayUpdated,
      removed: dayRemoved.length,
      removedNames: dayRemoved,
    },
  }
}

/* ------------------------------------------------------------- validation */

function assertUniqueRefs(items: { ref: string }[], what: string) {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.ref) throw new ProposalError(`Proposta inválida: ${what} sem identificador.`)
    if (seen.has(item.ref)) {
      throw new ProposalError(`Proposta inválida: ${what} repetida ("${item.ref}").`)
    }
    seen.add(item.ref)
  }
}

function assertUniqueIds(items: { id: number | null }[], what: string) {
  const seen = new Set<number>()
  for (const item of items) {
    if (item.id === null) continue
    if (seen.has(item.id)) {
      throw new ProposalError(`Proposta inválida: ${what} repetido (id ${item.id}).`)
    }
    seen.add(item.id)
  }
}

/**
 * Check the proposal against the catalog **for the selection being applied** —
 * not for the proposal as a whole. Validating unselected sections would refuse
 * perfectly good partial accepts over content that is never going to be written.
 *
 * Throws `ProposalError` on the first problem: a selection is applied whole or
 * not at all, so there is nothing to gain from collecting more.
 */
export function validateProposal(
  snapshot: CatalogSnapshot,
  proposal: CatalogProposal,
  selection: SectionSelection,
): void {
  assertUniqueRefs(proposal.categories, 'categoria')
  assertUniqueRefs(proposal.exercises, 'exercício')
  assertUniqueRefs(proposal.days, 'dia')

  if (!SECTIONS.some((s) => selection[s])) {
    throw new ProposalError('Selecione ao menos uma parte da proposta para aplicar.')
  }

  // The UI locks required sections on, so reaching here means a selection that
  // was built some other way. Refuse it rather than write a day pointing at an
  // exercise that will never be created.
  for (const section of requiredSections(proposal, selection)) {
    if (!selection[section]) {
      throw new ProposalError(
        `Não dá para aplicar sem "${section === 'categories' ? 'Categorias' : 'Exercícios'}": ` +
          'outra parte selecionada depende do que ela cria.',
      )
    }
  }

  const categories = new Map(proposal.categories.map((c) => [c.ref, c]))
  const exercises = new Map(proposal.exercises.map((e) => [e.ref, e]))
  const storedCategoryIds = new Set(snapshot.categories.map((c) => c.id))
  const storedExerciseIds = new Set(snapshot.exercises.map((e) => e.id))
  const storedDayIds = new Set(snapshot.days.map((day) => day.id))

  /**
   * A ref used by a section being applied has to end up as a concrete id. It
   * does when the entity already exists (and still exists), or when its own
   * section is also being applied and will create it.
   */
  const assertUsable = (ref: string, kind: 'categoria' | 'exercício') => {
    const entity = kind === 'categoria' ? categories.get(ref) : exercises.get(ref)
    if (!entity) {
      throw new ProposalError(`Proposta inválida: referência a ${kind} desconhecida ("${ref}").`)
    }
    if (entity.id === null) return // its section is selected — checked above
    const stored = kind === 'categoria' ? storedCategoryIds : storedExerciseIds
    if (!stored.has(entity.id)) {
      throw new ProposalError(
        `Proposta inválida: ${kind} com id ${entity.id} não existe mais no catálogo.`,
      )
    }
  }

  const assertName = (name: string, what: string) => {
    if (!name.trim()) throw new ProposalError(`Proposta inválida: ${what} sem nome.`)
  }

  if (selection.categories) {
    assertUniqueIds(proposal.categories, 'categoria')
    const names = new Set<string>()
    for (const c of proposal.categories) {
      assertName(c.name, 'categoria')
      if (c.id !== null && !storedCategoryIds.has(c.id)) {
        throw new ProposalError(`Proposta inválida: categoria com id ${c.id} não existe.`)
      }
      // The categories table has a unique name index; catching a clash here
      // means a clear message instead of a mid-transaction failure.
      const key = c.name.trim().toLowerCase()
      if (names.has(key)) {
        throw new ProposalError(`Proposta inválida: duas categorias chamadas "${c.name.trim()}".`)
      }
      names.add(key)
    }
  }

  if (selection.exercises) {
    assertUniqueIds(proposal.exercises, 'exercício')
    for (const e of proposal.exercises) {
      assertName(e.name, 'exercício')
      if (e.id !== null && !storedExerciseIds.has(e.id)) {
        throw new ProposalError(`Proposta inválida: exercício com id ${e.id} não existe.`)
      }
      // Same validator the exercise form uses, so the assistant cannot land a
      // media URL the user could not have typed. Re-thrown with the exercise
      // named: the raw message says what is wrong with the URL but not which of
      // sixty exercises carries it.
      try {
        validateMediaUrl(e.mediaUrl ?? undefined)
      } catch (err) {
        throw new ProposalError(`Imagem de "${e.name.trim()}": ${causeOf(err)}`)
      }
      for (const ref of e.categoryRefs) assertUsable(ref, 'categoria')
      for (const ref of e.alternativeRefs) assertUsable(ref, 'exercício')
    }
  }

  if (selection.days) {
    assertUniqueIds(proposal.days, 'dia')
    for (const day of proposal.days) {
      assertName(day.name, 'dia')
      if (day.id !== null && !storedDayIds.has(day.id)) {
        throw new ProposalError(`Proposta inválida: dia com id ${day.id} não existe.`)
      }
      for (const ref of day.exerciseRefs) assertUsable(ref, 'exercício')
    }
  }
}

/* ------------------------------------------------------------------ apply */

export interface ApplyOutcome {
  applied: Section[]
  skipped: Section[]
  /** The catalog as it now stands, with the ids newly created entities received. */
  catalog: CatalogSnapshot
}

/**
 * Apply the selected sections of a proposal.
 *
 * **Atomic.** Everything runs in one transaction: a failure anywhere leaves the
 * database exactly as it was. "Partial" refers only to the user's section
 * selection — within that selection there is no partial write.
 *
 * An unselected section is left completely alone, with one deliberate
 * exception: the **deletion cascade** is integrity, not content. Applying an
 * exercise removal unlinks it from the existing days even when the days section
 * was skipped, because a day pointing at a deleted id is never an acceptable
 * outcome. That falls out of reusing `deleteExercise`/`deleteCategory` rather
 * than writing the tables directly — the same cascade the manual delete
 * performs, including dropping that exercise's weights, history, notes and
 * photos.
 *
 * Everything that escapes is a `ProposalError` with a cause in it. The caller
 * shows what it catches to the user, so an error type from further down —
 * a repository validation, a Dexie failure — must not reach it unexplained.
 */
export async function applyCatalogProposal(
  proposal: CatalogProposal,
  selection: SectionSelection,
  d: MyOneGymDB = db,
): Promise<ApplyOutcome> {
  try {
    return await applyInTransaction(proposal, selection, d)
  } catch (err) {
    if (err instanceof ProposalError) throw err
    throw new ProposalError(`Não consegui aplicar a proposta: ${causeOf(err)}`)
  }
}

async function applyInTransaction(
  proposal: CatalogProposal,
  selection: SectionSelection,
  d: MyOneGymDB,
): Promise<ApplyOutcome> {
  return d.transaction(
    'rw',
    // Array form: Dexie's typed overloads stop at 5 tables. The last four are
    // here for `deleteExercise`'s cascade, not because this writes them.
    [d.categories, d.exercises, d.days, d.weights, d.weightHistory, d.exerciseNotes, d.exercisePhotos],
    async () => {
      // Read inside the transaction: the check and the write must see the same
      // catalog, or a proposal validated against a stale snapshot could apply.
      const snapshot = await catalogSnapshot(d)
      validateProposal(snapshot, proposal, selection)

      const categoryId = new Map<string, number>()
      for (const c of proposal.categories) if (c.id !== null) categoryId.set(c.ref, c.id)
      const exerciseId = new Map<string, number>()
      for (const e of proposal.exercises) if (e.id !== null) exerciseId.set(e.ref, e.id)

      if (selection.categories) {
        const keep = new Set(
          proposal.categories.map((c) => c.id).filter((id): id is number => id !== null),
        )
        // Deletions first: they free names before any rename or create runs into
        // the unique name index. (A pure swap of two names would still clash —
        // it fails cleanly and rolls back rather than half-applying.)
        for (const c of snapshot.categories) if (!keep.has(c.id)) await deleteCategory(c.id, d)

        const stored = byId(snapshot.categories)
        for (const c of proposal.categories) {
          if (c.id === null) {
            categoryId.set(c.ref, await createCategory(c.name, d))
          } else if (stored.get(c.id)?.name !== c.name.trim()) {
            await renameCategory(c.id, c.name, d)
          }
        }
      }

      if (selection.exercises) {
        const keep = new Set(
          proposal.exercises.map((e) => e.id).filter((id): id is number => id !== null),
        )
        for (const e of snapshot.exercises) if (!keep.has(e.id)) await deleteExercise(e.id, d)

        for (const e of proposal.exercises) {
          const categoryIds = e.categoryRefs.map((ref) => categoryId.get(ref)!)
          const input = { name: e.name, mediaUrl: e.mediaUrl ?? undefined, categoryIds }
          if (e.id === null) exerciseId.set(e.ref, await createExercise(input, d))
          else await updateExercise(e.id, input, d)
        }

        // Alternatives last, and only once every exercise exists — a link needs
        // both ends. Mirrored BEFORE writing: `setAlternatives` treats the list
        // it is given as the whole truth for that exercise and unlinks the
        // peers left out, so feeding it a one-sided proposal in sequence would
        // delete the very link the second call was about to confirm.
        const repaired = mirrorSymmetric(
          proposal.exercises.map((e) => ({ key: e.ref, peers: e.alternativeRefs })),
        )
        for (const e of proposal.exercises) {
          const ids = (repaired.get(e.ref) ?? [])
            .map((ref) => exerciseId.get(ref)!)
            .sort((a, b) => a - b)
          await setAlternatives(exerciseId.get(e.ref)!, ids, d)
        }
      }

      if (selection.days) {
        const keep = new Set(
          proposal.days.map((day) => day.id).filter((id): id is number => id !== null),
        )
        for (const day of snapshot.days) if (!keep.has(day.id)) await deleteDay(day.id, d)

        const ordered: number[] = []
        for (const day of proposal.days) {
          const exerciseIds = day.exerciseRefs.map((ref) => exerciseId.get(ref)!)
          if (day.id === null) {
            ordered.push(await createDay({ name: day.name, exerciseIds }, d))
          } else {
            await updateDay(day.id, { name: day.name, exerciseIds }, d)
            ordered.push(day.id)
          }
        }
        // The proposal's day list is ordered; persist that as the display order
        // so the user sees the sequence the assistant described.
        await reorderDays(ordered, d)
      }

      return {
        applied: SECTIONS.filter((s) => selection[s]),
        skipped: SECTIONS.filter((s) => !selection[s]),
        catalog: await catalogSnapshot(d),
      }
    },
  )
}
