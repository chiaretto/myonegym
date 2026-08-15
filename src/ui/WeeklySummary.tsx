import { WEEKDAY_LABELS, WEEKLY_GOAL, type WeekDayCell } from '../lib/week'
import { Icon } from './Icon'
import './weekly-summary.css'

/**
 * "Esta semana: N / 7 treinos", with a seven-cell track under it.
 *
 * CHANGED: this replaced a progress ring. The ring answered "how much" and never
 * "when": it could show 43% without revealing that Wednesday was skipped or that
 * the user had not trained for three days. The count stays the headline and the
 * track explains it.
 *
 * Everything is derived from `completedAt` on completed sessions — no new
 * persisted state, no migration.
 *
 * Shared by the **Treinos** and **Cardio** tabs, and it counts the same thing on
 * both: the week is the week, whichever tab you are looking at it from. A cardio
 * counts as a workout everywhere else (the Consistência aggregates, the streak),
 * so a per-tab number here would be the one place disagreeing with the rest.
 */
export function WeeklySummary({ cells, streak }: { cells: WeekDayCell[]; streak: number }) {
  const done = cells.filter((c) => c.state === 'done').length
  return (
    <section className="week-card" aria-label="Resumo da semana">
      <div className="week-head">
        <div className="week-body">
          <span className="eyebrow">Esta semana</span>
          <strong className="week-count">
            {done} <span className="week-of">/ {WEEKLY_GOAL} treinos</span>
          </strong>
        </div>
        {streak > 1 && (
          <span className="week-streak" title="Dias seguidos treinando">
            <Icon name="flame" />
            {streak}
          </span>
        )}
      </div>
      <ol className="week-track" aria-label="Dias da semana">
        {cells.map((cell) => (
          <li
            key={cell.index}
            className={`wd ${cell.state}${cell.sessions > 1 ? ' multi' : ''}`}
            aria-label={weekCellLabel(cell)}
          >
            <span className="wd-dot">{cell.state === 'done' && <Icon name="check" />}</span>
            <span className="wd-lab">{WEEKDAY_LABELS[cell.index]}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Spoken description of one cell — the visual states are colour-only otherwise. */
function weekCellLabel(cell: WeekDayCell): string {
  const day = WEEKDAY_LABELS[cell.index]
  if (cell.sessions > 1) return `${day}: ${cell.sessions} treinos`
  if (cell.state === 'done') return `${day}: treino concluído`
  if (cell.state === 'today') return `${day}: hoje, sem treino ainda`
  if (cell.state === 'future') return `${day}: ainda não chegou`
  return `${day}: sem treino`
}
