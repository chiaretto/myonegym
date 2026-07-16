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
import { daySubtitle, nextWorkoutDayId } from '../../lib/days'
import { fmtWeight } from '../../lib/format'
import { startOfWeek } from '../../lib/week'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { TabBar } from '../../ui/Chrome'
import { GymSelector } from '../gym/GymSelector'
import './home.css'

/** Weekly progress ring — completed sessions this week over the number of days. */
function WeeklySummary({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <section className="week-card" aria-label="Resumo da semana">
      <div className="week-ring">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r={R} className="ring-track" />
          <circle
            cx="32"
            cy="32"
            r={R}
            className="ring-fill"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="week-pct">{Math.round(pct * 100)}%</span>
      </div>
      <div className="week-body">
        <span className="eyebrow">Esta semana</span>
        <strong className="week-count">
          {done} <span className="week-of">/ {total} treinos</span>
        </strong>
      </div>
    </section>
  )
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

  const weekStart = startOfWeek(Date.now())
  const doneThisWeek = summaries.filter((s) => (s.session.completedAt ?? 0) >= weekStart).length

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
          <span className="brand-mark">
            <Icon name="barbell" />
          </span>
          MyOneGym
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

        {days && days.length > 0 && (
          <WeeklySummary done={doneThisWeek} total={days.length} />
        )}

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
                <div className="day-head">
                  <button
                    className="day-head-main"
                    aria-expanded={isOpen}
                    onClick={() => toggleDay(day.id!)}
                  >
                    <span className="day-title">{day.name}</span>
                    <span className="day-sub">{daySubtitle(day, exMap, catMap)}</span>
                  </button>
                  <button
                    className={`day-start${isResume ? ' resume' : ''}${isFeatured ? ' featured' : ''}`}
                    onClick={() => onStart(day.id!)}
                  >
                    <Icon name="player-play" size={12} /> {isResume ? 'Continuar' : 'Iniciar'}
                  </button>
                  <button
                    className="chev-btn"
                    aria-label={isOpen ? 'Recolher' : 'Expandir'}
                    onClick={() => toggleDay(day.id!)}
                  >
                    <Icon name="chevron-down" className="chev day-chev" />
                  </button>
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
                      const exCat = ex.categoryId != null ? catMap.get(ex.categoryId) : undefined
                      return (
                        <li key={`${exId}-${i}`}>
                          <Link className="exercise" to={`/exercise/${exId}?day=${day.id}`}>
                            <Media className="thumb" url={ex.mediaUrl} alt={ex.name} />
                            <span className="ex-body">
                              <span className="ex-name">{ex.name}</span>
                              {exCat && <span className="ex-cat">{exCat.name}</span>}
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
