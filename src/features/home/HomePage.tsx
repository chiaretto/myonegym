import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { daySubtitle } from '../../lib/days'
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
  const [openId, setOpenId] = useState<number | null>(null)

  const weekStart = startOfWeek(Date.now())
  const doneThisWeek = summaries.filter((s) => (s.session.completedAt ?? 0) >= weekStart).length

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
          {days?.map((day, idx) => {
            const isOpen = openId === day.id
            const isResume = activeSession != null && activeSession.dayId === day.id
            // Feature the first day (next workout) when nothing is being resumed.
            const isFeatured = idx === 0 && activeSession == null
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
                    onClick={() => setOpenId(isOpen ? null : day.id!)}
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
                    onClick={() => setOpenId(isOpen ? null : day.id!)}
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
                          <Link className="exercise" to={`/exercise/${exId}`}>
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
