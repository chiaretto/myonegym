import { useState } from 'react'
import type { Exercise } from '../../db/types'
import { useWarmupMap } from '../../lib/hooks'
import { warmupsOf } from '../../lib/warmups'
import { Icon } from '../../ui/Icon'
import { WarmupViewer } from './WarmupViewer'
import './warmup.css'

/**
 * Opens the exercise's warm-ups, from either exercise detail (catalogue and
 * in-session share this).
 *
 * Renders **nothing** when the exercise has no warm-ups: having none is the
 * normal case, and a button that only opens an empty screen is noise — the same
 * call the Alternativas section makes.
 *
 * The viewer is state here rather than a route, so closing it returns to the
 * exact screen and tab it was opened from, with nothing to restore.
 */
export function WarmupButton({ exercise }: { exercise: Exercise | undefined }) {
  const warmupMap = useWarmupMap()
  const [open, setOpen] = useState(false)
  const warmups = warmupsOf(exercise, warmupMap)
  if (warmups.length === 0) return null

  return (
    <>
      <button className="btn subtle wu-open" onClick={() => setOpen(true)}>
        <Icon name="stretching" /> Aquecimento
        <span className="wu-open-count">{warmups.length}</span>
      </button>
      {open && <WarmupViewer warmups={warmups} onClose={() => setOpen(false)} />}
    </>
  )
}
