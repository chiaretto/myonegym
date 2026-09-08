import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useElapsed } from '../../lib/elapsed'
import { useWakeLock } from '../../lib/wakeLock'
import { MAX_REST_MS, useRestTimer, type Point } from '../../state/restTimer'
import { RestTimer } from './RestTimer'
import './session.css'

/**
 * The rest stopwatch **while it is running**, floating over whatever screen is
 * open.
 *
 * A count that survives navigation is worth nothing if it goes invisible the
 * moment you navigate: you would walk back to the exercise screen just to read
 * the number, which is the trip this stopwatch exists to save.
 *
 * Mounted once, in the app shell, and renders **nothing while stopped** — which
 * is what guarantees there is only ever one stopwatch on screen. Stopped, the
 * timer is the button in the exercise media, and that one lives on the session
 * exercise screen (see `SessionEntryPage`); stopped anywhere else, there is no
 * timer at all, because a grey circle floating over Home would be pure
 * obstruction.
 *
 * It holds the hooks even while stopped — the limit has to arrive on its own,
 * and hooks may not be called conditionally.
 */

/**
 * How far the finger may travel before it stops being a tap.
 *
 * Both directions matter. Too small and a hand that shakes while dragging
 * switches off the stopwatch it meant to move; too big and a deliberate nudge
 * reads as a tap. Eight pixels is roughly the slop a touch already has.
 */
const DRAG_THRESHOLD = 8

/** Kept clear of the app bar at the top and the action bar at the bottom. */
const EDGE = 12

export function FloatingRestTimer() {
  const startedAt = useRestTimer((s) => s.startedAt)
  const origin = useRestTimer((s) => s.origin)
  const stop = useRestTimer((s) => s.stop)
  const expire = useRestTimer((s) => s.expire)
  const running = startedAt != null
  const elapsed = useElapsed(startedAt)

  // The phone is on the bench while this counts, and a screen that sleeps takes
  // the stopwatch with it. Now held wherever the user is, because the timer is
  // now everywhere — bounded by the 99-minute limit rather than by the screen.
  useWakeLock(running)

  // The limit arrives by itself. `elapsed` re-reads the clock every second, so
  // this is checked on the tick rather than only when somebody looks — and
  // `expire` compares against the clock, so a timer left running last night is
  // already stopped by the time anything renders.
  useEffect(() => {
    if (running && elapsed >= MAX_REST_MS) expire()
  }, [running, elapsed, expire])

  /** Where the **drag** left it; `null` until one happens. */
  const [at, setAt] = useState<Point | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ dx: number; dy: number; from: Point; moved: boolean } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  /** True for the click that ends a drag, so that click does not stop the timer. */
  const moved = useRef(false)

  // Only ever CLEARS, never sets — and that matters. Setting the position from
  // an effect would paint one frame at the CSS home first and only then move it
  // where it belongs, which is visible: the stopwatch jumps to the corner and
  // snaps back. The position is derived during render instead, below.
  useEffect(() => {
    if (!running) setAt(null)
  }, [running])

  const onPointerDown = (e: ReactPointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    drag.current = {
      dx: e.clientX - box.left,
      dy: e.clientY - box.top,
      from: { x: e.clientX, y: e.clientY },
      moved: false,
    }
  }

  useEffect(() => {
    if (!running) return

    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.moved) {
        const far = Math.hypot(e.clientX - d.from.x, e.clientY - d.from.y)
        // `!(far >= t)` rather than `far < t`, so a coordinate that is not a
        // number reads as "did not move". Written the other way round, NaN
        // makes every comparison false, turns every touch into a drag, and
        // leaves the circle positioned at NaN — invisible, with the count still
        // running and nothing to tap.
        if (!(far >= DRAG_THRESHOLD)) return
        d.moved = true
        setDragging(true)
      }
      const box = ref.current?.getBoundingClientRect()
      if (!box) return
      // Clamped to the app column, not to the viewport: on a wide screen the app
      // is a phone-width strip in the middle, and a stopwatch parked in the
      // desktop margin would be floating over nothing.
      const column = document.querySelector('.app')?.getBoundingClientRect()
      const left = column?.left ?? 0
      const right = column?.right ?? window.innerWidth
      setAt({
        x: clamp(e.clientX - d.dx, left + EDGE, right - box.width - EDGE),
        y: clamp(e.clientY - d.dy, EDGE, window.innerHeight - box.height - EDGE),
      })
    }

    const up = () => {
      // A drag that moved must not also count as a tap — that is the whole
      // reason the threshold exists. The click still fires, so it is swallowed
      // by `onToggle` reading this flag.
      setDragging(false)
      if (drag.current?.moved) {
        moved.current = true
        // Cleared after the click that closes this gesture has gone by.
        setTimeout(() => (moved.current = false), 0)
      }
      drag.current = null
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [running])

  if (!running) return null

  /**
   * Where it sits, decided **during render** so the first frame is already
   * right: where the drag left it, else where the button was when it was
   * tapped, else home — the top right of the app column, written in CSS. Home
   * is what a count restored after a reload gets, its origin having died with
   * the page that measured it.
   */
  const pos = at ?? origin

  return (
    <div
      ref={ref}
      className={`rest-float${dragging ? ' dragging' : ''}`}
      // Home is written in CSS, against the app column rather than the viewport
      // — on a wide screen the app is a phone-width strip in the middle. A drag
      // replaces it with plain coordinates.
      style={pos ? { left: pos.x, top: pos.y, right: 'auto', transform: 'none' } : undefined}
    >
      <RestTimer
        elapsed={elapsed}
        running
        onToggle={() => {
          if (moved.current) return
          stop()
        }}
        onPointerDown={onPointerDown}
      />
    </div>
  )
}

function clamp(v: number, lo: number, hi: number): number {
  // `hi` can fall below `lo` on a very small viewport; the low edge wins, which
  // keeps the circle on screen rather than off the top.
  return Math.max(lo, Math.min(v, Math.max(lo, hi)))
}
