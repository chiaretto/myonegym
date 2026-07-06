import type { WeightHistory } from '../../db/types'

/**
 * Tiny trend line of weight values over time. `history` is newest-first; we plot
 * it oldest→newest so the line reads left→right. The most recent point is
 * emphasized. Renders nothing for fewer than two points.
 */
export function Sparkline({ history }: { history: WeightHistory[] }) {
  if (history.length < 2) return null
  const values = [...history].reverse().map((h) => h.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const W = 300
  const H = 44
  const pad = 6
  const step = (W - pad * 2) / (values.length - 1)
  const pts = values.map((v, i) => {
    const x = pad + i * step
    const y = pad + (H - pad * 2) * (1 - (v - min) / span)
    return [x, y] as const
  })
  const last = pts[pts.length - 1]

  return (
    <div className="spark" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="var(--text-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
        />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 2.5}
            fill={i === pts.length - 1 ? 'var(--fill-accent)' : 'var(--text-accent)'} />
        ))}
        <circle cx={last[0]} cy={last[1]} r={3.5} fill="var(--fill-accent)" />
      </svg>
    </div>
  )
}
