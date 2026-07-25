import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { startSession, ValidationError } from '../../db/repos'
import {
  useActiveSession,
  useCategoryMap,
  useDays,
  useExerciseMap,
  useGymWeights,
  useSessionSummaries,
} from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import {
  dayCategoryNames,
  daySubtitle,
  exerciseCategoryNames,
  nextWorkoutDayId,
} from '../../lib/days'
import { muscleAvatarClass } from '../../lib/muscleAvatar'
import logoMark from '../../assets/logo-mark.png'
import { fmtWeight } from '../../lib/format'
import {
  buildWeekTrack,
  currentStreak,
  WEEKDAY_LABELS,
  WEEKLY_GOAL,
  type WeekDayCell,
} from '../../lib/week'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { TabBar } from '../../ui/Chrome'
import { GymSelector } from '../gym/GymSelector'
import './home.css'

/**
 * Weekly training summary — the count, plus a seven-day track.
 *
 * CHANGED: this replaced a progress ring. The ring answered "how much" and never
 * "when": it could show 43% without revealing that Wednesday was skipped or that
 * the user had not trained for three days. The count stays the headline and the
 * track explains it.
 *
 * Everything is derived from `completedAt` on completed sessions — no new
 * persisted state, no migration.
 */
function WeeklySummary({ cells, streak }: { cells: WeekDayCell[]; streak: number }) {
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
            <span className="wd-dot">
              {cell.state === 'done' && <Icon name="check" />}
            </span>
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

export function HomePage() {
  const days = useDays()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const weights = useGymWeights(activeGymId)
  const activeSession = useActiveSession(activeGymId)
  const summaries = useSessionSummaries(activeGymId)
  const nav = useNavigate()
  const toast = useToast()

  // The expanded day lives in the URL, not in component state: React unmounts
  // Home when an exercise detail opens, which would reset local state and lose
  // the user's place on the way back. `replace` so expanding/collapsing doesn't
  // pile up history entries (Back must leave Home, not walk the accordion).
  const [params, setParams] = useSearchParams()
  const dayParam = Number(params.get('day'))
  const openId = Number.isInteger(dayParam) && dayParam > 0 ? dayParam : null
  const toggleDay = (id: number) => {
    const next = new URLSearchParams(params)
    if (openId === id) next.delete('day')
    else next.set('day', String(id))
    setParams(next, { replace: true })
  }

  // CHANGED: the summary used to be a single count against `days.length`. It is
  // now a seven-day track against a fixed goal of 7 — see lib/week.ts.
  const now = Date.now()
  const weekCells = buildWeekTrack(
    summaries.map((s) => s.session.completedAt ?? 0).filter((ts) => ts > 0),
    now,
  )
  const streak = currentStreak(weekCells, now)

  // "Próximo treino": the day after the most recent completed session (summaries
  // are newest-first, per active gym), wrapping to the first day.
  const nextDayId = nextWorkoutDayId(days ?? [], summaries[0]?.session.dayId ?? null)

  const onStart = async (dayId: number) => {
    if (activeGymId == null) {
      toast('Crie ou selecione uma academia primeiro.')
      return
    }
    if (activeSession) {
      // Only one active session per gym: resume it (whichever day it belongs to).
      if (activeSession.dayId !== dayId) toast('Você já tem um treino em andamento.')
      nav(`/session/${activeSession.id}`)
      return
    }
    try {
      const sid = await startSession(activeGymId, dayId, db)
      nav(`/session/${sid}`)
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Não foi possível iniciar o treino.')
    }
  }

  return (
    <>
      <header className="appbar">
        <h1>
          {/* CHANGED: the brand mark is the logo PNG, not a gradient tile with an
              icon-font barbell in it.

              The wordmark stays ONE text node on purpose. The mockup splits it as
              My<em>One</em>Gym to paint "One" in red, but Testing Library's
              getNodeText joins only *direct* child text nodes, so that markup
              reads as "MyGym" and breaks findByText('MyOneGym') in App.test.tsx.
              The red already reads from the mark right beside it, so the split
              buys a brand flourish at the cost of a real assertion. */}
          <img className="brand-mark" src={logoMark} alt="" />
          <span className="wordmark">MyOneGym</span>
        </h1>
        <span className="spacer" />
        <GymSelector />
      </header>

      <main className="screen">
        {days && days.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhum dia de treino ainda</h2>
            <p>Crie academias, exercícios e dias de treino em Configurações para começar.</p>
            <Link to="/settings" className="btn primary" style={{ width: 'auto' }}>
              Ir para Configurações
            </Link>
          </div>
        )}

        {days && days.length > 0 && <WeeklySummary cells={weekCells} streak={streak} />}

        <ul className="accordion">
          {days?.map((day) => {
            const isOpen = openId === day.id
            const isResume = activeSession != null && activeSession.dayId === day.id
            // Feature the next workout day (from history) when nothing is being resumed.
            const isFeatured = day.id === nextDayId && activeSession == null
            return (
              <li
                key={day.id}
                className={`day${isOpen ? ' open' : ''}${isFeatured ? ' featured' : ''}`}
              >
                {isFeatured && !isOpen && <span className="eyebrow day-eyebrow">Próximo treino</span>}
                {/* CHANGED: two lines. The name gets the first one to itself —
                    it used to compete with the Iniciar pill for width — and the
                    avatar, categories and controls share the second.
                    .day-title stays INSIDE .day-head-main: day-url tests click
                    the day name to toggle the accordion. */}
                <div className="day-head">
                  <button
                    className="day-head-main"
                    aria-expanded={isOpen}
                    onClick={() => toggleDay(day.id!)}
                  >
                    <span className="day-title">{day.name}</span>
                  </button>
                  <div className="day-meta">
                    <span className="day-ic">
                      <i
                        className={`png-ic ${muscleAvatarClass(dayCategoryNames(day, exMap, catMap))}`}
                        aria-hidden
                      />
                    </span>
                    <span className="day-sub">{daySubtitle(day, exMap, catMap)}</span>
                    <span className="day-actions">
                      <button
                        className={`day-start${isResume ? ' resume' : ''}${isFeatured ? ' featured' : ''}`}
                        onClick={() => onStart(day.id!)}
                      >
                        <i className="png-ic pi-play" aria-hidden /> {isResume ? 'Continuar' : 'Iniciar'}
                      </button>
                      <button
                        className="chev-btn"
                        aria-label={isOpen ? 'Recolher' : 'Expandir'}
                        onClick={() => toggleDay(day.id!)}
                      >
                        <i className="png-ic pi-chevron-down chev day-chev" aria-hidden />
                      </button>
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <ul className="exercises">
                    {day.exerciseIds.length === 0 && (
                      <li className="ex-empty">Nenhum exercício neste dia.</li>
                    )}
                    {day.exerciseIds.map((exId, i) => {
                      const ex = exMap.get(exId)
                      if (!ex) return null
                      const w = weights.get(exId)
                      const exCats = exerciseCategoryNames(ex, catMap)
                      return (
                        <li key={`${exId}-${i}`}>
                          <Link className="exercise" to={`/exercise/${exId}?day=${day.id}`}>
                            <Media className="thumb" url={ex.mediaUrl} alt={ex.name} />
                            <span className="ex-body">
                              <span className="ex-name">{ex.name}</span>
                              {exCats.length > 0 && <span className="ex-cat">{exCats.join(' · ')}</span>}
                            </span>
                            {w ? (
                              <span className="weight-badge">{fmtWeight(w.value, w.unit)}</span>
                            ) : (
                              <span className="weight-badge empty">definir</span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </main>

      <TabBar active="home" />
    </>
  )
}
