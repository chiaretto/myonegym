import { Icon } from '../../ui/Icon'

/**
 * The exercise's categories, as labels at the top of the "Notas" tab.
 *
 * They used to sit in the screen header, above the tabs. They read with the
 * note instead: both describe the exercise rather than the set being done, and
 * neither is acted upon between sets — while the header space they cost was
 * pushing the tabs themselves off the fold on a phone.
 *
 * Shared by both detail views (catalog and in-session) so the two stay the same
 * screen in two contexts.
 */
export function CategoryChips({ names }: { names: string[] }) {
  if (names.length === 0) return null
  return (
    <div className="ex-chips ex-chips-tab">
      {names.map((name) => (
        <span key={name} className="chip">
          <Icon name="tag" size={12} /> {name}
        </span>
      ))}
    </div>
  )
}
