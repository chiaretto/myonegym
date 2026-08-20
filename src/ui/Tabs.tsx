/**
 * Segmented tabs control (styled like `.unit-seg`). Controlled: the parent owns
 * the active id and renders the matching panel below it.
 *
 * A tab MAY carry a `count` — how much is behind it, so the user knows whether
 * opening it is worth a tap. The formatting lives here rather than in the
 * callers' label strings, so the catalogue detail and the in-session one cannot
 * drift on how a count looks.
 *
 * `undefined` means "not counted, or not known yet" and renders nothing: a tab
 * whose source has not answered must not claim zero, the same rule the empty
 * states follow. **Zero also renders nothing** — "Vídeos (0)" spends width to
 * say the tab is empty, which opening it says better; the app already hides the
 * warm-up button and the Alternativas section on the same argument.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label = 'Seções',
}: {
  tabs: { id: T; label: string; count?: number }[]
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
          {/* Inside the button, so the count is part of the tab's spoken name:
              "Vídeos (2)" is what a sighted user reads, and there is no reason
              for anyone else to hear less. */}
          {t.count ? <span className="tab-count"> ({t.count})</span> : null}
        </button>
      ))}
    </div>
  )
}
