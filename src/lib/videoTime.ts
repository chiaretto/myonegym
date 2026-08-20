/**
 * Clock text ⇄ seconds, for the video time range.
 *
 * The record stores **seconds** (see `ExerciseVideo`) because that is what the
 * player takes. People do not think in seconds past 60, so the form and the
 * listing speak "2:10" — this is the one place that converts, so the two can
 * never disagree about what "2:10" means.
 */

/** "2:10" / "1:05:30" / "90" → seconds. `null` for anything unreadable. */
export function parseClock(text: string): number | null {
  const clean = text.trim()
  if (!clean) return null
  const parts = clean.split(':')
  if (parts.length > 3) return null

  let total = 0
  for (const part of parts) {
    // A bare "90" is 90 seconds; "1:90" is not a time anyone means, and
    // accepting it would silently turn into 2:30.
    if (!/^\d{1,2}$/.test(part.trim()) && !(parts.length === 1 && /^\d+$/.test(part.trim()))) {
      return null
    }
    const n = Number(part)
    if (!Number.isInteger(n)) return null
    if (parts.length > 1 && part !== parts[0] && n > 59) return null
    total = total * 60 + n
  }
  return total
}

/** Seconds → "2:10", or "1:05:30" past an hour. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

/**
 * The human label for a stored range, or `null` when there is none to show.
 *
 * Each end is optional and means something on its own: only a start is "from
 * here on", only an end is "up to here".
 */
export function formatRange(range: { startSec?: number; endSec?: number }): string | null {
  const { startSec, endSec } = range
  if (startSec === undefined && endSec === undefined) return null
  if (startSec !== undefined && endSec !== undefined) {
    return `${formatClock(startSec)}–${formatClock(endSec)}`
  }
  if (startSec !== undefined) return `a partir de ${formatClock(startSec)}`
  return `até ${formatClock(endSec!)}`
}
