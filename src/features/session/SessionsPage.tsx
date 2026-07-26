import { useNavigate } from 'react-router-dom'
import type { SessionSummary } from '../../db/repos'
import { fmtDayMonth, fmtDuration, relativeDate } from '../../lib/format'
import { useSessionSummaries } from '../../lib/hooks'
import { TabBar } from '../../ui/Chrome'
import { Icon } from '../../ui/Icon'
import './session.css'

/** Month bucket label for a timestamp, e.g. "Julho de 2026". */
function monthLabel(ts: number): string {
  const s = new Date(ts).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function groupByMonth(summaries: SessionSummary[]): [string, SessionSummary[]][] {
  const groups = new Map<string, SessionSummary[]>()
  for (const s of summaries) {
    const ts = s.session.completedAt ?? s.session.startedAt
    const key = monthLabel(ts)
    const arr = groups.get(key)
    if (arr) arr.push(s)
    else groups.set(key, [s])
  }
  return [...groups.entries()]
}

/** Shown in place of the gym name when the gym has since been deleted —
 *  deleting a gym leaves its sessions behind, and a blank would read as a bug. */
const REMOVED_GYM = 'Academia removida'

export function SessionsPage() {
  // No gym argument, and no GymSelector in the header: the history spans every
  // gym, so nothing on this screen responds to the active one.
  const summaries = useSessionSummaries()
  const nav = useNavigate()

  // `undefined` until the history answers — not the same as "no sessions", which
  // is what the empty state and the counter below are allowed to claim.
  const groups = groupByMonth(summaries ?? [])

  return (
    <>
      <header className="appbar">
        <h1>Sessões</h1>
      </header>
      <main className="screen">
        {summaries && summaries.length > 0 && (
          <div className="context-strip">
            <span className="count-hint">
              {summaries.length} {summaries.length === 1 ? 'sessão' : 'sessões'}
            </span>
          </div>
        )}

        {summaries && summaries.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhuma sessão ainda</h2>
            <p>Inicie um treino a partir de um dia na tela de Treinos para registrar sua primeira sessão.</p>
          </div>
        )}

        {groups.map(([label, items]) => (
          <div key={label}>
            <div className="month-label">{label}</div>
            <ul className="session-list">
              {items.map(({ session, total, done, gymName }) => {
                const ts = session.completedAt ?? session.startedAt
                const full = total > 0 && done === total
                return (
                  <li key={session.id}>
                    <button className="session-card" onClick={() => nav(`/session/${session.id}`)}>
                      <div className="session-info">
                        <div className="session-name">{session.dayName}</div>
                        {/* The gym joins the existing "·"-separated context line
                            rather than getting a line of its own: it answers
                            "where", the same kind of question as "when". */}
                        <div className="session-sub">
                          {relativeDate(ts)} · {fmtDayMonth(ts)}
                          {session.completedAt != null &&
                            ` · ${fmtDuration(session.completedAt - session.startedAt)}`}
                          {' · '}
                          <span className={gymName == null ? 'session-gym missing' : 'session-gym'}>
                            {gymName ?? REMOVED_GYM}
                          </span>
                        </div>
                      </div>
                      <span className={`done-badge${full ? ' full' : ''}`} aria-label={`${done} de ${total} concluídos`}>
                        {full && <Icon name="check" size={11} />}
                        {done}/{total}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </main>

      <TabBar active="sessions" />
    </>
  )
}
