import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { useCategoryMap, useDays } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { BackBar } from '../../ui/Chrome'
import { Tabs } from '../../ui/Tabs'
import { PhotoTab } from './photo/PhotoTab'
import { NoteEditor } from './NoteEditor'
import { WeightEditor } from './WeightEditor'
import './exercise.css'

type DetailTab = 'detail' | 'notes' | 'photo'

export function ExerciseDetailPage() {
  const { id } = useParams()
  const exerciseId = Number(id)
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const catMap = useCategoryMap()
  const days = useDays()
  const activeGymId = useActiveGym((s) => s.activeGymId)

  const [tab, setTab] = useState<DetailTab>('detail')

  const inDays = useMemo(
    () => (days ?? []).filter((day) => day.exerciseIds.includes(exerciseId)),
    [days, exerciseId],
  )
  const cat = exercise?.categoryId != null ? catMap.get(exercise.categoryId) : undefined

  if (exercise === undefined) return <BackBar title="Exercício" to="/" />
  if (exercise === null) {
    return (
      <>
        <BackBar title="Exercício" to="/" />
        <div className="empty">
          <p>Exercício não encontrado.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <BackBar title={exercise.name} to="/" />
      <main className="screen">
        <div className="hero">
          <Media url={exercise.mediaUrl} alt={exercise.name} className="hero-media" />
        </div>

        <div className="ex-head">
          <h2 className="ex-title">{exercise.name}</h2>
          <div className="ex-chips">
            {cat && (
              <span className="chip">
                <Icon name="tag" size={12} /> {cat.name}
              </span>
            )}
            {inDays.length > 0 && (
              <span className="chip">
                <Icon name="calendar-event" size={12} />{' '}
                {inDays.length === 1 ? inDays[0].name : `${inDays.length} dias`}
              </span>
            )}
          </div>
        </div>

        <Tabs<DetailTab>
          tabs={[
            { id: 'detail', label: 'Detalhe' },
            { id: 'notes', label: 'Observações' },
            { id: 'photo', label: 'Foto' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'photo' ? (
          <PhotoTab gymId={activeGymId ?? null} exerciseId={exerciseId} />
        ) : tab === 'notes' ? (
          <NoteEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
        ) : (
          <WeightEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
        )}
      </main>
    </>
  )
}
