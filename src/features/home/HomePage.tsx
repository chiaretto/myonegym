import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategoryMap, useDays, useExerciseMap, useGymWeights } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { fmtWeight } from '../../lib/format'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { TabBar } from '../../ui/Chrome'
import { GymSelector } from '../gym/GymSelector'
import './home.css'

export function HomePage() {
  const days = useDays()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const weights = useGymWeights(activeGymId)
  const [openId, setOpenId] = useState<number | null>(null)

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

        <ul className="accordion">
          {days?.map((day) => {
            const isOpen = openId === day.id
            const cat = day.categoryId != null ? catMap.get(day.categoryId) : undefined
            return (
              <li key={day.id} className={`day${isOpen ? ' open' : ''}`}>
                <button
                  className="day-head"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : day.id!)}
                >
                  <span>
                    <span className="day-title">{day.name}</span>
                    <span className="day-sub">
                      {cat ? cat.name : `${day.exerciseIds.length} exercícios`}
                    </span>
                  </span>
                  <Icon name="chevron-down" className="chev day-chev" />
                </button>

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
