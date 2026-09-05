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
 * Alternativas section on the same argument.
 *
 * A tab MAY instead carry a `mark`, for content that is **there or not there**
 * rather than counted. The note is the case: there is exactly one per
 * `(gym, exercise)`, so "(1)" would be a number that is always 1 and says less
 * than an asterisk does. Same rule as the count for the unknown state — `false`
 * and a still-loading source both render nothing.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label = 'Seções',
}: {
  tabs: { id: T; label: string; count?: number; mark?: boolean }[]
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
              for anyone else to hear less. The mark follows the same rule — and
              carries a title, because an asterisk alone does not say what it
              means to someone who did not put the note there. */}
          {t.count ? <span className="tab-count"> ({t.count})</span> : null}
          {t.mark ? (
            <span className="tab-count" title="Tem anotação">
              {' '}
              (*)
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
