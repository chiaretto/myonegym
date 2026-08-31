import { fmtLapse } from '../../lib/format'
import { Icon } from '../../ui/Icon'

interface RestTimerProps {
  /** Milliseconds since it was started; 0 while stopped. */
  elapsed: number
  running: boolean
  onToggle: () => void
}

/**
 * The rest-between-sets stopwatch, a circle laid over the exercise media.
 *
 * Two states and one tap between them. **Stopped** wears a clock glyph above
 * `00:00` — the glyph is the invitation, saying what the circle does before it
 * has done anything. **Running** drops the glyph and shows the time alone.
 *
 * The glyph is the ONLY visual difference. Colour and size are identical either
 * way: on a circle the size of a thumbprint a second changing signal is one more
 * thing to decode, and a changing size would make it jump under the finger that
 * just tapped it. The glyph leaves the flow rather than hiding in place, so the
 * running time sits centred instead of low.
 *
 * Owns no state: the page holds the start instant, because the timer has to
 * outlive this component being unmounted when the user opens another tab.
 */
export function RestTimer({ elapsed, running, onToggle }: RestTimerProps) {
  const time = fmtLapse(elapsed)
  return (
    <button
      // One class in both states, deliberately: the glyph below is the entire
      // visual difference, so there is nothing for a state class to paint.
      className="rest-timer"
      // The visible time is inside the name, not only on screen: a label of
      // "Cronômetro" alone would leave a screen-reader user with a stopwatch
      // they cannot read. `aria-pressed` carries running vs stopped, the same
      // way every other toggle in the app does.
      aria-label={`Cronômetro, ${time}`}
      aria-pressed={running}
      onClick={onToggle}
    >
      {!running && <Icon name="clock" className="rt-icon" />}
      <span className="rt-time">{time}</span>
    </button>
  )
}
