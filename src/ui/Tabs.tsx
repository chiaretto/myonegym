/**
 * Segmented tabs control (styled like `.unit-seg`). Controlled: the parent owns
 * the active id and renders the matching panel below it.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label = 'Seções',
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  label?: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          className={t.id === active ? 'on' : ''}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
