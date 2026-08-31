import { Link } from 'react-router-dom'
import type { Exercise } from '../../db/types'
import { alternativesOf } from '../../lib/alternatives'
import { useExerciseMap } from '../../lib/hooks'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'

/**
 * "Ver alternativas" — the other exercises that train the same thing, each
 * opening its own detail.
 *
 * Renders **nothing** when the exercise has none, which is the common case: a
 * card headed "Alternativas" with an empty state under it would be noise on
 * every other exercise in the catalog.
 *
 * `hrefFor` decides where a tap goes, because the two callers want different
 * destinations: the catalog detail navigates to the sibling's own page, while
 * the session entry stays inside the session so "Fiz este no lugar" has a
 * session to act on.
 */
export function AlternativesSection({
  exercise,
  hrefFor,
}: {
  exercise: Exercise | undefined
  hrefFor: (exerciseId: number) => string
}) {
  const exMap = useExerciseMap()
  const alts = alternativesOf(exercise, exMap)
  if (alts.length === 0) return null

  return (
    <section className="note-card alt-section">
      {/* h3 + .section-head, the shared heading shape for a titled block on this
          tab. It used to be justified by sitting under the "Histórico" section;
          that section has since moved inside the weight card, so this is now the
          only user of the pair on the tab. */}
      <div className="section-head">
        <h3>
          <Icon name="arrows-left-right" size={14} /> Alternativas
        </h3>
      </div>
      <div className="group">
        {alts.map((alt) => (
          <Link key={alt.id} className="row alt-row" to={hrefFor(alt.id!)}>
            <Media className="thumb" url={alt.mediaUrl} alt={alt.name} />
            <span className="row-body">
              <span className="row-title">{alt.name}</span>
            </span>
            <Icon name="chevron-right" className="chev row-chev" />
          </Link>
        ))}
      </div>
    </section>
  )
}
