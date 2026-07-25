/**
 * Maps a training day to one of the brand muscle-group illustrations.
 *
 * There is NO muscle-group concept in the data model: `Category` is free text
 * (`{ id, name }`) and `Day` carries only `{ name, exerciseIds, order }`. So this
 * cannot read a field — it matches the day's *derived* category names against a
 * keyword table and falls back to a neutral dumbbell.
 *
 * Consequences worth knowing:
 *  - It is heuristic. A category named "Superiores" matches nothing and gets the
 *    fallback, which is a valid outcome, not a bug.
 *  - It is text-based, so it is language-bound. The keywords are pt-BR because
 *    the app is pt-BR (`<html lang="pt-BR">`).
 *  - Adding a real per-category icon field later would replace this wholesale;
 *    keeping it in one pure function is what makes that cheap.
 */

/** CSS classes from src/styles/icons.css, one per bundled illustration. */
export type MuscleAvatarClass =
  | 'pi-chest'
  | 'pi-back'
  | 'pi-legs'
  | 'pi-shoulders'
  | 'pi-core'
  | 'pi-dumbbell'

/** Ordered: the first group whose keyword appears in the day's categories wins,
 *  so a "Peito · Tríceps" day reads as chest rather than as arms. */
const GROUPS: ReadonlyArray<{ cls: MuscleAvatarClass; keywords: readonly string[] }> = [
  { cls: 'pi-chest', keywords: ['peito', 'peitoral', 'supino'] },
  { cls: 'pi-back', keywords: ['costas', 'dorsal', 'lombar', 'trapezio'] },
  {
    cls: 'pi-legs',
    keywords: ['perna', 'quadriceps', 'posterior', 'gluteo', 'panturrilha', 'coxa', 'adutor'],
  },
  { cls: 'pi-shoulders', keywords: ['ombro', 'deltoid'] },
  { cls: 'pi-core', keywords: ['core', 'abdomen', 'abdominal', 'abdome', 'obliquo'] },
]

/** Lowercase and strip diacritics so "Quadríceps" matches "quadriceps". */
// U+0300..U+036F is the Combining Diacritical Marks block that NFD splits off.
// Built via RegExp from an ASCII-only string on purpose: a literal combining mark
// in source is invisible and gets mangled by editors, diffs and copy-paste.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g')

function normalize(s: string): string {
  return s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(COMBINING_MARKS, '')
}

/**
 * Pick the avatar class for a day from its derived category names.
 * Returns `pi-dumbbell` when nothing matches — every day renders something.
 */
export function muscleAvatarClass(categoryNames: readonly string[]): MuscleAvatarClass {
  const haystack = categoryNames.map(normalize)
  for (const group of GROUPS) {
    if (haystack.some((name) => group.keywords.some((kw) => name.includes(kw)))) {
      return group.cls
    }
  }
  return 'pi-dumbbell'
}
