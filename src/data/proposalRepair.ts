import { validateMediaUrl } from '../db/repos'
import type { CatalogProposal, CatalogSnapshot } from './catalogContract'

/**
 * Repair the noise in a proposal before anyone is asked to decide on it.
 *
 * A proposal is generated text, and text arrives with defects that carry no
 * intention: an image URL serialized as the four characters `"null"`, an
 * exercise still pointing at a category the same proposal dropped. Handed
 * straight to `validateProposal` these refuse the whole thing — a catalog of
 * sixty exercises thrown away over a stray string — so they are repaired here,
 * on the way in.
 *
 * **The repair drops links, never entities.** Nothing in this module removes,
 * creates or renames a category, an exercise or a day, and nothing touches an
 * id, a name or the order of anything. What the card promises to remove is
 * exactly what the raw proposal promised to remove; only cross-references and
 * `mediaUrl` are rewritten. That boundary is what makes repairing safe at all:
 * the destructive half of a proposal is never inferred, only echoed.
 *
 * Everything else stays a refusal, and is left to `validateProposal`: a
 * repeated `ref`, a repeated id, an empty name, an id that is not in the
 * catalog any more. Those are contradictions, not noise — there is no
 * repair that does not amount to guessing what was meant.
 *
 * Every reported repair is phrased in the present, as what becomes of the
 * catalog if the proposal is accepted — the card is read before deciding, not
 * after, and "mantive a imagem" would describe a decision already taken.
 *
 * Only repairs that **change the outcome** are reported. Trimming whitespace or
 * dropping an alternative that points at its own exercise changes nothing the
 * user could observe (the apply already ignores both), and a card line about it
 * would be noise competing with the lines that matter.
 */

export type RepairKind =
  | 'media-cleared'
  | 'media-kept'
  | 'category-unlinked'
  | 'alternative-unlinked'
  | 'exercise-unlinked'

export interface Repair {
  kind: RepairKind
  /** What it means for the person deciding, in Portuguese. */
  text: string
}

export interface RepairedProposal {
  proposal: CatalogProposal
  repairs: Repair[]
}

/** How a model writes `null` when it writes it into a string field. */
const SENTINELS = new Set(['null', 'undefined'])

/** Long enough to recognise the value, short enough not to break the card. */
function quote(value: string): string {
  const clean = value.trim()
  return `“${clean.length > 42 ? `${clean.slice(0, 42)}…` : clean}”`
}

export function repairProposal(
  snapshot: CatalogSnapshot,
  proposal: CatalogProposal,
): RepairedProposal {
  const repairs: Repair[] = []

  const knownCategoryRefs = new Set(proposal.categories.map((c) => c.ref))
  const knownExerciseRefs = new Set(proposal.exercises.map((e) => e.ref))

  const storedExercises = new Map(snapshot.exercises.map((e) => [e.id, e]))
  // A ref for an entity that already exists **is** its id in text, so a
  // reference that resolves nowhere in the proposal can still be named for the
  // user from the catalog — "saiu da categoria Cardio" instead of a bare ref.
  const storedCategoryNames = new Map(snapshot.categories.map((c) => [String(c.id), c.name]))
  const storedExerciseNames = new Map(snapshot.exercises.map((e) => [String(e.id), e.name]))

  const nameFor = (ref: string, names: Map<string, string>) => names.get(ref) ?? quote(ref)

  const exercises = proposal.exercises.map((e) => {
    const name = e.name.trim()

    // Media first, then the links: that is the order they matter to whoever
    // reads the card, and the repairs are listed in the order they are made.
    const mediaUrl = repairMedia(e, name, storedExercises, repairs)

    const categoryRefs = e.categoryRefs.filter((ref) => {
      if (knownCategoryRefs.has(ref)) return true
      repairs.push({
        kind: 'category-unlinked',
        text: `${name}: fica sem a categoria ${nameFor(ref, storedCategoryNames)} — ela não está na proposta.`,
      })
      return false
    })

    const alternativeRefs = e.alternativeRefs.filter((ref) => {
      // A self-reference is already ignored when the links are mirrored; drop it
      // here too, but silently — nothing about the result changes.
      if (ref === e.ref) return false
      if (knownExerciseRefs.has(ref)) return true
      repairs.push({
        kind: 'alternative-unlinked',
        text: `${name}: fica sem a alternativa ${nameFor(ref, storedExerciseNames)} — ela não está na proposta.`,
      })
      return false
    })

    return { ...e, mediaUrl, categoryRefs, alternativeRefs }
  })

  const days = proposal.days.map((d) => {
    const name = d.name.trim()
    const exerciseRefs = d.exerciseRefs.filter((ref) => {
      if (knownExerciseRefs.has(ref)) return true
      repairs.push({
        kind: 'exercise-unlinked',
        text: `${name}: ${nameFor(ref, storedExerciseNames)} sai do dia — o exercício não está na proposta.`,
      })
      return false
    })
    return { ...d, exerciseRefs }
  })

  return { proposal: { ...proposal, exercises, days }, repairs }
}

/**
 * What the exercise's image should be.
 *
 * The sentinel case and the invalid case are deliberately not the same. `"null"`
 * is unmistakably the model rendering the literal `null` into a string field —
 * it means "no image", which is a thing the user can legitimately ask for, so it
 * is honoured. Anything else that is not a usable URL is garbage, and garbage
 * must not cost the user a picture they already had: the stored one stays.
 */
function repairMedia(
  e: CatalogProposal['exercises'][number],
  name: string,
  storedExercises: Map<number, CatalogSnapshot['exercises'][number]>,
  repairs: Repair[],
): string | null {
  if (e.mediaUrl === null) return null

  const raw = e.mediaUrl.trim()
  // An empty string already applies as "no image"; nothing to report.
  if (!raw) return null

  if (SENTINELS.has(raw.toLowerCase())) {
    repairs.push({
      kind: 'media-cleared',
      text: `${name}: fica sem imagem — o valor recebido (${quote(raw)}) não é uma URL.`,
    })
    return null
  }

  try {
    return validateMediaUrl(raw) ?? null
  } catch {
    const stored = e.id === null ? undefined : storedExercises.get(e.id)?.mediaUrl
    if (stored) {
      repairs.push({
        kind: 'media-kept',
        text: `${name}: mantém a imagem atual — o valor recebido (${quote(raw)}) não é uma URL de imagem.`,
      })
      return stored
    }
    repairs.push({
      kind: 'media-cleared',
      text: `${name}: fica sem imagem — o valor recebido (${quote(raw)}) não é uma URL de imagem.`,
    })
    return null
  }
}
