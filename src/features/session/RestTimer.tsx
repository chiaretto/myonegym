import type { PointerEvent as ReactPointerEvent } from 'react'
import { fmtLapse } from '../../lib/format'
import { Icon } from '../../ui/Icon'

interface RestTimerProps {
  /** Milliseconds since it was started; 0 while stopped. */
  elapsed: number
  running: boolean
  onToggle: () => void
  /** Set only by the floating presentation, which drives the drag. */
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void
}

/**
 * The rest-between-sets stopwatch: a circle, and one tap between its two states.
 *
 * **Stopped** is grey with black text, wearing a clock glyph above `00:00` — the
 * glyph is the invitation, saying what the circle does before it has done
 * anything, and the grey is the grey of something waiting to be asked.
 * **Running** is the app's red with white text, the glyph gone, the time alone.
 *
 * **Colour carries the state, and that is a reversal.** It used to be identical
 * in both, with the glyph as the only difference, so that a circle the size of a
 * thumbprint would not ask to be decoded twice. That reasoning held while this
 * lived in one place — the corner of one screen's media. Now a running timer
 * floats over the whole app, and the question it has to answer from across the
 * room is no longer "is this a button?" but **"is it counting?"** — which colour
 * answers faster than anything else can.
 *
 * The background stays **opaque** in both: stopped, it still sits on a
 * photograph, and a translucent circle loses the number, which is the only thing
 * it draws.
 *
 * Size does not change with state — it would jump under the finger that just
 * tapped it.
 *
 * Owns no state at all. The start instant lives in `useRestTimer`, because a
 * rest outlives this component: changing tab unmounts it, and changing screen
 * used to end the count entirely.
 */
export function RestTimer({ elapsed, running, onToggle, onPointerDown }: RestTimerProps) {
  const time = fmtLapse(elapsed)
  return (
    <button
      className={`rest-timer${running ? ' running' : ''}`}
      // The visible time is inside the name, not only on screen: a label of
      // "Cronômetro" alone would leave a screen-reader user with a stopwatch
      // they cannot read. `aria-pressed` carries running vs stopped, the same
      // way every other toggle in the app does.
      aria-label={`Cronômetro, ${time}`}
      aria-pressed={running}
      onClick={onToggle}
      onPointerDown={onPointerDown}
    >
      {!running && <Icon name="clock" className="rt-icon" />}
      <span className="rt-time">{time}</span>
    </button>
  )
}
