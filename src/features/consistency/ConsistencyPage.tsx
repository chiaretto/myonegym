import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addMonths,
  buildMonthGrid,
  dayStreak,
  firstSessionMonth,
  monthBefore,
  monthOf,
  monthlyTotals,
  sameMonth,
  weekStreak,
  weeklyTotals,
  type MonthRef,
} from '../../lib/consistency'
import { fmtDayMonth, fmtDuration, relativeDate } from '../../lib/format'
import { useSessionSummaries } from '../../lib/hooks'
import { WEEKDAY_LABELS } from '../../lib/week'
import { TabBar } from '../../ui/Chrome'
import { Icon } from '../../ui/Icon'
import '../session/session.css'
import './consistency.css'

/** How many of the month's sessions the list shows before "Ver mais". */
const COLLAPSED_COUNT = 3

/** Shown in place of the gym name when the gym has since been deleted. */
const REMOVED_GYM = 'Academia removida'

/** "Julho de 2026" — same convention the old history used for its buckets. */
function monthTitle(ref: MonthRef): string {
  const s = new Date(ref.year, ref.month).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "julho" — for running text ("Treinos em julho"). */
function monthLong(ref: MonthRef): string {
  return new Date(ref.year, ref.month).toLocaleDateString('pt-BR', { month: 'long' })
}

/** "jul" — compact axis label. pt-BR short months come with a dot; drop it. */
function monthShort(ref: MonthRef): string {
  return new Date(ref.year, ref.month)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
}

/** 0 sessions = dark, 1–2 = mid red, 3+ = full red. */
function weekLevel(count: number): string {
  if (count === 0) return ''
  return count <= 2 ? 'l1' : 'l2'
}

export function ConsistencyPage() {
  const summaries = useSessionSummaries()
  const nav = useNavigate()
  const now = Date.now()

  const [ref, setRef] = useState<MonthRef>(() => monthOf(now))
  const [expanded, setExpanded] = useState(false)

  // `undefined` until the history answers — the screen must not claim any
  // number (not even zero) before then. See app-foundation's empty-state spec.
  const loaded = summaries !== undefined
  const completed = (summaries ?? []).filter((s) => s.session.completedAt != null)
  const timestamps = completed.map((s) => s.session.completedAt!)
  // A subset of `timestamps`: cardio counts in every aggregate like any other
  // workout, and this is only what decides where the star goes.
  const cardioAt = completed
    .filter((s) => s.session.kind === 'cardio')
    .map((s) => s.session.completedAt!)

  const current = monthOf(now)
  const floor = firstSessionMonth(timestamps)
  const canPrev = floor != null && monthBefore(floor, ref)
  const canNext = !sameMonth(ref, current)

  function changeMonth(delta: number) {
    // One month, one state: calendar, month tile and list move together, and
    // the list falls back to its collapsed three.
    setRef((r) => addMonths(r, delta))
    setExpanded(false)
  }

  const cells = buildMonthGrid(timestamps, ref, now, cardioAt)
  const monthSessions = completed.filter((s) => sameMonth(monthOf(s.session.completedAt!), ref))
  const visible = expanded ? monthSessions : monthSessions.slice(0, COLLAPSED_COUNT)
  const hiddenCount = monthSessions.length - COLLAPSED_COUNT

  const weeks = weeklyTotals(timestamps, now)
  const months = monthlyTotals(timestamps, now)
  const maxMonth = Math.max(...months.map((m) => m.count), 1)

  return (
    <>
      <header className="appbar">
        <h1>Consistência</h1>
      </header>
      <main className="screen">
        {loaded && completed.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhum treino ainda</h2>
            <p>
              Conclua um treino a partir de um dia na tela de Treinos e sua consistência começa a
              ser desenhada aqui.
            </p>
          </div>
        )}

        {loaded && completed.length > 0 && (
          <>
            <div className="cons-stats">
              <div className="stat-tile streak">
                <strong className="stat-num">
                  <i className="png-ic pi-flame" aria-hidden />
                  {dayStreak(timestamps, now)}
                </strong>
                <span className="stat-lab">Dias em sequência</span>
              </div>
              <div className="stat-tile">
                <strong className="stat-num">
                  {weekStreak(timestamps, now)}
                  <span className="stat-unit">sem</span>
                </strong>
                <span className="stat-lab">Semanas em sequência</span>
              </div>
              <div className="stat-tile">
                <strong className="stat-num">{monthSessions.length}</strong>
                <span className="stat-lab">Treinos em {monthLong(ref)}</span>
              </div>
            </div>

            <div className="cal-card">
              <div className="cal-head">
                <button
                  className="icon-btn"
                  aria-label="Mês anterior"
                  disabled={!canPrev}
                  onClick={() => changeMonth(-1)}
                >
                  <i className="png-ic pi-chevron-left" aria-hidden />
                </button>
                <span className="cal-title">{monthTitle(ref)}</span>
                <button
                  className="icon-btn"
                  aria-label="Próximo mês"
                  disabled={!canNext}
                  onClick={() => changeMonth(1)}
                >
                  <i className="png-ic pi-chevron-right" aria-hidden />
                </button>
              </div>
              <div className="cal-grid" role="grid" aria-label={monthTitle(ref)}>
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className="cal-wd">
                    {label}
                  </span>
                ))}
                {cells.map((cell, i) => {
                  if (!cell.inMonth) {
                    return (
                      <span key={i} className="cal-cell out" aria-hidden>
                        {cell.day}
                      </span>
                    )
                  }
                  const multi = cell.sessions > 1
                  const marks = [
                    multi ? `${cell.sessions} sessões` : null,
                    cell.cardio ? 'cardio' : null,
                  ].filter(Boolean)
                  return (
                    <span
                      key={i}
                      className={`cal-cell ${cell.state}${multi ? ' multi' : ''}${cell.cardio ? ' cardio' : ''}`}
                      title={marks.length ? marks.join(' · ') : undefined}
                    >
                      {cell.day}
                    </span>
                  )
                })}
              </div>
              <div className="cal-legend">
                <span>
                  <i className="cal-cell done" /> treinou
                </span>
                <span>
                  <i className="cal-cell done multi" /> 2+ sessões
                </span>
                <span>
                  <i className="cal-cell done cardio" /> cardio
                </span>
                <span>
                  <i className="cal-cell today" /> hoje
                </span>
              </div>
            </div>

            <div className="group-label">Treinos de {monthLong(ref)}</div>
            {monthSessions.length > 0 && (
              <div className="context-strip">
                <span className="count-hint">
                  {monthSessions.length} {monthSessions.length === 1 ? 'treino' : 'treinos'} ·
                  todas as academias
                </span>
              </div>
            )}
            {monthSessions.length === 0 && (
              <p className="cal-month-empty">Nenhum treino neste mês.</p>
            )}
            <ul className="session-list">
              {visible.map(({ session, total, done, gymName }) => {
                const ts = session.completedAt!
                const full = total > 0 && done === total
                return (
                  <li key={session.id}>
                    <button className="session-card" onClick={() => nav(`/session/${session.id}`)}>
                      <div className="session-info">
                        <div className="session-name">{session.dayName}</div>
                        <div className="session-sub">
                          {relativeDate(ts)} · {fmtDayMonth(ts)}
                          {` · ${fmtDuration(ts - session.startedAt)}`}
                          {' · '}
                          <span className={gymName == null ? 'session-gym missing' : 'session-gym'}>
                            {gymName ?? REMOVED_GYM}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`done-badge${full ? ' full' : ''}`}
                        aria-label={`${done} de ${total} concluídos`}
                      >
                        {full && <Icon name="check" size={11} />}
                        {done}/{total}
                      </span>
                      {/* Icon-only "opens the recap" cue, matching the runner
                          and Home exercise rows. */}
                      <Icon name="chevron-right" className="chev row-chev" />
                    </button>
                  </li>
                )
              })}
            </ul>
            {hiddenCount > 0 && !expanded && (
              <button className="list-more" onClick={() => setExpanded(true)}>
                Ver mais {hiddenCount} {hiddenCount === 1 ? 'treino' : 'treinos'}
                <i className="png-ic pi-chevron-down" aria-hidden />
              </button>
            )}
            {hiddenCount > 0 && expanded && (
              <button className="list-more" onClick={() => setExpanded(false)}>
                Ver menos
                <i className="png-ic pi-chevron-up" aria-hidden />
              </button>
            )}

            <div className="group-label">Últimas 12 semanas</div>
            <div className="hm-card">
              <div className="hm-strip" aria-label="Treinos por semana, últimas 12 semanas">
                {weeks.map((w) => (
                  <span key={w.weekStart} className={`hm-c ${weekLevel(w.count)}`}>
                    {w.count}
                  </span>
                ))}
              </div>
              <div className="hm-months">
                {weeks.map((w, i) => {
                  const m = monthOf(w.weekStart)
                  const prev = i > 0 ? monthOf(weeks[i - 1].weekStart) : null
                  const show = prev == null || !sameMonth(m, prev)
                  return <span key={w.weekStart}>{show ? monthShort(m) : ''}</span>
                })}
              </div>
              <div className="hm-legend">
                <span>menos</span>
                <i className="hm-c" />
                <i className="hm-c l1" />
                <i className="hm-c l2" />
                <span>mais</span>
              </div>
            </div>

            <div className="group-label">Últimos 12 meses</div>
            <div className="hm-card">
              <div className="mo-chart" aria-label="Treinos por mês, últimos 12 meses">
                {months.map((m, i) => {
                  const isCurrent = i === months.length - 1
                  return (
                    <div key={`${m.ref.year}-${m.ref.month}`} className="mo-col">
                      <span className="mo-num">{m.count}</span>
                      <i
                        className={`mo-bar${isCurrent ? ' partial' : ''}`}
                        style={{ height: Math.round((m.count / maxMonth) * 100) }}
                        title={`${monthLong(m.ref)} ${m.ref.year}: ${m.count}${isCurrent ? ' (em andamento)' : ''}`}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mo-months">
                {months.map((m, i) => (
                  <span key={`${m.ref.year}-${m.ref.month}`}>
                    {i % 2 === 1 ? monthShort(m.ref) : ''}
                  </span>
                ))}
              </div>
              <div className="mo-legend">
                <i className="mo-bar" />
                <span>mês completo</span>
                <i className="mo-bar partial" />
                <span>em andamento</span>
              </div>
            </div>
          </>
        )}
      </main>

      <TabBar active="sessions" />
    </>
  )
}
